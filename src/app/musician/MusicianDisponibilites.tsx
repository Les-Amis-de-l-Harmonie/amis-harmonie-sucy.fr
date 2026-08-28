"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  History,
  Loader2,
  Lock,
  MapPin,
  MessageSquare,
  Minus,
  Pencil,
  RefreshCw,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { Textarea } from "@/app/components/ui/textarea";
import { EmptyState } from "@/app/components/ui/empty-state";
import { formatDateFrench, formatDateLong, isEventPast } from "@/lib/dates";
import { groupMembersByPupitre } from "@/lib/presence-groups";
import { cn } from "@/lib/utils";

type PresenceStatus = "present" | "absent";

interface PresenceRosterEntry {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  primaryInstrument: string | null;
  status: PresenceStatus | null;
}

interface PresenceEvent {
  id: number;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  address: string | null;
  response_deadline: string | null;
  response: {
    status: PresenceStatus | null;
    comment: string | null;
    updated_at: string | null;
  };
  roster: PresenceRosterEntry[];
  counts: {
    present: number;
    absent: number;
    noAnswer: number;
    totalMembers: number;
  };
}

interface PresenceApiResponse {
  currentUserId?: number;
  events: PresenceEvent[];
}

interface PresenceSubmitResponse {
  success?: boolean;
  event?: PresenceEvent;
  error?: string;
}

function getFullName(firstName: string | null, lastName: string | null): string {
  if (!firstName && !lastName) return "Anonyme";
  return [firstName, lastName].filter(Boolean).join(" ");
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

function formatDateShortLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

/** La date limite est considérée comme proche dans les deux semaines : ce seuil
 * correspond à l'alerte du serveur pour la carte de planning. */
const CLOSE_DEADLINE_DAYS = 14;

/** Délai de sursis (task 1) : le temps qu'une carte reste affichée après une réponse
 * réussie, une fois le pointeur sorti (ou après la dernière interaction au tactile). */
const LINGER_DELAY_MS = 3000;

function getDeadlineTone(
  deadline: string | null,
  answered: boolean
): { label: string; tone: "muted" | "warning" | "danger" } {
  if (!deadline) {
    return { label: "Pas de date limite fixée", tone: "muted" };
  }

  const today = todayIso();
  const diffDays = daysBetween(today, deadline);
  const label = formatDateLong(deadline);

  if (diffDays < 0) {
    return {
      label: `Date limite dépassée (${label})`,
      tone: answered ? "muted" : "danger",
    };
  }

  if (answered) {
    return { label: `Date limite : ${label}`, tone: "muted" };
  }

  if (diffDays <= CLOSE_DEADLINE_DAYS) {
    return { label: `À répondre avant le ${label}`, tone: "warning" };
  }

  return { label: `À répondre avant le ${label}`, tone: "muted" };
}

function StatusPill({ status }: { status: PresenceStatus | null }) {
  if (status === "present") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-300">
        <Check className="h-3.5 w-3.5" />
        Présent
      </span>
    );
  }
  if (status === "absent") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
        <X className="h-3.5 w-3.5" />
        Absent
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
      <AlertTriangle className="h-3.5 w-3.5" />À répondre
    </span>
  );
}

/** `null` représente l'action "effacer" ; `null` "tout court" (pas d'action en cours)
 * est représenté par `pendingAction === null`, d'où ce type dédié plutôt que de
 * réutiliser `PresenceStatus | null` pour les deux sens à la fois. */
type PendingAction = "present" | "absent" | "clear";

interface PresenceCardProps {
  event: PresenceEvent;
  onUpdate: (event: PresenceEvent) => void;
  /** Une réponse (présent/absent) vient d'être enregistrée avec succès, ou effacée :
   * le parent tient le set de cartes "en sursis" et décide seul de la visibilité. */
  onStatusChanged: (eventId: number, status: PresenceStatus | null) => void;
  /** Démarre (ou relance) le délai de 3 s avant disparition de la carte. */
  onLingerArm: (eventId: number) => void;
  /** Annule le délai en cours : la carte n'est pas prête à disparaître. */
  onLingerCancel: (eventId: number) => void;
}

