"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Mail,
  MailPlus,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  Ticket,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button, buttonVariants } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
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
import { EmptyState } from "@/app/components/ui/empty-state";
import { Input } from "@/app/components/ui/input";
import { Pagination } from "@/app/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { FREE_EVENTS, getFreeEvent } from "@/lib/free-events";
import type { FreeEventConfig, FreeEventOption } from "@/lib/free-events";
import { cn } from "@/lib/utils";
import { ReservationFormDialog } from "./ReservationFormDialog";
import {
  ANONYMIZED_LABEL,
  compareByName,
  formatDateTimeFr,
  formatPlaces,
  getConfirmationState,
  matchesSearch,
  parseDbDate,
  readApiError,
} from "./reservations-utils";
import type {
  AdminReservation,
  BreakdownEntry,
  ReservationsPayload,
  ReservationStats,
} from "./reservations-utils";

export { ReservationsPrintClient } from "./ReservationsPrintAdmin";

type StatusFilter = "active" | "cancelled" | "all";
type SortKey = "recent" | "oldest" | "name-asc" | "name-desc" | "places";
type ExportType = "attendees" | "contacts" | "newsletter";

type PendingAction =
  | { kind: "cancel"; reservation: AdminReservation }
  | { kind: "reactivate"; reservation: AdminReservation }
  | { kind: "delete"; reservation: AdminReservation; step: 1 | 2 }
  | { kind: "anonymize"; count: number };

interface Notice {
  type: "success" | "error";
  text: string;
}

const API = "/api/admin/reservations";

const EXPORTS: {
  type: ExportType;
  label: string;
  help: string;
  filename: string;
}[] = [
  {
    type: "attendees",
    label: "Liste d'entrée (Excel)",
    help: "Nom, prénom et places, à ouvrir dans Excel.",
    filename: "liste-entree",
  },
  {
    type: "contacts",
    label: "Contacts pour Mailchimp",
    help: "Toutes les personnes ayant laissé un e-mail, pour envoyer à la main le rappel ou le remerciement.",
    filename: "contacts-mailchimp",
  },
  {
    type: "newsletter",
    label: "Inscrits newsletter (Mailchimp)",
    help: "Uniquement les personnes qui ont accepté de recevoir nos prochaines dates.",
    filename: "inscrits-newsletter",
  },
];

function isReservationsPayload(value: unknown): value is ReservationsPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Partial<ReservationsPayload>;
  return typeof v.stats === "object" && v.stats !== null && Array.isArray(v.reservations);
}

function sortReservations(list: AdminReservation[], sort: SortKey): AdminReservation[] {
  const copy = [...list];
  const byDate = (a: AdminReservation, b: AdminReservation) =>
    parseDbDate(a.createdAt).getTime() - parseDbDate(b.createdAt).getTime() || a.id - b.id;
  switch (sort) {
    case "recent":
      return copy.sort((a, b) => byDate(b, a));
    case "oldest":
      return copy.sort(byDate);
    case "name-asc":
      return copy.sort(compareByName);
    case "name-desc":
      return copy.sort((a, b) => compareByName(b, a));
    case "places":
      return copy.sort((a, b) => b.partySize - a.partySize || compareByName(a, b));
  }
}

function buildBreakdownRows(
  options: FreeEventOption[],
  data: Record<string, BreakdownEntry>,
  noneLabel?: string
) {
  const known = new Set(options.map((o) => o.code));
  const rows = options.map((o) => ({
    key: o.code,
    label: o.label,
    reservations: data[o.code]?.reservations ?? 0,
    places: data[o.code]?.places ?? 0,
  }));
  for (const [code, entry] of Object.entries(data)) {
    if (known.has(code)) continue;
    if (code === "none" && entry.reservations === 0) continue;
    rows.push({
      key: code,
      label: code === "none" ? (noneLabel ?? "Non renseigné") : code,
      reservations: entry.reservations,
      places: entry.places,
    });
  }
  return rows.sort((a, b) => b.places - a.places || b.reservations - a.reservations);
}

/* ------------------------------------------------------------------ */
/* Petits éléments d'interface                                         */
/* ------------------------------------------------------------------ */

