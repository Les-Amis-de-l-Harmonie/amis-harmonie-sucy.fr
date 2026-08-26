"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Minus,
  Pencil,
  RefreshCw,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { EmptyState } from "@/app/components/ui/empty-state";
import { formatDateFrench, formatDateLong } from "@/lib/dates";
import { INSTRUMENT_WITHOUT_SECTION_LABEL } from "@/lib/instruments";
import { cn } from "@/lib/utils";

type PresenceStatus = "present" | "absent";

interface PresenceRosterEntry {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
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

interface PresenceCardProps {
  event: PresenceEvent;
  onUpdate: (event: PresenceEvent) => void;
  /** Appelé après un enregistrement réussi ; sert à refermer la carte quand elle a été
   * rouverte manuellement depuis le tableau croisé. */
  onSaved?: () => void;
}

function PresenceCard({ event, onUpdate, onSaved }: PresenceCardProps) {
  const [comment, setComment] = useState(event.response.comment ?? "");
  const [commentOpen, setCommentOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<PresenceStatus | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (saveState !== "saved") return;

    const timeoutId = window.setTimeout(() => setSaveState("idle"), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [saveState]);

  const status = event.response.status;
  const answered = status !== null;
  const deadlineInfo = getDeadlineTone(event.response_deadline, answered);

  const submit = useCallback(
    async (newStatus: PresenceStatus) => {
      setPendingStatus(newStatus);
      setSaveState("idle");
      setErrorMessage(null);
      try {
        const response = await fetch("/api/musician/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event.id,
            status: newStatus,
            comment: comment.trim() || null,
          }),
        });
        const data = (await response.json()) as PresenceSubmitResponse;
        if (!response.ok || !data.success || !data.event) {
          throw new Error(data.error || "La réponse n'a pas pu être enregistrée.");
        }
        setComment(data.event.response.comment ?? "");
        onUpdate(data.event);
        setSaveState("saved");
        onSaved?.();
      } catch (err) {
        setSaveState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "La réponse n'a pas pu être enregistrée."
        );
      } finally {
        setPendingStatus(null);
      }
    },
    [comment, event.id, onUpdate, onSaved]
  );

  const commentDirty = comment.trim() !== (event.response.comment ?? "").trim();

  return (
    <Card
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
            disabled={pendingStatus !== null}
            aria-pressed={status === "present"}
            className={cn(
              "flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70",
              status === "present"
                ? "border-green-500 bg-green-500 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-green-400 hover:bg-green-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-green-900/20"
            )}
          >
            {pendingStatus === "present" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Présent
          </button>
          <button
            type="button"
            onClick={() => submit("absent")}
            disabled={pendingStatus !== null}
            aria-pressed={status === "absent"}
            className={cn(
              "flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70",
              status === "absent"
                ? "border-red-500 bg-red-500 text-white shadow-sm"
                : "border-gray-200 bg-white text-gray-700 hover:border-red-400 hover:bg-red-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-red-900/20"
            )}
          >
            {pendingStatus === "absent" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Absent
          </button>
        </div>

        <div className="mt-2 min-h-[18px]">
          {saveState === "saved" && (
            <p className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <Check className="h-3.5 w-3.5" />
              Réponse enregistrée
            </p>
          )}
          {saveState === "error" && (
            <p className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
              <AlertTriangle className="h-3.5 w-3.5" />
              {errorMessage}
            </p>
          )}
        </div>

        {/* Comment disclosure */}
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
                    disabled={pendingStatus !== null || !commentDirty}
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
      </CardContent>
    </Card>
  );
}

interface MusicianRow {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  isCurrentUser: boolean;
  statuses: Map<number, PresenceStatus | null>;
}

/** Construit une ligne par musicien à partir des rosters de tous les événements, en
 * conservant l'ordre d'apparition fourni par l'API (déjà groupé par pupitre) et en
 * plaçant le musicien connecté en tête. */
function buildMusicianRows(events: PresenceEvent[], currentUserId: number | null): MusicianRow[] {
  const order: number[] = [];
  const info = new Map<
    number,
    { firstName: string | null; lastName: string | null; instruments: string[] }
  >();
  const statuses = new Map<number, Map<number, PresenceStatus | null>>();

  for (const event of events) {
    for (const member of event.roster) {
      if (!info.has(member.userId)) {
        info.set(member.userId, {
          firstName: member.firstName,
          lastName: member.lastName,
          instruments: member.instruments,
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

  const rows: MusicianRow[] = order.map((userId) => {
    const details = info.get(userId);
    return {
      userId,
      firstName: details?.firstName ?? null,
      lastName: details?.lastName ?? null,
      instruments: details?.instruments ?? [],
      isCurrentUser: userId === currentUserId,
      statuses: statuses.get(userId) ?? new Map<number, PresenceStatus | null>(),
    };
  });

  // Array.prototype.sort est stable (garanti depuis ES2019) : seul le musicien
  // connecté est déplacé en tête, l'ordre relatif des autres est préservé.
  rows.sort((a, b) => {
    if (a.isCurrentUser === b.isCurrentUser) return 0;
    return a.isCurrentUser ? -1 : 1;
  });

  return rows;
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
          Votre ligne est en haut du tableau
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
          <tbody>
            {rows.map((row, index) => {
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
                    <span className="block text-xs font-normal text-gray-500 dark:text-gray-400">
                      {row.instruments.length > 0
                        ? row.instruments.join(", ")
                        : INSTRUMENT_WITHOUT_SECTION_LABEL}
                    </span>
                  </th>
                  {events.map((event) => {
                    const status = row.statuses.get(event.id) ?? null;
                    const visual = getCellVisual(status);

                    if (row.isCurrentUser) {
                      const label = `Modifier votre réponse pour ${event.title} du ${formatDateShortLabel(event.date)}, actuellement : ${visual.label.toLowerCase()}`;
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
                              <Pencil className="h-2.5 w-2.5 text-gray-500" aria-hidden="true" />
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
  const focusedCardRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<number | undefined>(undefined);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/musician/presence");
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
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (openEventId === null) return;
    focusedCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [openEventId]);

  useEffect(() => {
    return () => window.clearTimeout(closeTimeoutRef.current);
  }, []);

  const handleUpdate = useCallback((updatedEvent: PresenceEvent) => {
    setEvents((prev) =>
      prev ? prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)) : prev
    );
  }, []);

  const handleEditResponse = useCallback((eventId: number) => {
    setOpenEventId(eventId);
  }, []);

  const closeFocusedCard = useCallback(() => {
    window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = window.setTimeout(() => setOpenEventId(null), 900);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
        <div className="rounded-full bg-red-50 p-4 dark:bg-red-900/20">
          <Calendar className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-lg font-medium text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  const unansweredCount = (events ?? []).filter((e) => e.response.status === null).length;
  const visibleEvents = (events ?? []).filter(
    (e) => e.response.status === null || e.id === openEventId
  );

  return (
    <div className="space-y-6">
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

      {!events || events.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-10 w-10" />}
          title="Aucune prestation ne nécessite votre réponse pour le moment."
          description="Revenez ici dès qu'une nouvelle date sera annoncée."
        />
      ) : (
        <>
          {visibleEvents.length > 0 ? (
            <div className="space-y-4">
              {visibleEvents.map((event) => (
                <div key={event.id} ref={event.id === openEventId ? focusedCardRef : undefined}>
                  <PresenceCard
                    event={event}
                    onUpdate={handleUpdate}
                    onSaved={event.id === openEventId ? closeFocusedCard : undefined}
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

          <PresenceMatrix
            events={events}
            currentUserId={currentUserId}
            onEditResponse={handleEditResponse}
          />
        </>
      )}
    </div>
  );
}
