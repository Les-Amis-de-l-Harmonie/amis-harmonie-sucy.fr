"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Check,
  Loader2,
  LogIn,
  Minus,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { FREE_EVENTS, getFreeEvent } from "@/lib/free-events";
import {
  CAPACITY_ALERT_RATIO,
  CHECKIN_API,
  CHECKIN_MAX_COUNT,
  CHECKIN_POLL_INTERVAL_MS,
  CHECKIN_STALE_AFTER_MS,
  CHECKIN_UNDO_WINDOW_MS,
  getCheckinState,
  matchesCheckinSearch,
  maskEmail,
  normalizeSearchText,
} from "@/lib/free-events/checkins";
import type {
  CheckinEntry,
  CheckinPayload,
  CheckinRequest,
  CheckinReservation,
  CheckinState,
  ReservationCheckinConflict,
  ReservationCheckinSuccess,
  WalkInCheckinConflict,
  WalkInCheckinSuccess,
} from "@/lib/free-events/checkins";
import { cn } from "@/lib/utils";
import { compareByName, getInitial, readApiError } from "./reservations-utils";

/* ------------------------------------------------------------------ */
/* Constantes et types                                                 */
/* ------------------------------------------------------------------ */

type Filter = "upcoming" | "partial" | "arrived" | "all";
/** Pourquoi la liste n'est plus mise à jour. */
type SyncProblem = "offline" | "server" | "expired" | null;

const LIST_TIMEOUT_MS = 8_000;
const WRITE_TIMEOUT_MS = 15_000;
const BACK_HREF = "/admin/reservations";
const LOGIN_HREF = "/admin/login";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "upcoming", label: "À venir" },
  { value: "partial", label: "Partiels" },
  { value: "arrived", label: "Arrivés" },
  { value: "all", label: "Tous" },
];

/** Un pointage en cours d'envoi ou à renvoyer. `opId` est conservé lors d'un renvoi. */
interface ReservationOp {
  opId: string;
  reservationId: number;
  from: number;
  to: number;
  name: string;
  partySize: number;
  isUndo: boolean;
}

interface WalkInOp {
  opId: string;
  delta: number;
  isUndo: boolean;
}

interface Toast {
  id: number;
  tone: "success" | "error" | "info";
  text: string;
  detail?: string;
  action?: { label: string; run: () => void };
  /** `null` : reste affiché jusqu'à fermeture. */
  durationMs: number | null;
}

interface ConflictState {
  op: ReservationOp;
  serverCheckedIn: number;
  last: CheckinEntry | null;
}

/** Un envoi qui a échoué et que le bénévole peut relancer. */
interface Failure {
  key: string;
  text: string;
  detail: string;
  retry?: () => void;
}

interface SheetState {
  id: number;
  /** Valeur affichée à l'ouverture : c'est elle qui sert de référence au serveur. */
  baseline: number;
  draft: number;
  confirming: boolean;
}

/* ------------------------------------------------------------------ */
/* Fonctions utilitaires                                               */
/* ------------------------------------------------------------------ */

function newOpId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCheckinPayload(value: unknown): value is CheckinPayload {
  if (!isRecord(value)) return false;
  return Array.isArray(value.reservations) && isRecord(value.totals) && isRecord(value.event);
}

function isReservationSuccess(value: unknown): value is ReservationCheckinSuccess {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.checkedIn === "number" &&
    Array.isArray(value.history)
  );
}

function isReservationConflict(value: unknown): value is ReservationCheckinConflict {
  return (
    isRecord(value) &&
    value.conflict === "reservation" &&
    typeof value.checkedIn === "number" &&
    Array.isArray(value.history)
  );
}

function isWalkInSuccess(value: unknown): value is WalkInCheckinSuccess {
  return isRecord(value) && value.success === true && typeof value.walkIns === "number";
}

function isWalkInConflict(value: unknown): value is WalkInCheckinConflict {
  return isRecord(value) && value.conflict === "walk-in" && typeof value.walkIns === "number";
}

function bodyError(body: unknown, fallback: string): string {
  if (isRecord(body) && typeof body.error === "string" && body.error) return body.error;
  return fallback;
}

function pluralPeople(n: number): string {
  return `${n} personne${n > 1 ? "s" : ""}`;
}

function formatDelta(n: number): string {
  return n > 0 ? `+${n}` : `−${Math.abs(n)}`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function whoLabel(by: string | null): string {
  if (!by) return "quelqu'un";
  return by.split("@")[0] || by;
}

function formatAge(seconds: number): string {
  if (seconds < 90) return `${seconds} s`;
  return `${Math.round(seconds / 60)} min`;
}

function reservationName(r: Pick<CheckinReservation, "lastName" | "firstName">): string {
  const name = [r.lastName?.toLocaleUpperCase("fr"), r.firstName].filter(Boolean).join(" ");
  return name || "Sans nom";
}

function nameKey(r: CheckinReservation): string | null {
  if (!r.lastName || !r.firstName) return null;
  return `${normalizeSearchText(r.lastName)}|${normalizeSearchText(r.firstName)}`;
}

interface ConflictOption {
  key: string;
  label: string;
  /** Valeur finale demandée au serveur (à partir de la valeur actuelle du serveur). */
  target: number;
  /** Mise en avant : seulement le choix « ce que mon appui voulait dire », s'il ne dépasse pas les places. */
  emphasized: boolean;
}

/**
 * Choix proposés quand un autre téléphone est passé avant, hors « Garder la valeur du serveur ».
 * - Annulation : on retire ma variation de la valeur du serveur (jamais sous zéro).
 * - Pointage normal : « Mettre » la valeur visée, et « Ajouter » ma variation si elle donne autre
 *   chose (cas d'un groupe qui arrive en deux fois).
 */
function buildConflictOptions(conflict: ConflictState): ConflictOption[] {
  const { op, serverCheckedIn: server } = conflict;
  const size = op.partySize;
  const delta = op.to - op.from;
  const verb = delta >= 0 ? "Ajouter" : "Retirer";
  const relative = Math.min(CHECKIN_MAX_COUNT, Math.max(0, server + delta));

  if (op.isUndo) {
    if (relative === server) return [];
    return [
      {
        key: "relative",
        label: `${verb} ${Math.abs(delta)} → ${relative}/${size}`,
        target: relative,
        emphasized: true,
      },
    ];
  }

  const options: ConflictOption[] = [
    {
      key: "set",
      label: `Mettre ${op.to}/${size}`,
      target: op.to,
      emphasized: op.to <= size,
    },
  ];
  const rawRelative = server + delta;
  if (rawRelative >= 0 && rawRelative <= CHECKIN_MAX_COUNT && rawRelative !== op.to) {
    options.push({
      key: "relative",
      label: `${verb} ${Math.abs(delta)} → ${relative}/${size}`,
      target: relative,
      emphasized: false,
    });
  }
  return options;
}

/** Réutilise les objets inchangés pour que les lignes de la liste ne se redessinent pas à chaque sondage. */
function mergeReservations(
  previous: CheckinReservation[] | undefined,
  next: CheckinReservation[]
): CheckinReservation[] {
  if (!previous) return next;
  const byId = new Map(previous.map((r) => [r.id, r]));
  return next.map((r) => {
    const old = byId.get(r.id);
    if (
      old &&
      old.checkedIn === r.checkedIn &&
      old.history.length === r.history.length &&
      old.partySize === r.partySize &&
      old.status === r.status &&
      old.lastName === r.lastName &&
      old.firstName === r.firstName &&
      old.email === r.email
    ) {
      return old;
    }
    return r;
  });
}

async function postCheckin(request: CheckinRequest): Promise<{ status: number; body: unknown }> {
  const controller = new window.AbortController();
  const timer = window.setTimeout(() => controller.abort(), WRITE_TIMEOUT_MS);
  try {
    const response = await fetch(CHECKIN_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    return { status: response.status, body };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Garde toujours la dernière version de la fonction, avec une identité stable. */
function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args: A) => ref.current(...args), []);
}

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const STATE_STYLES: Record<CheckinState, { stripe: string; chip: string; row: string }> = {
  none: { stripe: "border-l-transparent", chip: "bg-muted text-muted-foreground", row: "" },
  partial: {
    stripe: "border-l-warning",
    chip: "bg-warning/20 text-warning",
    row: "bg-warning/5",
  },
  complete: {
    stripe: "border-l-success",
    chip: "bg-success/15 text-success",
    row: "bg-success/5",
  },
  over: {
    stripe: "border-l-primary",
    chip: "bg-primary/25 text-foreground ring-1 ring-primary",
    row: "bg-primary/5",
  },
};

/* ------------------------------------------------------------------ */
/* Éléments d'interface                                                */
/* ------------------------------------------------------------------ */

function CountChip({ checkedIn, partySize }: { checkedIn: number; partySize: number }) {
  const state = getCheckinState(checkedIn, partySize);
  return (
    <span
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-sm font-bold tabular-nums",
        STATE_STYLES[state].chip
      )}
    >
      {state === "complete" && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
      {checkedIn}/{partySize}
      {state === "over" && <span className="text-xs">(+{checkedIn - partySize})</span>}
    </span>
  );
}