function PresenceCard({
  event,
  onUpdate,
  onStatusChanged,
  onLingerArm,
  onLingerCancel,
}: PresenceCardProps) {
  const [comment, setComment] = useState(event.response.comment ?? "");
  const [commentOpen, setCommentOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [lastSavedAction, setLastSavedAction] = useState<PendingAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (saveState !== "saved") return;

    // Volontairement plus court que le délai de sursis de la carte (3 s) : sans ça,
    // la confirmation « Réponse enregistrée » et la disparition de la carte
    // tomberaient sur le même instant, et un musicien qui s'éloigne aussitôt ne
    // verrait jamais la confirmation.
    const timeoutId = window.setTimeout(() => setSaveState("idle"), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [saveState]);

  const status = event.response.status;
  const answered = status !== null;
  // Le serveur refuse toute réponse pour une prestation passée (400) : on ne propose
  // donc jamais les contrôles interactifs pour ces dates, plutôt que de laisser
  // l'utilisateur essayer pour échouer.
  const isPast = isEventPast(event.date);
  const deadlineInfo = isPast
    ? { label: "Prestation passée : réponses closes", tone: "muted" as const }
    : getDeadlineTone(event.response_deadline, answered);

  const submit = useCallback(
    async (newStatus: PresenceStatus | null) => {
      const action: PendingAction =
        newStatus === "present" ? "present" : newStatus === "absent" ? "absent" : "clear";
      setPendingAction(action);
      setSaveState("idle");
      setErrorMessage(null);
      try {
        const response = await fetch("/api/musician/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event.id,
            status: newStatus,
            comment: newStatus === null ? null : comment.trim() || null,
          }),
        });
        const data = (await response.json()) as PresenceSubmitResponse;
        if (!response.ok || !data.success || !data.event) {
          throw new Error(data.error || "La réponse n'a pas pu être enregistrée.");
        }
        // Reconciliation à partir de la réponse serveur uniquement : effacer une
        // réponse supprime aussi le commentaire côté base (contrainte NOT NULL sur
        // `status`, implémentée par une suppression de ligne), donc toute valeur
        // locale supposée ici — au lieu de relire `data.event` — laisserait le
        // commentaire affiché dans le textarea alors qu'il n'existe plus, prêt à
        // être ré-enregistré en silence à la prochaine réponse.
        setComment(data.event.response.comment ?? "");
        setConfirmingClear(false);
        onUpdate(data.event);
        setSaveState("saved");
        setLastSavedAction(action);
        onStatusChanged(event.id, newStatus);
      } catch (err) {
        setSaveState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "La réponse n'a pas pu être enregistrée."
        );
      } finally {
        setPendingAction(null);
      }
    },
    [comment, event.id, onStatusChanged, onUpdate]
  );

  const commentDirty = comment.trim() !== (event.response.comment ?? "").trim();

  // Deux gardes symétriques protègent la carte tant que l'utilisateur est encore
  // dessus, chacune pour un mode d'interaction : la souris (survol) et le clavier
  // au tactile (focus, typiquement le textarea de commentaire). Les deux se
  // contentent d'une ref — rien ici ne doit provoquer de re-rendu.
  //
  // `mouseInsideRef` : "une souris est actuellement dessus". pointerenter/leave se
  // déclenchent aussi pour le tactile dans la plupart des navigateurs, d'où le
  // filtre sur `pointerType === "mouse"` : au tactile elle reste toujours à false.
  const mouseInsideRef = useRef(false);
  // `focusInsideRef` : "un élément de la carte a le focus". Sans elle, chaque
  // frappe dans le textarea (onChange) réarmait le délai de 3 s comme n'importe
  // quelle interaction, et une pause de réflexion de plus de 3 s pendant la saisie
  // faisait disparaître la carte avec le brouillon de commentaire en cours — le
  // pendant tactile exact du bug déjà corrigé pour la souris.
  const focusInsideRef = useRef(false);

  // Une prestation passée n'entre jamais dans ce mécanisme : aucun de ces
  // gestionnaires n'est même attaché à la carte, elle n'a rien à faire disparaître.
  const handlePointerEnter = isPast
    ? undefined
    : (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === "mouse") mouseInsideRef.current = true;
        onLingerCancel(event.id);
      };
  const handlePointerLeave = isPast
    ? undefined
    : (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === "mouse") mouseInsideRef.current = false;
        onLingerArm(event.id);
      };
  const handleFocus = isPast
    ? undefined
    : () => {
        focusInsideRef.current = true;
        onLingerCancel(event.id);
      };
  // Le focus qui quitte réellement la carte doit continuer à armer le délai — sinon
  // un utilisateur au tactile ne pourrait plus jamais faire disparaître la carte
  // après avoir touché le textarea. C'est ce qui garde la carte "dismissable".
  const handleBlur = isPast
    ? undefined
    : () => {
        focusInsideRef.current = false;
        onLingerArm(event.id);
      };
  // pointerdown / click / change : n'arme que si la souris survole encore la carte
  // OU qu'un de ses éléments a le focus — sinon un simple clic sur "Présent" (sous
  // un curseur qui n'a pas bougé) ou une frappe dans le commentaire (pendant qu'on
  // y a encore le focus) démarreraient un compte à rebours dans le dos de
  // l'utilisateur encore présent.
  const handleInteraction = isPast
    ? undefined
    : () => {
        if (mouseInsideRef.current || focusInsideRef.current) return;
        onLingerArm(event.id);
      };

  return (
    <Card
      onPointerEnter={handlePointerEnter}
      onFocus={handleFocus}
      onPointerLeave={handlePointerLeave}
      onBlur={handleBlur}
      onPointerDown={handleInteraction}
      onClick={handleInteraction}
      onChange={handleInteraction}
      className={cn(
        "flex flex-col overflow-hidden border-l-4 transition-colors",
        !answered && deadlineInfo.tone === "danger"
          ? "border-l-red-500 bg-red-50/40 dark:bg-red-950/10"
          : !answered
            ? "border-l-amber-400 bg-amber-50/40 dark:bg-amber-950/10"
            : "border-l-gray-200 dark:border-l-gray-700"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-bold leading-tight text-gray-900 dark:text-gray-100">
              {event.title}
            </h2>
            <p className="mt-1 text-sm capitalize text-gray-600 dark:text-gray-400">
              {formatDateFrench(event.date)}
              {event.time && <> · {event.time}</>}
            </p>
          </div>
          <StatusPill status={status} />
        </div>

        {(event.location || event.address) && (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {event.location}
              {event.location && event.address && " — "}
              {event.address}
            </span>
          </p>
        )}

        <p
          className={cn(
            "mt-2 inline-flex w-fit items-center gap-1.5 text-xs font-medium",
            deadlineInfo.tone === "danger"
              ? "text-red-600 dark:text-red-400"
              : deadlineInfo.tone === "warning"
                ? "text-amber-700 dark:text-amber-400"
                : "text-gray-500 dark:text-gray-400"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {deadlineInfo.label}
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-0">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => submit("present")}
            disabled={isPast || pendingAction !== null}
            aria-pressed={status === "present"}
            className={cn(
              "flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70",
              status === "present"
                ? "border-green-500 bg-green-500 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-green-900/20 disabled:hover:border-gray-200 disabled:hover:bg-white dark:disabled:hover:bg-gray-900"
            )}
          >
            {pendingAction === "present" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Présent
          </button>
          <button
            type="button"
            onClick={() => submit("absent")}
            disabled={isPast || pendingAction !== null}
            aria-pressed={status === "absent"}
            className={cn(
              "flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70",
              status === "absent"
                ? "border-red-500 bg-red-500 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-red-400 hover:bg-red-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-red-900/20 disabled:hover:border-gray-200 disabled:hover:bg-white dark:disabled:hover:bg-gray-900"
            )}
          >
            {pendingAction === "absent" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Absent
          </button>
        </div>

        {/* Action rare et corrective : délibérément discrète (texte muted, pas de
            bordure ni de couleur pleine) pour ne jamais rivaliser visuellement avec
            Présent/Absent. N'existe que s'il y a effectivement une réponse à effacer. */}
        {answered && !isPast && (
          <div className="mt-2">
            {confirmingClear ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Votre commentaire sera aussi supprimé.</span>
                <div className="ml-auto flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(false)}
                    className="font-medium underline-offset-2 hover:underline"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => submit(null)}
                    disabled={pendingAction !== null}
                    className="font-semibold text-red-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-70 dark:text-red-400"
                  >
                    {pendingAction === "clear" ? "Suppression…" : "Confirmer"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (event.response.comment ? setConfirmingClear(true) : submit(null))}
                disabled={pendingAction !== null}
                className="inline-flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <Undo2 className="h-3 w-3" aria-hidden="true" />
                Effacer ma réponse
              </button>
            )}
          </div>
        )}

        <div className="mt-2 min-h-[18px]">
          {isPast ? (
            <p className="flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
              <Lock className="h-3.5 w-3.5" />
              Prestation passée : les réponses ne sont plus modifiables.
            </p>
          ) : (
            <>
              {saveState === "saved" && (
                <p className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                  <Check className="h-3.5 w-3.5" />
                  {lastSavedAction === "clear" ? "Réponse effacée" : "Réponse enregistrée"}
                </p>
              )}
              {saveState === "error" && (
                <p className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {errorMessage}
                </p>
              )}
            </>
          )}
        </div>

        {/* Une prestation passée n'accepte plus aucune écriture (commentaire compris) : on
            n'affiche donc jamais le formulaire d'édition, seulement le commentaire déjà
            enregistré s'il y en a un. */}
        {isPast ? (
          event.response.comment && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{event.response.comment}</span>
            </p>
          )
        ) : (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setCommentOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {event.response.comment ? "Modifier mon commentaire" : "Ajouter un commentaire"}
              <ChevronDown
                className={cn("h-3 w-3 transition-transform", commentOpen && "rotate-180")}
              />
            </button>

            {commentOpen && (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                  maxLength={1000}
                  placeholder="Un mot pour l'équipe (facultatif)"
                  className="min-h-[80px] text-sm"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">
                    {comment.length}/1000
                  </span>
                  {answered ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => submit(status)}
                      disabled={pendingAction !== null || !commentDirty}
                    >
                      Enregistrer le commentaire
                    </Button>
                  ) : (
                    <span className="text-[11px] text-gray-400 dark:text-gray-500">
                      Envoyé avec votre réponse
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MusicianRow {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  primaryInstrument: string | null;
  isCurrentUser: boolean;
  statuses: Map<number, PresenceStatus | null>;
}

/** Construit une ligne par musicien à partir des rosters de tous les événements, en
 * conservant l'ordre d'apparition fourni par l'API (déjà groupé par pupitre). Le
 * regroupement par pupitre visible dans le tableau est fait séparément par
 * `groupMembersByPupitre`, à partir de ces lignes. */
function buildMusicianRows(events: PresenceEvent[], currentUserId: number | null): MusicianRow[] {
  const order: number[] = [];
  const info = new Map<
    number,
    {
      firstName: string | null;
      lastName: string | null;
      instruments: string[];
      primaryInstrument: string | null;
    }
  >();
  const statuses = new Map<number, Map<number, PresenceStatus | null>>();

  for (const event of events) {
    for (const member of event.roster) {
      if (!info.has(member.userId)) {
        info.set(member.userId, {
          firstName: member.firstName,
          lastName: member.lastName,
          instruments: member.instruments,
          primaryInstrument: member.primaryInstrument,
        });
        order.push(member.userId);
      }
      let byEvent = statuses.get(member.userId);
      if (!byEvent) {
        byEvent = new Map<number, PresenceStatus | null>();
        statuses.set(member.userId, byEvent);
      }
      byEvent.set(event.id, member.status);
    }
  }

  return order.map((userId) => {
    const details = info.get(userId);
    return {
      userId,
      firstName: details?.firstName ?? null,
      lastName: details?.lastName ?? null,
      instruments: details?.instruments ?? [],
      primaryInstrument: details?.primaryInstrument ?? null,
      isCurrentUser: userId === currentUserId,
      statuses: statuses.get(userId) ?? new Map<number, PresenceStatus | null>(),
    };
  });
}

interface CellVisual {
  Icon: LucideIcon;
  label: string;
  shapeClass: string;
}

/** Les trois états se distinguent par la forme ET l'icône, pas seulement la couleur :
 * cercle plein + coche pour présent, carré plein + croix pour absent, cercle en
 * pointillés + tiret pour sans réponse. */
function getCellVisual(status: PresenceStatus | null): CellVisual {
  if (status === "present") {
    return {
      Icon: Check,
      label: "Présent",
      shapeClass: "rounded-full bg-green-500 text-white shadow-sm",
    };
  }
  if (status === "absent") {
    return {
      Icon: X,
      label: "Absent",
      shapeClass: "rounded-md bg-red-500 text-white shadow-sm",
    };
  }
  return {
    Icon: Minus,
    label: "Sans réponse",
    shapeClass:
      "rounded-full border-2 border-dashed border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500",
  };
}

function LegendItem({
  shapeClass,
  Icon,
  label,
}: {
  shapeClass: string;
  Icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center", shapeClass)}>
        <Icon className="h-3 w-3" aria-hidden="true" />
      </span>
      {label}
    </span>
  );
}

interface PresenceMatrixProps {
  events: PresenceEvent[];
  currentUserId: number | null;
  onEditResponse: (eventId: number) => void;
}

function PresenceMatrix({ events, currentUserId, onEditResponse }: PresenceMatrixProps) {
  const rows = useMemo(() => buildMusicianRows(events, currentUserId), [events, currentUserId]);
  const groups = useMemo(() => groupMembersByPupitre(rows), [rows]);

  const stickyCell =
    "sticky left-0 z-10 min-w-[128px] max-w-[180px] px-3 py-2 text-left align-top shadow-[3px_0_6px_-3px_rgba(0,0,0,0.15)]";

  return (
    <section aria-labelledby="presence-matrix-heading" className="space-y-3">
      <div>
        <h2
          id="presence-matrix-heading"
          className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100"
        >
          Qui vient à quelle date
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Votre ligne porte le badge « Vous »
          {currentUserId !== null && ", modifiable grâce à l'icône crayon"}.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-600 dark:bg-gray-800/40 dark:text-gray-300">
        <LegendItem
          shapeClass="rounded-full bg-green-500 text-white"
          Icon={Check}
          label="Présent"
        />
        <LegendItem shapeClass="rounded-md bg-red-500 text-white" Icon={X} label="Absent" />
        <LegendItem
          shapeClass="rounded-full border-2 border-dashed border-gray-400 text-gray-400 dark:border-gray-500 dark:text-gray-500"
          Icon={Minus}
          label="Sans réponse"
        />
        {currentUserId !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-gray-300 dark:bg-gray-900 dark:ring-gray-600">
              <Pencil className="h-3 w-3 text-gray-500" aria-hidden="true" />
            </span>
            Modifier votre réponse
          </span>
        )}
      </div>

      {/* `contain:paint` est indispensable ici : une <table> en `min-width:max-content`
          reste comptée dans la largeur de défilement du document malgré le
          `overflow-x-auto` du conteneur, ce qui faisait défiler la page entière en 375px
          (mesuré : 736px de large pour un écran de 375px). Vérifié : sans lui 736, avec lui 375. */}
      <div className="overflow-x-auto overscroll-x-contain [contain:paint] rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th scope="col" className={cn(stickyCell, "bg-gray-50 dark:bg-gray-800/60")}>
                Musicien
              </th>
              {events.map((event) => (
                <th
                  key={event.id}
                  scope="col"
                  className="min-w-[92px] bg-gray-50 px-2 py-2 text-center align-bottom dark:bg-gray-800/60"
                >
                  <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatDateShortLabel(event.date)}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-normal leading-snug text-gray-500 dark:text-gray-400">
                    {event.title}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.key}>
              <tr>
                {/* `scope="rowgroup"` : cette cellule décrit les lignes qui suivent, jusqu'au
                    prochain en-tête de groupe — c'est la sémantique exacte d'un titre de
                    pupitre. Même pattern que `src/app/admin/PresenceAdmin.tsx`.
                    Le <th> lui-même n'est PAS sticky : en `colSpan`, il occupe déjà toute la
                    largeur du tableau, donc son bloc conteneur n'a nulle part où le décaler —
                    l'offset se clampe à 0 et l'étiquette défilerait avec le reste (vérifié :
                    elle finissait à −79px). C'est le <span> interne, plus étroit que son
                    conteneur, qui est sticky : lui a de la place pour glisser vers la gauche
                    pendant le défilement. Les deux portent le même fond pour que le libellé se
                    fonde dans la bande de couleur, qui elle reste dans le flux normal. */}
                <th
                  scope="rowgroup"
                  colSpan={events.length + 1}
                  className="border-b border-t border-gray-200 bg-gray-100/80 p-0 text-left dark:border-gray-700 dark:bg-gray-800/60"
                >
                  <span className="sticky left-0 z-10 inline-block max-w-[80vw] truncate whitespace-nowrap bg-gray-100/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:bg-gray-800/60 dark:text-gray-300">
                    {group.label}
                    <span className="ml-1.5 font-normal normal-case text-gray-400 dark:text-gray-500">
                      ({group.members.length})
                    </span>
                  </span>
                </th>
              </tr>
              {group.members.map((row, index) => {
                const rowTint = row.isCurrentUser
                  ? "bg-primary/10 dark:bg-primary/15"
                  : index % 2 === 1
                    ? "bg-gray-50/70 dark:bg-gray-800/20"
                    : "bg-white dark:bg-gray-900";
                return (
                  <tr
                    key={row.userId}
                    className={cn(
                      "border-b border-gray-100 last:border-0 dark:border-gray-800",
                      rowTint
                    )}
                  >
                    <th scope="row" className={cn(stickyCell, rowTint)}>
                      <span className="flex flex-wrap items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100">
                        {getFullName(row.firstName, row.lastName)}
                        {row.isCurrentUser && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                            Vous
                          </span>
                        )}
                      </span>
                      {row.instruments.length > 0 && (
                        <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                          {row.instruments.join(", ")}
                        </span>
                      )}
                    </th>
                    {events.map((event) => {
                      const status = row.statuses.get(event.id) ?? null;
                      const visual = getCellVisual(status);

                      if (row.isCurrentUser) {
                        // Une prestation passée reste consultable, mais plus modifiable : le
                        // libellé et l'icône de coin ne doivent jamais promettre une édition
                        // qui échouerait (le serveur refuse le POST). Le clic ouvre malgré
                        // tout la carte, qui explique pourquoi c'est fermé.
                        const cellIsPast = isEventPast(event.date);
                        const label = cellIsPast
                          ? `Voir votre réponse pour ${event.title} du ${formatDateShortLabel(event.date)} (prestation passée), actuellement : ${visual.label.toLowerCase()}`
                          : `Modifier votre réponse pour ${event.title} du ${formatDateShortLabel(event.date)}, actuellement : ${visual.label.toLowerCase()}`;
                        return (
                          <td key={event.id} className="px-1.5 py-1.5 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => onEditResponse(event.id)}
                              title={label}
                              aria-label={label}
                              className={cn(
                                "relative mx-auto flex min-h-11 min-w-11 items-center justify-center transition-transform active:scale-95",
                                visual.shapeClass
                              )}
                            >
                              <visual.Icon className="h-4 w-4" aria-hidden="true" />
                              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-gray-300 dark:bg-gray-900 dark:ring-gray-600">
                                {cellIsPast ? (
                                  <Lock className="h-2.5 w-2.5 text-gray-500" aria-hidden="true" />
                                ) : (
                                  <Pencil
                                    className="h-2.5 w-2.5 text-gray-500"
                                    aria-hidden="true"
                                  />
                                )}
                              </span>
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td key={event.id} className="px-1.5 py-1.5 text-center align-middle">
                          <span
                            className={cn(
                              "mx-auto flex h-8 w-8 items-center justify-center",
                              visual.shapeClass
                            )}
                          >
                            <visual.Icon className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">{visual.label}</span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}

export function MusicianDisponibilites() {
  const [events, setEvents] = useState<PresenceEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [openEventId, setOpenEventId] = useState<number | null>(null);
  // La fenêtre "passé/à venir" est décidée par le serveur (rolling 12 mois) : on ne
  // fait ici que lui transmettre l'intention, jamais de calcul de date côté client.
  const [showPast, setShowPast] = useState(false);
  // Cartes "en sursis" : une réponse vient d'être enregistrée mais la carte reste
  // affichée encore un instant (voir `armLinger`/`cancelLinger` ci-dessous), pour ne
  // pas la faire disparaître sous le doigt/curseur du musicien qui vient de répondre.
  const [lingeringIds, setLingeringIds] = useState<Set<number>>(new Set());
  const focusedCardRef = useRef<HTMLDivElement | null>(null);
  // Un minuteur par carte, jamais un seul minuteur partagé : sinon l'interaction
  // avec une carte annulerait ou relancerait le sursis d'une autre.
  const lingerTimersRef = useRef<Map<number, number>>(new Map());

  const fetchData = useCallback(async (includePast: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/musician/presence${includePast ? "?includePast=1" : ""}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des prestations.");
      }
      const result = (await response.json()) as PresenceApiResponse;
      setEvents(result.events);
      // L'identifiant de l'utilisateur connecté vient de la même réponse : il est
      // dérivé de la session côté serveur. Un appel séparé à /api/musician/profile
      // ferait disparaître silencieusement la mise en avant et l'icône d'édition
      // de sa propre ligne s'il échouait.
      setCurrentUserId(result.currentUserId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(showPast);
  }, [showPast, fetchData]);

  useEffect(() => {
    if (openEventId === null) return;
    focusedCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [openEventId]);

  useEffect(() => {
    const timers = lingerTimersRef.current;
    return () => {
      timers.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timers.clear();
    };
  }, []);

  const handleUpdate = useCallback((updatedEvent: PresenceEvent) => {
    setEvents((prev) =>
      prev ? prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)) : prev
    );
  }, []);

  const handleEditResponse = useCallback((eventId: number) => {
    setOpenEventId(eventId);
  }, []);

  /** Démarre (ou relance) le délai de 3 s avant que la carte ne quitte la liste. */
  const armLinger = useCallback((eventId: number) => {
    const timers = lingerTimersRef.current;
    const existing = timers.get(eventId);
    if (existing !== undefined) window.clearTimeout(existing);
    const timeoutId = window.setTimeout(() => {
      timers.delete(eventId);
      setLingeringIds((prev) => {
        if (!prev.has(eventId)) return prev;
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }, LINGER_DELAY_MS);
    timers.set(eventId, timeoutId);
  }, []);

  /** Annule le délai en cours pour cette carte, sans toucher aux autres. */
  const cancelLinger = useCallback((eventId: number) => {
    const timers = lingerTimersRef.current;
    const existing = timers.get(eventId);
    if (existing !== undefined) {
      window.clearTimeout(existing);
      timers.delete(eventId);
    }
  }, []);

  const handleStatusChanged = useCallback(
    (eventId: number, status: PresenceStatus | null) => {
      if (status === null) {
        // Réponse effacée : plus rien à laisser en sursis pour cette carte, elle
        // reste visible de toute façon puisqu'elle redevient "sans réponse".
        cancelLinger(eventId);
        setLingeringIds((prev) => {
          if (!prev.has(eventId)) return prev;
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
        return;
      }
      setLingeringIds((prev) => (prev.has(eventId) ? prev : new Set(prev).add(eventId)));
    },
    [cancelLinger]
  );

  // Premier chargement : aucune donnée à montrer, la page entière est un état de
  // chargement. Bascule ultérieure du filtre passé/à venir : on garde l'affichage
  // existant et on se contente d'un indicateur discret (cf. `isRefreshing` plus bas),
  // pour ne pas faire clignoter toute la vue en squelette.
  const isInitialLoad = loading && events === null;
  const isRefreshing = loading && events !== null;

  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error && events === null) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
        <div className="rounded-full bg-red-50 p-4 dark:bg-red-900/20">
          <Calendar className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-lg font-medium text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={() => fetchData(showPast)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  // Les prestations passées répondent "non" au serveur pour tout POST : leurs
  // cartes sont donc en lecture seule (voir `isPast` dans PresenceCard) et ne
  // comptent pas comme "en attente de réponse", puisque l'utilisateur ne peut plus
  // agir dessus.
  const unansweredCount = (events ?? []).filter(
    (e) => e.response.status === null && !isEventPast(e.date)
  ).length;
  const visibleEvents = (events ?? []).filter(
    (e) => e.response.status === null || e.id === openEventId || lingeringIds.has(e.id)
  );
  // Le même critère que `unansweredCount` sépare la liste en deux : la file "à
  // répondre" (jamais de prestation passée, par construction) et une zone de
  // consultation à part pour ce que le bouton "Prestations passées" a révélé. Sans
  // cette séparation, une prestation passée sans réponse se mêlait aux cartes en
  // attente alors même que le compteur ne la comptait pas — le compteur et la
  // liste se contredisaient visuellement.
  const pendingEvents = visibleEvents.filter((e) => !isEventPast(e.date));
  const revealedPastEvents = visibleEvents.filter((e) => isEventPast(e.date));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Mes prestations</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {events && events.length > 0
              ? unansweredCount > 0
                ? `${unansweredCount} prestation${unansweredCount > 1 ? "s" : ""} en attente de votre réponse`
                : "Vous avez répondu pour toutes les prestations à venir"
              : "Indiquez votre présence pour chaque prestation"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRefreshing && (
            <Loader2
              className="h-3.5 w-3.5 animate-spin text-gray-400 dark:text-gray-500"
              aria-hidden="true"
            />
          )}
          <Switch
            id="show-past-events"
            checked={showPast}
            onCheckedChange={setShowPast}
            disabled={isRefreshing}
          />
          <Label
            htmlFor="show-past-events"
            className="flex cursor-pointer items-center gap-1.5 text-sm font-normal text-gray-500 dark:text-gray-400"
          >
            <History className="h-3.5 w-3.5" />
            Prestations passées
          </Label>
        </div>
      </div>

      {error && events !== null && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchData(showPast)}
            className="inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer
          </button>
        </div>
      )}

      <div
        className={cn(isRefreshing && "pointer-events-none opacity-60 transition-opacity")}
        aria-busy={isRefreshing}
      >
        {!events || events.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-10 w-10" />}
            title={
              showPast
                ? "Aucune prestation sur les 12 derniers mois."
                : "Aucune prestation ne nécessite votre réponse pour le moment."
            }
            description="Revenez ici dès qu'une nouvelle date sera annoncée."
          />
        ) : (
          <div className="space-y-6">
            {pendingEvents.length > 0 ? (
              <div className="space-y-4">
                {pendingEvents.map((event) => (
                  <div key={event.id} ref={event.id === openEventId ? focusedCardRef : undefined}>
                    <PresenceCard
                      event={event}
                      onUpdate={handleUpdate}
                      onStatusChanged={handleStatusChanged}
                      onLingerArm={armLinger}
                      onLingerCancel={cancelLinger}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3.5 text-sm font-medium text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300">
                <Check className="h-5 w-5 shrink-0" />
                Vous avez répondu à toutes les prestations à venir. Le tableau ci-dessous récapitule
                qui vient.
              </div>
            )}

            {/* Zone à part, jamais mêlée à la file "à répondre" ci-dessus : ce sont des
                prestations révélées par le bouton "Prestations passées", pas des cartes en
                attente — le compteur d'en-tête ne les compte déjà plus, la mise en page doit
                le confirmer plutôt que le contredire. */}
            {revealedPastEvents.length > 0 && (
              <section
                aria-labelledby="past-events-heading"
                className="space-y-3 border-t border-dashed border-gray-200 pt-4 dark:border-gray-700"
              >
                <div>
                  <h2
                    id="past-events-heading"
                    className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 dark:text-gray-300"
                  >
                    <History className="h-4 w-4" aria-hidden="true" />
                    Prestations passées
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                    Terminées : elles ne sont plus comptées ni modifiables.
                  </p>
                </div>
                <div className="space-y-4">
                  {revealedPastEvents.map((event) => (
                    <div key={event.id} ref={event.id === openEventId ? focusedCardRef : undefined}>
                      <PresenceCard
                        event={event}
                        onUpdate={handleUpdate}
                        onStatusChanged={handleStatusChanged}
                        onLingerArm={armLinger}
                        onLingerCancel={cancelLinger}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <PresenceMatrix
              events={events}
              currentUserId={currentUserId}
              onEditResponse={handleEditResponse}
            />
          </div>
        )}
      </div>
    </div>
  );
}