function StatTile({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "default" | "muted";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4 pt-4 sm:gap-4 sm:p-5">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11",
            tone === "default" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none tabular-nums text-foreground sm:text-3xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function BreakdownCard({
  title,
  hint,
  rows,
}: {
  title: string;
  hint?: string;
  rows: { key: string; label: string; reservations: number; places: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.places));
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={cn("min-w-0", row.places === 0 && "text-muted-foreground")}>
                  {row.label}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  <strong className="font-semibold text-foreground">{row.places}</strong>{" "}
                  {row.places > 1 ? "places" : "place"} · {row.reservations} rés.
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-500"
                  style={{ width: `${(row.places / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function ConfirmationBadge({ reservation }: { reservation: AdminReservation }) {
  const state = getConfirmationState(reservation);
  if (state === "sent") {
    return (
      <Badge
        variant="success"
        title={`Envoyée le ${formatDateTimeFr(reservation.confirmationSentAt ?? "")}`}
      >
        Envoyée
      </Badge>
    );
  }
  if (state === "error") {
    return (
      <Badge variant="destructive" title={reservation.confirmationError ?? undefined}>
        Erreur
      </Badge>
    );
  }
  return (
    <span className="text-muted-foreground" aria-label="Aucune confirmation envoyée">
      —
    </span>
  );
}

interface RowActionsProps {
  reservation: AdminReservation;
  busy: boolean;
  labels: boolean;
  onEdit: (r: AdminReservation) => void;
  onToggleStatus: (r: AdminReservation) => void;
  onResend: (r: AdminReservation) => void;
  onDelete: (r: AdminReservation) => void;
}

function RowActions({
  reservation: r,
  busy,
  labels,
  onEdit,
  onToggleStatus,
  onResend,
  onDelete,
}: RowActionsProps) {
  const anonymized = Boolean(r.anonymizedAt);
  const canResend = r.status === "active" && Boolean(r.email) && !anonymized;
  const name = anonymized ? ANONYMIZED_LABEL : [r.firstName, r.lastName].filter(Boolean).join(" ");
  const size = labels ? "sm" : "icon";
  const iconClass = "h-4 w-4";
  const btn = (
    label: string,
    icon: React.ReactNode,
    onClick: () => void,
    opts: { disabled?: boolean; danger?: boolean } = {}
  ) => (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={cn(
        !labels && "h-8 w-8",
        opts.danger && "text-destructive hover:bg-destructive/10 hover:text-destructive"
      )}
      onClick={onClick}
      disabled={busy || opts.disabled}
      aria-label={`${label} — ${name}`}
      title={label}
    >
      {icon}
      {labels && <span className="ml-1.5">{label}</span>}
    </Button>
  );

  return (
    <div className={cn("flex gap-1.5", labels ? "flex-wrap" : "justify-end")}>
      {btn("Modifier", <Pencil className={iconClass} aria-hidden="true" />, () => onEdit(r), {
        disabled: anonymized,
      })}
      {btn(
        "Renvoyer la confirmation",
        <Send className={iconClass} aria-hidden="true" />,
        () => onResend(r),
        { disabled: !canResend }
      )}
      {r.status === "active"
        ? btn("Annuler", <Ban className={iconClass} aria-hidden="true" />, () => onToggleStatus(r))
        : btn("Réactiver", <RotateCcw className={iconClass} aria-hidden="true" />, () =>
            onToggleStatus(r)
          )}
      {btn("Supprimer", <Trash2 className={iconClass} aria-hidden="true" />, () => onDelete(r), {
        danger: true,
      })}
    </div>
  );
}

function NameCell({ reservation: r }: { reservation: AdminReservation }) {
  if (r.anonymizedAt || (!r.lastName && !r.firstName)) {
    return <span className="italic text-muted-foreground">{ANONYMIZED_LABEL}</span>;
  }
  return <>{r.lastName}</>;
}

/* ------------------------------------------------------------------ */
/* Écran principal                                                     */
/* ------------------------------------------------------------------ */

export function ReservationsAdminClient() {
  const [eventSlug, setEventSlug] = useState<string>(FREE_EVENTS[0]?.slug ?? "");
  const event: FreeEventConfig | undefined = getFreeEvent(eventSlug);

  const [data, setData] = useState<ReservationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const requestId = useRef(0);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [sort, setSort] = useState<SortKey>("recent");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminReservation | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [resendingFailed, setResendingFailed] = useState(false);
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [anonymizing, setAnonymizing] = useState(false);

  const load = useCallback(
    async (silent: boolean) => {
      if (!eventSlug) return;
      const current = ++requestId.current;
      if (silent) setRefreshing(true);
      else setLoading(true);
      try {
        const response = await fetch(`${API}?eventSlug=${encodeURIComponent(eventSlug)}`, {
          cache: "no-store",
        });
        if (current !== requestId.current) return;
        if (!response.ok) {
          setLoadError(await readApiError(response, "Impossible de charger les réservations."));
          return;
        }
        const body: unknown = await response.json();
        if (current !== requestId.current) return;
        if (!isReservationsPayload(body)) {
          setLoadError("La réponse du serveur est incomplète. Rechargez la page.");
          return;
        }
        setData(body);
        setLoadError(null);
      } catch {
        if (current === requestId.current) {
          setLoadError("Connexion impossible. Vérifiez votre réseau puis réessayez.");
        }
      } finally {
        if (current === requestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [eventSlug]
  );

  useEffect(() => {
    setData(null);
    setPage(1);
    void load(false);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sort]);

  const notify = (type: Notice["type"], text: string) => setNotice({ type, text });

  /** Appel d'écriture : affiche le résultat, puis recharge les données depuis le serveur. */
  const runMutation = async (
    id: number | null,
    request: () => Promise<Response>,
    successMessage: string,
    errorFallback: string
  ) => {
    setBusyId(id);
    setNotice(null);
    try {
      const response = await request();
      if (!response.ok) {
        notify("error", await readApiError(response, errorFallback));
        return false;
      }
      notify("success", successMessage);
      await load(true);
      return true;
    } catch {
      notify("error", "Connexion impossible. Vérifiez votre réseau puis réessayez.");
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleStatus = (r: AdminReservation) =>
    setPending({ kind: r.status === "active" ? "cancel" : "reactivate", reservation: r });

  const handleResend = async (r: AdminReservation) => {
    await runMutation(
      r.id,
      () => fetch(`${API}?action=resend&id=${r.id}`, { method: "POST" }),
      `Confirmation renvoyée à ${r.email ?? "la personne"}.`,
      "L'e-mail n'a pas pu être envoyé."
    );
  };

  const handleResendFailed = async () => {
    setResendingFailed(true);
    setNotice(null);
    try {
      const response = await fetch(
        `${API}?action=resend-failed&eventSlug=${encodeURIComponent(eventSlug)}`,
        { method: "POST" }
      );
      if (!response.ok) {
        notify("error", await readApiError(response, "Le renvoi a échoué."));
        return;
      }
      const body: unknown = await response.json();
      const sent =
        typeof body === "object" && body !== null && "sent" in body
          ? Number((body as { sent: unknown }).sent)
          : 0;
      const failed =
        typeof body === "object" && body !== null && "failed" in body
          ? Number((body as { failed: unknown }).failed)
          : 0;
      notify(
        failed > 0 ? "error" : "success",
        `${sent} confirmation${sent > 1 ? "s" : ""} envoyée${sent > 1 ? "s" : ""}, ${failed} encore en échec.${
          failed > 0 ? " Vous pouvez relancer le renvoi." : ""
        }`
      );
      await load(true);
    } catch {
      notify("error", "Connexion impossible. Vérifiez votre réseau puis réessayez.");
    } finally {
      setResendingFailed(false);
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    const action = pending;
    setPending(null);
    if (action.kind === "cancel" || action.kind === "reactivate") {
      const status = action.kind === "cancel" ? "cancelled" : "active";
      await runMutation(
        action.reservation.id,
        () =>
          fetch(`${API}?id=${action.reservation.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }),
        action.kind === "cancel" ? "Réservation annulée." : "Réservation réactivée.",
        "La modification a échoué."
      );
    } else if (action.kind === "delete") {
      await runMutation(
        action.reservation.id,
        () => fetch(`${API}?id=${action.reservation.id}`, { method: "DELETE" }),
        "Réservation supprimée définitivement.",
        "La suppression a échoué."
      );
    } else {
      setAnonymizing(true);
      try {
        const response = await fetch(
          `${API}?action=anonymize&eventSlug=${encodeURIComponent(eventSlug)}`,
          { method: "POST" }
        );
        if (!response.ok) {
          notify("error", await readApiError(response, "L'anonymisation a échoué."));
          return;
        }
        const body: unknown = await response.json();
        const n =
          typeof body === "object" && body !== null && "anonymized" in body
            ? Number((body as { anonymized: unknown }).anonymized)
            : action.count;
        notify("success", `${n} réservation${n > 1 ? "s" : ""} anonymisée${n > 1 ? "s" : ""}.`);
        await load(true);
      } catch {
        notify("error", "Connexion impossible. Vérifiez votre réseau puis réessayez.");
      } finally {
        setAnonymizing(false);
      }
    }
  };

  const handleAnonymizeCheck = async () => {
    setAnonymizing(true);
    setNotice(null);
    try {
      const response = await fetch(
        `${API}?action=anonymize&eventSlug=${encodeURIComponent(eventSlug)}&dryRun=1`,
        { method: "POST" }
      );
      if (!response.ok) {
        notify("error", await readApiError(response, "Le calcul a échoué."));
        return;
      }
      const body: unknown = await response.json();
      const count =
        typeof body === "object" && body !== null && "count" in body
          ? Number((body as { count: unknown }).count)
          : 0;
      if (count <= 0) {
        notify("success", "Aucune réservation à anonymiser pour le moment.");
        return;
      }
      setPending({ kind: "anonymize", count });
    } catch {
      notify("error", "Connexion impossible. Vérifiez votre réseau puis réessayez.");
    } finally {
      setAnonymizing(false);
    }
  };

  const handleExport = async (item: (typeof EXPORTS)[number]) => {
    setExporting(item.type);
    setNotice(null);
    try {
      const response = await fetch(
        `${API}?action=export&type=${item.type}&eventSlug=${encodeURIComponent(eventSlug)}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        notify("error", await readApiError(response, "L'export a échoué."));
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${item.filename}-${eventSlug}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      notify("success", `Fichier « ${item.label} » téléchargé.`);
    } catch {
      notify("error", "Connexion impossible. Vérifiez votre réseau puis réessayez.");
    } finally {
      setExporting(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (r: AdminReservation) => {
    setEditing(r);
    setFormOpen(true);
  };

  const filtered = useMemo(() => {
    if (!data) return [];
    const list = data.reservations.filter(
      (r) => (statusFilter === "all" || r.status === statusFilter) && matchesSearch(r, search)
    );
    return sortReservations(list, sort);
  }, [data, search, statusFilter, sort]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize]
  );

  const stats: ReservationStats | null = data?.stats ?? null;
  const interestRows = useMemo(
    () => (event && stats ? buildBreakdownRows(event.form.interests, stats.byInterest) : []),
    [event, stats]
  );
  const sourceRows = useMemo(
    () => (event && stats ? buildBreakdownRows(event.form.sources, stats.bySource) : []),
    [event, stats]
  );

  if (!event) {
    return (
      <EmptyState
        icon={<Ticket className="h-12 w-12" />}
        title="Aucun événement à réservation"
        description="Aucun concert gratuit sur réservation n'est configuré."
      />
    );
  }

  const printHref = `/admin/reservations/impression?eventSlug=${encodeURIComponent(eventSlug)}`;
  const hasAnyReservation = (data?.reservations.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* En-tête */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Réservations gratuites
          </p>
          {FREE_EVENTS.length > 1 ? (
            <div className="mt-1 max-w-sm">
              <label htmlFor="reservations-event" className="sr-only">
                Événement
              </label>
              <Select value={eventSlug} onValueChange={setEventSlug}>
                <SelectTrigger id="reservations-event" className="h-11 text-base font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREE_EVENTS.map((e) => (
                    <SelectItem key={e.slug} value={e.slug}>
                      {e.title} — {e.dateShortLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">{event.title}</h1>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {event.dateLabel} · {event.placeLabel}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          <a href={printHref} className={cn(buttonVariants({ variant: "outline" }), "h-10 sm:h-9")}>
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
            Imprimer la liste d'entrée
          </a>
          <Button onClick={openCreate} className="h-10 sm:h-9">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Ajouter une réservation
          </Button>
        </div>
      </header>

      {/* Retours d'action */}
      <div aria-live="polite" role="status">
        {notice && (
          <div
            className={cn(
              "flex items-start gap-2 rounded-lg border px-4 py-3 text-sm",
              notice.type === "success"
                ? "border-success/30 bg-success/10 text-foreground"
                : "border-destructive/30 bg-destructive/10 text-foreground"
            )}
          >
            {notice.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1">{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Fermer
            </button>
          </div>
        )}
      </div>

      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{loadError}</span>
          <Button variant="outline" size="sm" onClick={() => void load(false)}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Réessayer
          </Button>
        </div>
      )}

      {loading && !data ? (
        <div className="space-y-6" aria-busy="true" aria-label="Chargement des réservations">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} variant="card" className="h-[84px]" />
            ))}
          </div>
          <Skeleton variant="card" className="h-48" />
          <Skeleton variant="card" className="h-64" />
        </div>
      ) : (
        data &&
        stats && (
          <>
            {/* Alerte confirmations en échec */}
            {stats.confirmationErrors > 0 && (
              <div
                role="alert"
                className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    className="mt-0.5 h-5 w-5 shrink-0 text-warning"
                    aria-hidden="true"
                  />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">
                      {stats.confirmationErrors} confirmation
                      {stats.confirmationErrors > 1 ? "s" : ""} par e-mail en échec
                    </p>
                    <p className="text-muted-foreground">
                      Ces personnes n'ont pas reçu leur e-mail. Le renvoi se fait par lots de 40.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => void handleResendFailed()}
                  disabled={resendingFailed}
                  className="shrink-0"
                >
                  {resendingFailed ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <MailPlus className="mr-2 h-4 w-4" aria-hidden="true" />
                  )}
                  Renvoyer les confirmations en échec
                </Button>
              </div>
            )}

            {/* Chiffres clés */}
            <section aria-label="Chiffres clés">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile
                  icon={<Ticket className="h-5 w-5" />}
                  label="Réservations"
                  value={stats.reservations}
                />
                <StatTile
                  icon={<Users className="h-5 w-5" />}
                  label="Places réservées"
                  value={stats.places}
                />
                <StatTile
                  icon={<Mail className="h-5 w-5" />}
                  label="Inscrits newsletter"
                  value={stats.newsletterOptIns}
                />
                <StatTile
                  icon={<Ban className="h-5 w-5" />}
                  label="Annulées"
                  value={stats.cancelled}
                  tone="muted"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Les chiffres comptent les réservations actives (hors annulées).
                {refreshing && " Mise à jour…"}
              </p>
            </section>

            {/* Répartitions */}
            <section aria-label="Répartitions" className="grid gap-4 lg:grid-cols-2">
              <BreakdownCard
                title={event.form.interestsLegend}
                hint="Plusieurs choix possibles : le total peut dépasser le nombre de réservations."
                rows={interestRows}
              />
              <BreakdownCard title={event.form.sourceLabel} rows={sourceRows} />
            </section>

            {/* Exports */}
            <section aria-label="Exports">
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                    <FileSpreadsheet className="h-4 w-4 text-primary" aria-hidden="true" />
                    Exports
                  </h2>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    {EXPORTS.map((item) => (
                      <div key={item.type} className="flex flex-col gap-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start whitespace-normal text-left"
                          onClick={() => void handleExport(item)}
                          disabled={exporting !== null}
                        >
                          {exporting === item.type ? (
                            <Loader2
                              className="mr-2 h-4 w-4 shrink-0 animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <Download className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
                          )}
                          {item.label}
                        </Button>
                        <p className="text-xs text-muted-foreground">{item.help}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Liste */}
            <section aria-label="Liste des réservations" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  Réservations{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    ({filtered.length}
                    {filtered.length !== data.reservations.length
                      ? ` sur ${data.reservations.length}`
                      : ""}
                    )
                  </span>
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void load(true)}
                  disabled={refreshing}
                  aria-label="Actualiser la liste"
                >
                  <RefreshCw
                    className={cn("h-4 w-4 sm:mr-2", refreshing && "animate-spin")}
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">Actualiser</span>
                </Button>
              </div>

              <Card>
                <CardContent className="grid gap-3 p-3 sm:p-4 md:grid-cols-[1fr_180px_220px]">
                  <div className="relative">
                    <Search
                      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      type="search"
                      placeholder="Rechercher un nom, un prénom, un e-mail…"
                      aria-label="Rechercher une réservation"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                  >
                    <SelectTrigger className="h-10" aria-label="Filtrer par statut">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actives</SelectItem>
                      <SelectItem value="cancelled">Annulées</SelectItem>
                      <SelectItem value="all">Toutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger className="h-10" aria-label="Trier la liste">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Plus récentes d'abord</SelectItem>
                      <SelectItem value="oldest">Plus anciennes d'abord</SelectItem>
                      <SelectItem value="name-asc">Nom (A → Z)</SelectItem>
                      <SelectItem value="name-desc">Nom (Z → A)</SelectItem>
                      <SelectItem value="places">Plus de places d'abord</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {filtered.length === 0 ? (
                <Card>
                  <CardContent className="p-0">
                    <EmptyState
                      icon={<Ticket className="h-12 w-12" />}
                      title={
                        hasAnyReservation
                          ? "Aucune réservation trouvée"
                          : "Aucune réservation pour le moment"
                      }
                      description={
                        hasAnyReservation
                          ? "Essayez de modifier la recherche ou le filtre."
                          : "Les réservations faites sur le site apparaîtront ici."
                      }
                    />
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Tableau (grands écrans) */}
                  <Card className="hidden xl:block">
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>Prénom</TableHead>
                            <TableHead>E-mail</TableHead>
                            <TableHead className="text-right">Places</TableHead>
                            <TableHead>Newsletter</TableHead>
                            <TableHead>Origine</TableHead>
                            <TableHead>Confirmation</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paged.map((r) => (
                            <TableRow
                              key={r.id}
                              className={cn(r.status === "cancelled" && "opacity-60")}
                            >
                              <TableCell className="font-medium">
                                <NameCell reservation={r} />
                                {r.status === "cancelled" && (
                                  <Badge variant="muted" className="ml-2">
                                    Annulée
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{r.firstName ?? "—"}</TableCell>
                              <TableCell
                                className="max-w-[220px] truncate"
                                title={r.email ?? undefined}
                              >
                                {r.email ?? <span className="text-muted-foreground">—</span>}
                              </TableCell>
                              <TableCell className="text-right font-semibold tabular-nums">
                                {r.partySize}
                              </TableCell>
                              <TableCell>
                                {r.newsletterOptIn ? (
                                  "Oui"
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {r.origin === "admin" ? "Bureau" : "Web"}
                              </TableCell>
                              <TableCell>
                                <ConfirmationBadge reservation={r} />
                              </TableCell>
                              <TableCell className="whitespace-nowrap text-muted-foreground">
                                {formatDateTimeFr(r.createdAt)}
                              </TableCell>
                              <TableCell>
                                <RowActions
                                  reservation={r}
                                  busy={busyId === r.id}
                                  labels={false}
                                  onEdit={openEdit}
                                  onToggleStatus={handleToggleStatus}
                                  onResend={(x) => void handleResend(x)}
                                  onDelete={(x) =>
                                    setPending({ kind: "delete", reservation: x, step: 1 })
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Cartes (téléphone et tablette) */}
                  <ul className="space-y-3 xl:hidden">
                    {paged.map((r) => (
                      <li
                        key={r.id}
                        className={cn(
                          "rounded-xl border border-border bg-card p-4 shadow-sm",
                          r.status === "cancelled" && "opacity-70"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">
                              <NameCell reservation={r} />
                              {r.firstName && ` ${r.firstName}`}
                            </p>
                            <p className="break-all text-sm text-muted-foreground">
                              {r.email ?? "Pas d'e-mail"}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-2xl font-bold leading-none tabular-nums text-foreground">
                              {r.partySize}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {r.partySize > 1 ? "places" : "place"}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          {r.status === "cancelled" && <Badge variant="muted">Annulée</Badge>}
                          {getConfirmationState(r) === "sent" && (
                            <Badge variant="success">Confirmation envoyée</Badge>
                          )}
                          {getConfirmationState(r) === "error" && (
                            <Badge variant="destructive">Erreur d'envoi</Badge>
                          )}
                          {r.newsletterOptIn && <Badge variant="primary">Newsletter</Badge>}
                          <Badge variant="muted">
                            {r.origin === "admin" ? "Saisie Bureau" : "Site web"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Reçue le {formatDateTimeFr(r.createdAt)}
                        </p>
                        <div className="mt-3 border-t border-border pt-3">
                          <RowActions
                            reservation={r}
                            busy={busyId === r.id}
                            labels
                            onEdit={openEdit}
                            onToggleStatus={handleToggleStatus}
                            onResend={(x) => void handleResend(x)}
                            onDelete={(x) =>
                              setPending({ kind: "delete", reservation: x, step: 1 })
                            }
                          />
                        </div>
                      </li>
                    ))}
                  </ul>

                  <Card>
                    <CardContent className="p-0">
                      <Pagination
                        totalItems={filtered.length}
                        currentPage={page}
                        pageSize={pageSize}
                        onPageChange={setPage}
                        onPageSizeChange={(size) => {
                          setPageSize(size);
                          setPage(1);
                        }}
                      />
                    </CardContent>
                  </Card>
                </>
              )}
            </section>

            {/* Données personnelles */}
            <section aria-label="Données personnelles" className="border-t border-border pt-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <div className="text-sm">
                    <h2 className="font-semibold text-foreground">Données personnelles</h2>
                    <p className="text-muted-foreground">
                      À supprimer au plus tard le 31/12/2026 (sauf inscrits newsletter).
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleAnonymizeCheck()}
                  disabled={anonymizing}
                  className="shrink-0 self-start sm:self-auto"
                >
                  {anonymizing && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  Anonymiser les réservations
                </Button>
              </div>
            </section>
          </>
        )
      )}

      <ReservationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        eventSlug={eventSlug}
        reservation={editing}
        onSaved={(message) => {
          notify("success", message);
          void load(true);
        }}
      />

      {/* Confirmations */}
      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          {pending?.kind === "cancel" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
                <AlertDialogDescription>
                  La réservation de {pending.reservation.firstName} {pending.reservation.lastName} (
                  {formatPlaces(pending.reservation.partySize)}) ne sera plus comptée. Vous pourrez
                  la réactiver plus tard. Aucun e-mail n'est envoyé.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Retour</AlertDialogCancel>
                <AlertDialogAction onClick={() => void confirmPending()}>
                  Annuler la réservation
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {pending?.kind === "reactivate" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Réactiver cette réservation ?</AlertDialogTitle>
                <AlertDialogDescription>
                  La réservation de {pending.reservation.firstName} {pending.reservation.lastName} (
                  {formatPlaces(pending.reservation.partySize)}) sera de nouveau comptée. Si la
                  personne a refait une réservation avec la même adresse e-mail, la réactivation
                  sera refusée.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Retour</AlertDialogCancel>
                <AlertDialogAction onClick={() => void confirmPending()}>
                  Réactiver
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {pending?.kind === "delete" && pending.step === 1 && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
                <AlertDialogDescription>
                  À utiliser pour une demande de suppression ou une réservation de test. La ligne
                  disparaît complètement, y compris des chiffres. Pour simplement retirer quelqu'un
                  du décompte, utilisez plutôt « Annuler ».
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Retour</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: "destructive" })}
                  onClick={(e) => {
                    e.preventDefault();
                    setPending({ kind: "delete", reservation: pending.reservation, step: 2 });
                  }}
                >
                  Continuer
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {pending?.kind === "delete" && pending.step === 2 && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Dernière confirmation</AlertDialogTitle>
                <AlertDialogDescription>
                  Supprimer définitivement la réservation de{" "}
                  <strong className="text-foreground">
                    {pending.reservation.anonymizedAt
                      ? ANONYMIZED_LABEL
                      : `${pending.reservation.firstName ?? ""} ${pending.reservation.lastName ?? ""}`.trim()}
                  </strong>{" "}
                  ({formatPlaces(pending.reservation.partySize)}) ? Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Retour</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: "destructive" })}
                  onClick={() => void confirmPending()}
                >
                  Supprimer définitivement
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
          {pending?.kind === "anonymize" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Anonymiser les réservations ?</AlertDialogTitle>
                <AlertDialogDescription>
                  {pending.count} réservation
                  {pending.count > 1 ? "s seront anonymisées" : " sera anonymisée"} (nom, prénom,
                  e-mail effacés ; les chiffres sont conservés). Les inscrits newsletter ne sont pas
                  concernés. Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Retour</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: "destructive" })}
                  onClick={() => void confirmPending()}
                >
                  Anonymiser
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