interface RowProps {
  reservation: CheckinReservation;
  duplicate: boolean;
  busy: boolean;
  locked: boolean;
  onOpen: (r: CheckinReservation) => void;
  onQuick: (r: CheckinReservation) => void;
}

const CheckinRow = memo(function CheckinRow({
  reservation: r,
  duplicate,
  busy,
  locked,
  onOpen,
  onQuick,
}: RowProps) {
  const state = getCheckinState(r.checkedIn, r.partySize);
  const cancelled = r.status === "cancelled";
  const remaining = r.partySize - r.checkedIn;
  const masked = maskEmail(r.email);
  const name = reservationName(r);

  return (
    <li
      className={cn(
        "flex items-stretch border-b border-l-4 border-b-border",
        STATE_STYLES[state].stripe,
        STATE_STYLES[state].row,
        cancelled && "opacity-75"
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(r)}
        className="flex min-h-[72px] min-w-0 flex-1 flex-col justify-center gap-1 px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        aria-label={`${name}, ${r.checkedIn} pointé${r.checkedIn > 1 ? "s" : ""} sur ${r.partySize}. Ouvrir le détail`}
      >
        <span className="break-words text-[17px] leading-tight text-foreground">
          <span className="font-bold uppercase">{r.lastName ?? "Sans nom"}</span>
          {r.firstName ? ` ${r.firstName}` : ""}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CountChip checkedIn={r.checkedIn} partySize={r.partySize} />
          <span className="text-xs text-muted-foreground">
            {r.partySize} place{r.partySize > 1 ? "s" : ""}
          </span>
          <span className="max-w-full truncate text-xs text-muted-foreground">
            {masked ?? "Pas d'e-mail"}
          </span>
          {cancelled && (
            <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-1.5 py-0.5 text-xs font-semibold text-destructive">
              <Ban className="h-3 w-3" aria-hidden="true" />
              Annulée
            </span>
          )}
          {duplicate && (
            <span
              className="rounded-md border border-border px-1.5 py-0.5 text-xs text-muted-foreground"
              title="Une autre réservation porte le même nom et le même prénom"
            >
              Homonyme
            </span>
          )}
        </span>
      </button>

      <div className="flex w-[88px] shrink-0 items-center justify-center py-2 pr-2">
        {cancelled ? (
          <span className="text-center text-[11px] leading-tight text-muted-foreground">
            Voir le détail
          </span>
        ) : remaining > 0 ? (
          <button
            type="button"
            onClick={() => onQuick(r)}
            disabled={busy || locked}
            aria-label={`Pointer ${pluralPeople(remaining)} : ${name}`}
            className="flex h-14 w-full flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition active:scale-95 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <span className="text-[11px] font-semibold leading-none">Pointer</span>
                <span className="mt-0.5 text-xl font-extrabold leading-none tabular-nums">
                  +{remaining}
                </span>
              </>
            )}
          </button>
        ) : (
          <div
            className="flex h-14 w-full flex-col items-center justify-center rounded-xl text-success"
            aria-hidden="true"
          >
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <>
                <Check className="h-6 w-6" strokeWidth={3} />
                <span className="text-[11px] font-semibold leading-none">Au complet</span>
              </>
            )}
          </div>
        )}
      </div>
    </li>
  );
});

/** Pastille en haut à droite : état de la mise à jour de la liste. */
function SyncPill({
  lastSyncAt,
  problem,
  onRefresh,
}: {
  lastSyncAt: number | null;
  problem: SyncProblem;
  onRefresh: () => void;
}) {
  const now = useNow(1000);
  const age = lastSyncAt === null ? null : Math.max(0, Math.round((now - lastSyncAt) / 1000));
  const stale = age !== null && age * 1000 >= CHECKIN_STALE_AFTER_MS;

  let tone: "ok" | "warn" | "bad" = "ok";
  let label = "À jour";
  if (problem === "expired") {
    tone = "bad";
    label = "Session expirée";
  } else if (problem === "offline") {
    tone = "bad";
    label = "Hors connexion";
  } else if (problem === "server") {
    tone = "bad";
    label = "Erreur serveur";
  } else if (age === null) {
    label = "Chargement…";
  } else if (stale) {
    tone = "warn";
    label = `Il y a ${formatAge(age)}`;
  } else if (age >= 10) {
    label = `Il y a ${age} s`;
  }

  return (
    <button
      type="button"
      onClick={onRefresh}
      className={cn(
        "flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-semibold",
        tone === "ok" && "text-muted-foreground",
        tone === "warn" && "bg-warning/20 text-warning",
        tone === "bad" && "bg-destructive/15 text-destructive"
      )}
      aria-label={`${label}. Actualiser la liste`}
    >
      {tone === "bad" ? (
        <WifiOff className="h-4 w-4" aria-hidden="true" />
      ) : (
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            tone === "warn" ? "bg-warning" : age === null ? "bg-muted-foreground" : "bg-success"
          )}
          aria-hidden="true"
        />
      )}
      <span className="tabular-nums">{label}</span>
    </button>
  );
}

/** Bandeau sous l'en-tête quand la liste n'est plus fiable. */
function SyncBanner({ lastSyncAt, problem }: { lastSyncAt: number | null; problem: SyncProblem }) {
  const now = useNow(1000);
  const age = lastSyncAt === null ? null : Math.max(0, Math.round((now - lastSyncAt) / 1000));
  const stale = age !== null && age * 1000 >= CHECKIN_STALE_AFTER_MS;

  if (problem === "expired") {
    return (
      <div
        role="alert"
        className="flex items-center gap-3 border-t border-destructive/30 bg-destructive/15 px-3 py-2.5 text-sm text-foreground"
      >
        <LogIn className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <p className="min-w-0 flex-1 leading-snug">
          <strong>Votre session a expiré.</strong> Les pointages ne sont plus enregistrés.
        </p>
        <a
          href={LOGIN_HREF}
          className="flex h-11 shrink-0 items-center rounded-lg bg-destructive px-3 text-sm font-semibold text-destructive-foreground"
        >
          Se reconnecter
        </a>
      </div>
    );
  }
  if (problem === "offline" || problem === "server" || stale) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 border-t border-warning/40 bg-warning/15 px-3 py-2 text-sm text-foreground"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <p className="leading-snug">
          {problem === "offline" &&
            "Pas de connexion : les pointages ne sont pas enregistrés pour l'instant."}
          {problem === "server" &&
            "Le serveur ne répond pas : les pointages risquent de ne pas être enregistrés."}
          {problem === null && "La liste n'est plus à jour."}
          {age !== null && ` Dernière mise à jour il y a ${formatAge(age)}.`}
        </p>
      </div>
    );
  }
  return null;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [shrunk, setShrunk] = useState(false);

  useEffect(() => {
    if (toast.durationMs === null) return;
    const frame = window.requestAnimationFrame(() => setShrunk(true));
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [toast.id, toast.durationMs, onDismiss]);

  return (
    <div
      className={cn(
        "pointer-events-auto relative overflow-hidden rounded-xl border shadow-lg",
        toast.tone === "success" && "border-success/50 bg-card",
        toast.tone === "info" && "border-border bg-card",
        toast.tone === "error" && "border-destructive/60 bg-card"
      )}
    >
      <div className="flex items-center gap-2 py-1.5 pl-3 pr-1.5">
        {toast.tone === "success" && (
          <Check className="h-5 w-5 shrink-0 text-success" strokeWidth={3} aria-hidden="true" />
        )}
        {toast.tone === "error" && (
          <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p
            className={cn(
              "text-sm font-semibold text-foreground",
              toast.tone === "error" ? "line-clamp-2" : "truncate"
            )}
          >
            {toast.text}
          </p>
          {toast.detail && <p className="truncate text-xs text-muted-foreground">{toast.detail}</p>}
        </div>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              onDismiss(toast.id);
              toast.action?.run();
            }}
            className="h-10 shrink-0 rounded-lg bg-foreground px-3 text-sm font-bold text-background"
          >
            {toast.action.label}
          </button>
        )}
        {toast.tone === "error" && (
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
            aria-label="Fermer ce message"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
      {toast.durationMs !== null && (
        <div className="h-1 w-full bg-muted" aria-hidden="true">
          <div
            className="h-full bg-foreground/60 ease-linear"
            style={{
              width: shrunk ? "0%" : "100%",
              transitionProperty: "width",
              transitionDuration: `${toast.durationMs}ms`,
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fiche d'une réservation                                             */
/* ------------------------------------------------------------------ */

function ReservationSheet({
  sheet,
  reservation,
  locked,
  onChange,
  onSubmit,
  onClose,
}: {
  sheet: SheetState;
  reservation: CheckinReservation;
  locked: boolean;
  onChange: (next: SheetState) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const { partySize } = reservation;
  const cancelled = reservation.status === "cancelled";
  const delta = sheet.draft - sheet.baseline;
  const over = sheet.draft > partySize;
  const needsConfirm = delta > 0 && (cancelled || over);
  const changedElsewhere = reservation.checkedIn !== sheet.baseline;
  const history = [...reservation.history].reverse();

  const setDraft = (value: number) =>
    onChange({ ...sheet, draft: Math.min(CHECKIN_MAX_COUNT, Math.max(0, value)) });

  let submitLabel = "Rien à enregistrer";
  if (delta > 0) {
    submitLabel =
      sheet.baseline > 0 ? `Pointer ${delta} de plus` : `Pointer ${pluralPeople(delta)}`;
  }
  if (delta < 0) submitLabel = `Retirer ${Math.abs(delta)} pointage${delta < -1 ? "s" : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <SheetHeader className="pr-8">
        <SheetTitle className="break-words text-xl leading-tight">
          <span className="font-extrabold uppercase">{reservation.lastName ?? "Sans nom"}</span>
          {reservation.firstName ? ` ${reservation.firstName}` : ""}
        </SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            {reservation.partySize} place{reservation.partySize > 1 ? "s" : ""} réservée
            {reservation.partySize > 1 ? "s" : ""}
          </span>
          {reservation.email && <span className="break-all">{reservation.email}</span>}
          {cancelled && (
            <span className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-1.5 py-0.5 text-xs font-semibold text-destructive">
              <Ban className="h-3 w-3" aria-hidden="true" />
              Annulée
            </span>
          )}
        </SheetDescription>
      </SheetHeader>

      {changedElsewhere && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/15 p-2.5 text-sm text-foreground"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="min-w-0 flex-1 leading-snug">
            Entre-temps, le total est passé à{" "}
            <strong>
              {reservation.checkedIn}/{partySize}
            </strong>
            .
          </p>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...sheet,
                baseline: reservation.checkedIn,
                draft: reservation.checkedIn,
                confirming: false,
              })
            }
            className="h-10 shrink-0 rounded-lg border border-border bg-background px-3 text-sm font-semibold"
          >
            Reprendre
          </button>
        </div>
      )}

      {cancelled && (
        <p className="rounded-lg bg-destructive/10 p-2.5 text-sm text-foreground">
          Cette réservation a été annulée. Un pointage demande une confirmation.
        </p>
      )}

      {sheet.confirming ? (
        <div className="flex flex-col gap-3 rounded-xl border border-warning/50 bg-warning/10 p-4">
          <p className="text-base font-semibold leading-snug text-foreground">
            {cancelled
              ? `Cette réservation est annulée. Pointer ${pluralPeople(delta)} quand même ?`
              : `${pluralPeople(sheet.draft)} pour ${partySize} place${partySize > 1 ? "s" : ""} réservée${partySize > 1 ? "s" : ""}. Pointer quand même ?`}
          </p>
          <button
            type="button"
            onClick={onSubmit}
            disabled={locked}
            className="h-14 rounded-xl bg-warning text-base font-bold text-warning-foreground disabled:opacity-60"
          >
            Oui, pointer
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...sheet, confirming: false })}
            className="h-12 rounded-xl border border-border bg-background text-base font-semibold"
          >
            Retour
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setDraft(sheet.draft - 1)}
              disabled={sheet.draft <= 0}
              className="flex h-16 w-20 items-center justify-center rounded-2xl border-2 border-border bg-background text-foreground transition active:scale-95 disabled:opacity-40"
              aria-label="Une personne de moins"
            >
              <Minus className="h-8 w-8" aria-hidden="true" />
            </button>
            <div className="flex flex-col items-center" aria-live="polite">
              <span
                className={cn(
                  "text-6xl font-extrabold leading-none tabular-nums",
                  over ? "text-warning" : "text-foreground"
                )}
              >
                {sheet.draft}
              </span>
              <span className="mt-1 text-sm text-muted-foreground">
                sur {partySize} réservée{partySize > 1 ? "s" : ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setDraft(sheet.draft + 1)}
              disabled={sheet.draft >= CHECKIN_MAX_COUNT}
              className="flex h-16 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition active:scale-95 disabled:opacity-40"
              aria-label="Une personne de plus"
            >
              <Plus className="h-8 w-8" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDraft(partySize)}
              className="h-12 rounded-xl border border-border bg-muted text-base font-semibold text-foreground"
            >
              Tous ({partySize})
            </button>
            <button
              type="button"
              onClick={() => setDraft(0)}
              className="h-12 rounded-xl border border-border bg-muted text-base font-semibold text-foreground"
            >
              Aucun
            </button>
          </div>

          {over && (
            <p className="flex items-center gap-2 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Plus de personnes que de places réservées.
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              if (delta === 0) return;
              if (needsConfirm) onChange({ ...sheet, confirming: true });
              else onSubmit();
            }}
            disabled={delta === 0 || locked}
            className="h-16 rounded-2xl bg-foreground text-lg font-bold text-background transition active:scale-[0.98] disabled:opacity-40"
          >
            {submitLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="-mt-2 h-11 rounded-xl text-base font-medium text-muted-foreground"
          >
            Fermer sans enregistrer
          </button>
        </>
      )}

      <section aria-label="Historique des pointages" className="border-t border-border pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Historique
        </h3>
        {history.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">Personne n'a encore été pointé.</p>
        ) : (
          <ul className="mt-1 max-h-36 divide-y divide-border overflow-y-auto">
            {history.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-12 shrink-0 tabular-nums text-muted-foreground">
                  {formatTime(entry.at)}
                </span>
                <span
                  className={cn(
                    "w-9 shrink-0 text-right font-bold tabular-nums",
                    entry.delta > 0 ? "text-success" : "text-destructive"
                  )}
                >
                  {formatDelta(entry.delta)}
                </span>
                <span className="min-w-0 truncate text-muted-foreground">
                  par {whoLabel(entry.by)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Écran principal                                                     */
/* ------------------------------------------------------------------ */

export function ReservationsCheckinClient({ email: _email }: { email: string }) {
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [data, setData] = useState<CheckinPayload | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [problem, setProblem] = useState<SyncProblem>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const requestId = useRef(0);
  const loadingId = useRef(0);
  const problemRef = useRef<SyncProblem>(null);

  /** Valeur affichée pendant qu'un envoi est en cours, par réservation. */
  const [optimistic, setOptimistic] = useState<Record<number, number>>({});
  const [walkInsBase, setWalkInsBase] = useState(0);
  const [walkInsPending, setWalkInsPending] = useState(0);
  const walkInsInFlight = useRef(0);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("upcoming");
  const searchRef = useRef<HTMLInputElement>(null);

  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const errorToastId = useRef<number | null>(null);
  const failures = useRef<Failure[]>([]);
  /** Réservations dont un envoi est en cours : une seule écriture à la fois par réservation. */
  const writing = useRef<Set<number>>(new Set());
  const refocusSearch = useRef(false);
  /** Dernière fiche ouverte, gardée pendant l'animation de fermeture. */
  const [shownSheet, setShownSheet] = useState<SheetState | null>(null);
  if (sheet && sheet !== shownSheet) setShownSheet(sheet);

  useEffect(() => {
    problemRef.current = problem;
  }, [problem]);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("eventSlug");
    setEventSlug(fromUrl || FREE_EVENTS[0]?.slug || "");
  }, []);

  /* ----- Messages ----- */

  const dismissToast = useCallback((id: number) => {
    if (errorToastId.current === id) {
      errorToastId.current = null;
      failures.current = [];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /** Au plus un message d'erreur et un message de confirmation à l'écran : la recherche reste libre. */
  const pushToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = ++toastSeq.current;
    setToasts((prev) => [
      ...prev.filter((t) => (t.tone === "error") !== (toast.tone === "error")),
      { ...toast, id },
    ]);
    return id;
  }, []);

  /** Réaffiche l'unique message d'erreur : le détail d'un échec, ou un résumé s'il y en a plusieurs. */
  const showFailures = useCallback(() => {
    const list = failures.current;
    if (list.length === 0) return;
    if (list.length === 1) {
      const only = list[0];
      errorToastId.current = pushToast({
        tone: "error",
        text: only.text,
        detail: only.detail,
        durationMs: null,
        action: only.retry ? { label: "Réessayer", run: only.retry } : undefined,
      });
      return;
    }
    const retries = list.flatMap((f) => (f.retry ? [f.retry] : []));
    errorToastId.current = pushToast({
      tone: "error",
      text: `${list.length} pointages non enregistrés`,
      detail: list.map((f) => f.detail).join(" · "),
      durationMs: null,
      action:
        retries.length > 0
          ? {
              label: "Tout réessayer",
              run: () => {
                failures.current = [];
                errorToastId.current = null;
                for (const retry of retries) retry();
              },
            }
          : undefined,
    });
  }, [pushToast]);

  const reportFailure = useCallback(
    (failure: Failure) => {
      failures.current = [...failures.current.filter((f) => f.key !== failure.key), failure];
      showFailures();
    },
    [showFailures]
  );

  /** Un échec n'a plus lieu d'être signalé (le pointage est passé entre-temps). */
  const resolveFailure = useCallback(
    (key: string) => {
      if (!failures.current.some((f) => f.key === key)) return;
      failures.current = failures.current.filter((f) => f.key !== key);
      if (failures.current.length > 0) {
        showFailures();
      } else if (errorToastId.current !== null) {
        const id = errorToastId.current;
        errorToastId.current = null;
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }
    },
    [showFailures]
  );

  /* ----- Lecture de la liste ----- */

  const fetchData = useStableCallback(async () => {
    if (!eventSlug) return;
    const current = ++requestId.current;
    loadingId.current = current;
    const controller = new window.AbortController();
    const timer = window.setTimeout(() => controller.abort(), LIST_TIMEOUT_MS);
    try {
      const response = await fetch(`${CHECKIN_API}?eventSlug=${encodeURIComponent(eventSlug)}`, {
        cache: "no-store",
        signal: controller.signal,
      });
      if (current !== requestId.current) return;
      if (response.status === 401) {
        setProblem("expired");
        return;
      }
      if (!response.ok) {
        const message = await readApiError(response, "Impossible de charger la liste.");
        if (current !== requestId.current) return;
        setProblem("server");
        setLoadError(message);
        return;
      }
      const body: unknown = await response.json();
      if (current !== requestId.current) return;
      if (!isCheckinPayload(body)) {
        setProblem("server");
        setLoadError("La réponse du serveur est incomplète. Rechargez la page.");
        return;
      }
      setData((prev) => ({
        ...body,
        reservations: mergeReservations(prev?.reservations, body.reservations),
      }));
      // Pendant un envoi « sans réservation », le serveur peut compter ou non l'ajout : on garde notre valeur.
      setWalkInsBase((prev) => (walkInsInFlight.current > 0 ? prev : body.totals.walkIns));
      setLastSyncAt(Date.now());
      setProblem(null);
      setLoadError(null);
    } catch {
      if (current === requestId.current) setProblem("offline");
    } finally {
      window.clearTimeout(timer);
      if (current === requestId.current) loadingId.current = 0;
    }
  });

  /** Oublie les réponses de lecture en cours (elles datent d'avant l'écriture) et relit tout de suite. */
  const refreshAfterWrite = useStableCallback(() => {
    requestId.current++;
    loadingId.current = 0;
    void fetchData();
  });

  useEffect(() => {
    if (!eventSlug) return;
    void fetchData();
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (loadingId.current !== 0 || problemRef.current === "expired") return;
      void fetchData();
    }, CHECKIN_POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void fetchData();
    };
    const onOnline = () => void fetchData();
    const onOffline = () => setProblem("offline");
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [eventSlug, fetchData]);

  /* ----- Écran toujours allumé ----- */

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let sentinel: Awaited<ReturnType<typeof navigator.wakeLock.request>> | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible" || sentinel) return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
        lock.addEventListener("release", () => {
          if (sentinel === lock) sentinel = null;
        });
      } catch {
        // refusé (économie d'énergie, onglet masqué…) : on continue sans
      }
    };
    void acquire();
    const onVisible = () => void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, []);

  /* ----- Données affichées ----- */

  const reservations = useMemo<CheckinReservation[]>(() => {
    if (!data) return [];
    return data.reservations.map((r) =>
      optimistic[r.id] === undefined ? r : { ...r, checkedIn: optimistic[r.id] }
    );
  }, [data, optimistic]);

  const walkIns = Math.max(0, walkInsBase + walkInsPending);

  const totals = useMemo(() => {
    let reservedPlaces = 0;
    let activeCount = 0;
    let arrivedPeople = 0;
    let arrivedGroups = 0;
    for (const r of reservations) {
      if (r.status === "active") {
        activeCount++;
        reservedPlaces += r.partySize;
      }
      if (r.checkedIn > 0) {
        arrivedPeople += r.checkedIn;
        arrivedGroups++;
      }
    }
    return { reservedPlaces, activeCount, arrivedPeople, arrivedGroups };
  }, [reservations]);

  const inHall = totals.arrivedPeople + walkIns;
  const capacity = data?.event.capacity ?? null;
  const capacityRatio = capacity && capacity > 0 ? inHall / capacity : null;
  const capacityLevel: "ok" | "alert" | "full" =
    capacityRatio === null
      ? "ok"
      : capacityRatio >= 1
        ? "full"
        : capacityRatio >= CAPACITY_ALERT_RATIO
          ? "alert"
          : "ok";

  const duplicates = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of reservations) {
      if (r.status !== "active") continue;
      const key = nameKey(r);
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const flagged = new Set<number>();
    for (const r of reservations) {
      const key = nameKey(r);
      if (r.status === "active" && key && (counts.get(key) ?? 0) > 1) flagged.add(r.id);
    }
    return flagged;
  }, [reservations]);

  const filterCounts = useMemo(() => {
    const counts: Record<Filter, number> = {
      upcoming: 0,
      partial: 0,
      arrived: 0,
      all: reservations.length,
    };
    for (const r of reservations) {
      if (r.status !== "active") continue;
      const state = getCheckinState(r.checkedIn, r.partySize);
      if (state === "none") counts.upcoming++;
      else if (state === "partial") counts.partial++;
      else counts.arrived++;
    }
    return counts;
  }, [reservations]);

  const searching = normalizeSearchText(query) !== "";

  const visible = useMemo(() => {
    const list = reservations.filter((r) => {
      if (searching) return matchesCheckinSearch(r, query);
      if (filter === "all") return true;
      if (r.status !== "active") return false;
      const state = getCheckinState(r.checkedIn, r.partySize);
      if (filter === "upcoming") return state === "none";
      if (filter === "partial") return state === "partial";
      return state === "complete" || state === "over";
    });
    return list.sort((a, b) => {
      if (searching && a.status !== b.status) return a.status === "active" ? -1 : 1;
      return compareByName(a, b);
    });
  }, [reservations, filter, query, searching]);

  /** Lettre de séparation devant la première réservation de chaque initiale (hors recherche). */
  const rows = useMemo(() => {
    let previous = "";
    return visible.map((reservation) => {
      const letter = searching ? "" : getInitial(reservation.lastName);
      const initial = letter && letter !== previous ? letter : null;
      if (letter) previous = letter;
      return { reservation, initial };
    });
  }, [visible, searching]);

  /* ----- Écritures ----- */

  const clearOptimistic = useCallback((id: number) => {
    setOptimistic((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const applyServerState = useCallback((id: number, checkedIn: number, history: CheckinEntry[]) => {
    setData((prev) =>
      prev
        ? {
            ...prev,
            reservations: prev.reservations.map((r) =>
              r.id === id ? { ...r, checkedIn, history } : r
            ),
          }
        : prev
    );
  }, []);

  const runReservationOp = useStableCallback(async (op: ReservationOp): Promise<void> => {
    if (!eventSlug) return;
    if (writing.current.has(op.reservationId)) {
      pushToast({
        tone: "info",
        text: "Un pointage est déjà en cours",
        detail: `${op.name} : réessayez dans un instant.`,
        durationMs: 3000,
      });
      return;
    }
    writing.current.add(op.reservationId);
    setOptimistic((prev) => ({ ...prev, [op.reservationId]: op.to }));
    const label = `${op.name} → ${op.to}/${op.partySize}`;
    const failureKey = `reservation-${op.reservationId}`;
    const retry = () => void runReservationOp(op);

    try {
      const { status, body } = await postCheckin({
        kind: "reservation",
        eventSlug,
        opId: op.opId,
        reservationId: op.reservationId,
        from: op.from,
        to: op.to,
      });

      if (status === 200 && isReservationSuccess(body)) {
        applyServerState(op.reservationId, body.checkedIn, body.history);
        clearOptimistic(op.reservationId);
        resolveFailure(failureKey);
        refreshAfterWrite();
        if (op.isUndo) {
          pushToast({
            tone: "info",
            text: "Pointage annulé",
            detail: `${op.name} · ${body.checkedIn}/${op.partySize}`,
            durationMs: 4000,
          });
        } else if (op.from !== op.to) {
          pushToast({
            tone: "success",
            text: `${op.name} · ${body.checkedIn}/${op.partySize}`,
            detail: `${formatDelta(op.to - op.from)} ${op.to - op.from > 1 || op.to - op.from < -1 ? "personnes" : "personne"}`,
            durationMs: CHECKIN_UNDO_WINDOW_MS,
            action: {
              label: "Annuler",
              run: () =>
                void runReservationOp({
                  opId: newOpId(),
                  reservationId: op.reservationId,
                  from: body.checkedIn,
                  to: op.from,
                  name: op.name,
                  partySize: op.partySize,
                  isUndo: true,
                }),
            },
          });
        }
        return;
      }

      clearOptimistic(op.reservationId);

      if (status === 409 && isReservationConflict(body)) {
        applyServerState(op.reservationId, body.checkedIn, body.history);
        refreshAfterWrite();
        setConflict({
          op,
          serverCheckedIn: body.checkedIn,
          last: body.history.length > 0 ? body.history[body.history.length - 1] : null,
        });
        return;
      }
      if (status === 401) {
        setProblem("expired");
        reportFailure({
          key: failureKey,
          text: "Session expirée : pointage non enregistré",
          detail: label,
        });
        return;
      }
      const retryable = status >= 500 || status === 200 || status === 409;
      if (retryable) refreshAfterWrite();
      reportFailure({
        key: failureKey,
        text: retryable
          ? "Réponse inattendue du serveur. Vérifiez la ligne, ou réessayez."
          : bodyError(body, "Pointage refusé."),
        detail: label,
        retry: retryable ? retry : undefined,
      });
    } catch {
      clearOptimistic(op.reservationId);
      setProblem("offline");
      // La requête a peut-être atteint le serveur : on relit la liste pour le savoir.
      refreshAfterWrite();
      reportFailure({
        key: failureKey,
        text: "Pas de réponse du serveur. Vérifiez la ligne, ou réessayez.",
        detail: label,
        retry,
      });
    } finally {
      writing.current.delete(op.reservationId);
    }
  });

  const runWalkInOp = useStableCallback(async (op: WalkInOp): Promise<void> => {
    if (!eventSlug) return;
    walkInsInFlight.current++;
    setWalkInsPending((prev) => prev + op.delta);
    const retry = () => void runWalkInOp(op);
    const failureKey = `walk-in-${op.opId}`;
    const label = `${formatDelta(op.delta)} sans réservation`;
    const settle = () => {
      walkInsInFlight.current--;
      setWalkInsPending((prev) => prev - op.delta);
    };

    try {
      const { status, body } = await postCheckin({
        kind: "walk-in",
        eventSlug,
        opId: op.opId,
        delta: op.delta,
      });

      if (status === 200 && isWalkInSuccess(body)) {
        setWalkInsBase(body.walkIns);
        settle();
        resolveFailure(failureKey);
        refreshAfterWrite();
        if (op.isUndo) {
          pushToast({
            tone: "info",
            text: "Ajout annulé",
            detail: `Sans réservation : ${body.walkIns}`,
            durationMs: 4000,
          });
        } else {
          pushToast({
            tone: "success",
            text: `${formatDelta(op.delta)} sans réservation`,
            detail: `Total sans réservation : ${body.walkIns}`,
            durationMs: CHECKIN_UNDO_WINDOW_MS,
            action: {
              label: "Annuler",
              run: () => void runWalkInOp({ opId: newOpId(), delta: -op.delta, isUndo: true }),
            },
          });
        }
        return;
      }

      if (status === 409 && isWalkInConflict(body)) {
        setWalkInsBase(body.walkIns);
        settle();
        refreshAfterWrite();
        reportFailure({
          key: failureKey,
          text: "Impossible : le compteur serait négatif",
          detail: `Il y a ${body.walkIns} entrée${body.walkIns > 1 ? "s" : ""} sans réservation.`,
        });
        return;
      }
      settle();
      if (status === 401) {
        setProblem("expired");
        reportFailure({
          key: failureKey,
          text: "Session expirée : entrée non enregistrée",
          detail: label,
        });
        return;
      }
      const retryable = status >= 500 || status === 200 || status === 409;
      if (retryable) refreshAfterWrite();
      reportFailure({
        key: failureKey,
        text: retryable
          ? "Réponse inattendue du serveur. Vérifiez le compteur, ou réessayez."
          : bodyError(body, "Ajout refusé."),
        detail: label,
        retry: retryable ? retry : undefined,
      });
    } catch {
      settle();
      setProblem("offline");
      // La requête a peut-être atteint le serveur : on relit le compteur pour le savoir.
      refreshAfterWrite();
      reportFailure({
        key: failureKey,
        text: "Pas de réponse du serveur. Vérifiez le compteur, ou réessayez.",
        detail: label,
        retry,
      });
    }
  });

  /* ----- Actions de l'écran ----- */

  const focusSearch = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    focusSearch();
  }, [focusSearch]);

  const quickCheckin = useStableCallback((r: CheckinReservation) => {
    if (r.status === "cancelled" || r.checkedIn >= r.partySize) return;
    if (optimistic[r.id] !== undefined) return;
    clearSearch();
    void runReservationOp({
      opId: newOpId(),
      reservationId: r.id,
      from: r.checkedIn,
      to: r.partySize,
      name: reservationName(r),
      partySize: r.partySize,
      isUndo: false,
    });
  });

  const openSheet = useCallback((r: CheckinReservation) => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setSheet({
      id: r.id,
      baseline: r.checkedIn,
      draft: r.status === "active" && r.checkedIn < r.partySize ? r.partySize : r.checkedIn,
      confirming: false,
    });
  }, []);

  const closeSheet = useCallback(() => {
    setSheet(null);
  }, []);

  const submitSheet = () => {
    if (!sheet) return;
    const r = reservations.find((x) => x.id === sheet.id);
    if (!r || sheet.draft === sheet.baseline || optimistic[r.id] !== undefined) return;
    refocusSearch.current = true;
    setQuery("");
    setSheet(null);
    void runReservationOp({
      opId: newOpId(),
      reservationId: r.id,
      from: sheet.baseline,
      to: sheet.draft,
      name: reservationName(r),
      partySize: r.partySize,
      isUndo: false,
    });
  };

  /** À la fermeture d'une fiche, le curseur retourne dans la recherche si une action vient d'être faite. */
  const handleCloseAutoFocus = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (refocusSearch.current) {
      refocusSearch.current = false;
      focusSearch();
    }
  };

  const sendWalkIn = (delta: number) => {
    refocusSearch.current = true;
    setWalkInOpen(false);
    void runWalkInOp({ opId: newOpId(), delta, isUndo: false });
  };

  const keepServerValue = () => setConflict(null);

  /** Nouvelle tentative à partir de la valeur du serveur, vers la valeur choisie. */
  const resolveConflict = (target: number) => {
    if (!conflict) return;
    const { op, serverCheckedIn } = conflict;
    setConflict(null);
    if (target === serverCheckedIn) return;
    void runReservationOp({
      opId: newOpId(),
      reservationId: op.reservationId,
      from: serverCheckedIn,
      to: target,
      name: op.name,
      partySize: op.partySize,
      isUndo: op.isUndo,
    });
  };

  /* ----- Affichage ----- */

  const event = data?.event ?? (eventSlug ? getFreeEvent(eventSlug) : undefined);
  const eventTitle = event?.title ?? "";
  const loading = data === null && problem === null && loadError === null;
  const locked = problem === "expired";
  const displayedSheet = sheet ?? shownSheet;
  const sheetReservation = displayedSheet
    ? reservations.find((r) => r.id === displayedSheet.id)
    : undefined;
  const myDelta = conflict ? conflict.op.to - conflict.op.from : 0;
  const alreadyDone = conflict
    ? !conflict.op.isUndo && conflict.serverCheckedIn === conflict.op.to
    : false;
  const conflictOptions = conflict && !alreadyDone ? buildConflictOptions(conflict) : [];

  return (
    <div className="min-h-dvh bg-background pb-32 text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background shadow-sm">
        {/* Messages : posés sur la première ligne de l'en-tête, visibles même clavier ouvert */}
        <div
          className="pointer-events-none absolute inset-x-2 top-1 z-20 flex flex-col gap-1"
          role="status"
          aria-live="polite"
        >
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>

        <div className="flex h-14 items-center gap-1 px-1.5">
          <a
            href={BACK_HREF}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
            aria-label="Retour aux réservations"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </a>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-bold">Accueil · pointage</p>
            <p className="truncate text-[11px] text-muted-foreground">{eventTitle}</p>
          </div>
          <SyncPill lastSyncAt={lastSyncAt} problem={problem} onRefresh={() => void fetchData()} />
          <div className="[&_button]:flex [&_button]:h-11 [&_button]:w-11 [&_button]:items-center [&_button]:justify-center">
            <ThemeToggle />
          </div>
        </div>

        <SyncBanner lastSyncAt={lastSyncAt} problem={problem} />

        {/* Chiffres */}
        <div className="grid grid-cols-[1.2fr_0.9fr_1.2fr] gap-1.5 px-3 pb-2">
          <div className="rounded-lg bg-muted px-2.5 py-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">Avec réservation</p>
            <p className="text-xl font-extrabold leading-tight tabular-nums">
              {totals.arrivedPeople}
              <span className="text-sm font-semibold text-muted-foreground">
                {" "}
                / {totals.reservedPlaces}
              </span>
            </p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {totals.arrivedGroups}/{totals.activeCount} groupes
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
              setWalkInOpen(true);
            }}
            className="rounded-lg border border-dashed border-border bg-muted px-2.5 py-1.5 text-left active:scale-95"
            aria-label={`Sans réservation : ${walkIns}. Ajouter une entrée`}
          >
            <p className="text-[11px] font-medium text-muted-foreground">Sans réservation</p>
            <p className="flex items-center gap-1 text-xl font-extrabold leading-tight tabular-nums">
              {walkIns}
              <Plus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </p>
            <p className="text-[11px] text-muted-foreground">Ajouter</p>
          </button>
          <div
            className={cn(
              "rounded-lg px-2.5 py-1.5",
              capacityLevel === "ok" && "bg-muted",
              capacityLevel === "alert" && "bg-warning/20",
              capacityLevel === "full" && "bg-destructive/15"
            )}
          >
            <p className="text-[11px] font-medium text-muted-foreground">Dans la salle</p>
            <p className="text-xl font-extrabold leading-tight tabular-nums">
              {inHall}
              {capacity !== null && (
                <span className="text-sm font-semibold text-muted-foreground"> / {capacity}</span>
              )}
            </p>
            {capacityRatio !== null ? (
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-background/70"
                role="progressbar"
                aria-label="Remplissage de la salle"
                aria-valuemin={0}
                aria-valuemax={capacity ?? undefined}
                aria-valuenow={inHall}
              >
                <div
                  className={cn(
                    "h-full rounded-full",
                    capacityLevel === "ok" && "bg-success",
                    capacityLevel === "alert" && "bg-warning",
                    capacityLevel === "full" && "bg-destructive"
                  )}
                  style={{ width: `${Math.min(100, Math.round((capacityRatio ?? 0) * 100))}%` }}
                />
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">avec les sans-résa</p>
            )}
          </div>
        </div>

        {capacityLevel !== "ok" && capacity !== null && (
          <div
            role="status"
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm font-semibold",
              capacityLevel === "alert"
                ? "bg-warning/20 text-warning"
                : "bg-destructive/15 text-destructive"
            )}
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {capacityLevel === "alert"
              ? `Salle presque pleine : ${inHall} sur ${capacity} places.`
              : `Salle complète : ${inHall} sur ${capacity} places.`}
          </div>
        )}

        {/* Recherche */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="text"
              inputMode="search"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") setQuery("");
              }}
              placeholder="Nom, prénom ou e-mail"
              aria-label="Rechercher une réservation"
              className="h-14 w-full rounded-xl border-2 border-input bg-card pl-11 pr-14 text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground"
                aria-label="Effacer la recherche"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Filtres */}
        <div
          className={cn("grid grid-cols-4 gap-1 px-3 pb-2.5", searching && "opacity-50")}
          role="group"
          aria-label="Filtrer la liste"
        >
          {FILTERS.map((item) => {
            const active = !searching && filter === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setFilter(item.value);
                  if (searching) setQuery("");
                }}
                className={cn(
                  "flex h-12 flex-col items-center justify-center rounded-lg text-[13px] font-semibold leading-tight",
                  active ? "bg-foreground text-background" : "bg-muted text-foreground"
                )}
              >
                <span>{item.label}</span>
                <span className="tabular-nums text-xs font-bold opacity-80">
                  {filterCounts[item.value]}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <main>
        {searching && (
          <p className="px-4 py-2 text-sm text-muted-foreground" aria-live="polite">
            {visible.length === 0
              ? "Aucun résultat"
              : `${visible.length} résultat${visible.length > 1 ? "s" : ""}`}{" "}
            dans toutes les réservations
          </p>
        )}

        {loading && (
          <ul aria-busy="true" aria-label="Chargement de la liste">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <li key={i} className="flex h-[73px] items-center gap-3 border-b border-border px-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                </div>
                <div className="h-14 w-[76px] animate-pulse rounded-xl bg-muted" />
              </li>
            ))}
          </ul>
        )}

        {!loading && data === null && (
          <div
            role="alert"
            className="m-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4"
          >
            <p className="font-semibold">
              {problem === "expired"
                ? "Votre session a expiré."
                : (loadError ?? "La liste n'a pas pu être chargée.")}
            </p>
            {problem !== "expired" && (
              <button
                type="button"
                onClick={() => void fetchData()}
                className="mt-3 flex h-12 items-center gap-2 rounded-xl bg-foreground px-4 font-semibold text-background"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Réessayer
              </button>
            )}
          </div>
        )}

        {data && (
          <ul>
            {rows.map(({ reservation, initial }) => (
              <RowWithInitial
                key={reservation.id}
                initial={initial}
                reservation={reservation}
                duplicate={duplicates.has(reservation.id)}
                busy={optimistic[reservation.id] !== undefined}
                locked={locked}
                onOpen={openSheet}
                onQuick={quickCheckin}
              />
            ))}
          </ul>
        )}

        {data && visible.length === 0 && (
          <p className="px-4 py-8 text-center text-base text-muted-foreground">
            {searching
              ? `Personne ne correspond à « ${query.trim()} ».`
              : filter === "upcoming"
                ? "Plus personne à pointer."
                : "Rien à afficher dans cette liste."}
          </p>
        )}

        {data && (
          <section
            aria-label="Pas sur la liste"
            className="mx-3 mt-5 rounded-xl border border-dashed border-border bg-muted/50 p-4"
          >
            <h2 className="text-base font-bold">Pas sur la liste ?</h2>
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
              <li>Cherchez avec le prénom, ou une partie du nom.</li>
              <li>Essayez l'e-mail ou une autre orthographe.</li>
              <li>La réservation est peut-être au nom d'un proche.</li>
            </ul>
            <button
              type="button"
              onClick={() => setWalkInOpen(true)}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-foreground/80 text-base font-bold"
            >
              <UserPlus className="h-5 w-5" aria-hidden="true" />
              Ajouter une entrée sans réservation
            </button>
          </section>
        )}
      </main>

      {/* Fiche d'une réservation */}
      <Sheet open={sheet !== null} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto p-5 pb-8"
          onCloseAutoFocus={handleCloseAutoFocus}
        >
          {displayedSheet && sheetReservation ? (
            <ReservationSheet
              sheet={displayedSheet}
              reservation={sheetReservation}
              locked={locked || optimistic[displayedSheet.id] !== undefined}
              onChange={setSheet}
              onSubmit={submitSheet}
              onClose={closeSheet}
            />
          ) : sheet ? (
            <>
              <SheetTitle>Réservation introuvable</SheetTitle>
              <SheetDescription>Elle a peut-être été supprimée entre-temps.</SheetDescription>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Entrées sans réservation */}
      <Sheet open={walkInOpen} onOpenChange={setWalkInOpen}>
        <SheetContent side="bottom" className="p-5 pb-8" onCloseAutoFocus={handleCloseAutoFocus}>
          <SheetHeader className="pr-8">
            <SheetTitle className="text-xl">Sans réservation</SheetTitle>
            <SheetDescription>
              Personnes arrivées sans être sur la liste. Le compteur est partagé entre tous les
              téléphones.
            </SheetDescription>
          </SheetHeader>
          <div className="flex items-center justify-center gap-3 py-1">
            <Users className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <span className="text-5xl font-extrabold tabular-nums">{walkIns}</span>
            <span className="text-sm text-muted-foreground">
              déjà
              <br />
              comptées
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => sendWalkIn(n)}
                disabled={locked}
                className="h-16 rounded-2xl bg-primary text-2xl font-extrabold text-primary-foreground transition active:scale-95 disabled:opacity-50"
                aria-label={`Ajouter ${pluralPeople(n)}`}
              >
                +{n}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => sendWalkIn(-1)}
            disabled={locked || walkIns <= 0}
            className="h-12 rounded-xl border border-border bg-muted text-base font-semibold disabled:opacity-40"
          >
            −1 (erreur de comptage)
          </button>
          <button
            type="button"
            onClick={() => {
              refocusSearch.current = true;
              setWalkInOpen(false);
            }}
            className="h-11 rounded-xl text-base font-medium text-muted-foreground"
          >
            Retour à la recherche
          </button>
        </SheetContent>
      </Sheet>

      {/* Pointage modifié entre-temps par un autre téléphone */}
      <AlertDialog open={conflict !== null} onOpenChange={(open) => !open && keepServerValue()}>
        <AlertDialogContent>
          {conflict && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {alreadyDone ? "Déjà pointé" : "Pointage modifié entre-temps"}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {conflict.op.name}
                    </p>
                    <p>
                      {conflict.last
                        ? `Entre-temps, ${whoLabel(conflict.last.by)} a ${
                            conflict.last.delta >= 0 ? "pointé" : "retiré"
                          } ${pluralPeople(Math.abs(conflict.last.delta))} à ${formatTime(conflict.last.at)}.`
                        : "Entre-temps, quelqu'un d'autre a modifié le pointage."}{" "}
                      Total actuel :{" "}
                      <strong>
                        {conflict.serverCheckedIn}/{conflict.op.partySize}
                      </strong>
                      .
                    </p>
                    {!alreadyDone && (
                      <p>
                        Vous vouliez {myDelta >= 0 ? "pointer" : "retirer"}{" "}
                        <strong>{pluralPeople(Math.abs(myDelta))}</strong>
                        {conflict.op.isUndo
                          ? "."
                          : ` (total visé : ${conflict.op.to}/${conflict.op.partySize}).`}
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:justify-stretch sm:space-x-0">
                {alreadyDone ? (
                  <AlertDialogCancel className="mt-0 h-12 w-full text-base">
                    C'est bon
                  </AlertDialogCancel>
                ) : (
                  <>
                    {conflictOptions.map((option) => {
                      const beyond = option.target > conflict.op.partySize;
                      return (
                        <AlertDialogAction
                          key={option.key}
                          onClick={() => resolveConflict(option.target)}
                          className={cn(
                            "h-12 w-full text-base",
                            (!option.emphasized || beyond) &&
                              "border border-input bg-background text-foreground shadow-sm hover:bg-accent",
                            beyond && "text-warning"
                          )}
                        >
                          {option.label}
                          {beyond && (
                            <span className="ml-1 text-xs font-normal">(plus que de places)</span>
                          )}
                        </AlertDialogAction>
                      );
                    })}
                    <AlertDialogCancel className="mt-0 h-12 w-full text-base">
                      Garder {conflict.serverCheckedIn}/{conflict.op.partySize}
                    </AlertDialogCancel>
                  </>
                )}
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Ligne de la liste, précédée d'une lettre quand l'initiale change. */
function RowWithInitial({
  initial,
  ...rowProps
}: RowProps & {
  initial: string | null;
}) {
  return (
    <>
      {initial && (
        <li
          aria-hidden="true"
          className="border-b border-border bg-muted px-4 py-1 text-xs font-bold tracking-widest text-muted-foreground"
        >
          {initial}
        </li>
      )}
      <CheckinRow {...rowProps} />
    </>
  );
}
