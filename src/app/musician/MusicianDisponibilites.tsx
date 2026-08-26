"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { EmptyState } from "@/app/components/ui/empty-state";
import { formatDateFrench, formatDateLong } from "@/lib/dates";
import { cn } from "@/lib/utils";

type PresenceStatus = "present" | "absent";

interface PresenceRosterEntry {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  status: PresenceStatus;
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

function RosterPanel({ event }: { event: PresenceEvent }) {
  const present = event.roster.filter((member) => member.status === "present");
  const absent = event.roster.filter((member) => member.status === "absent");

  return (
    <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/40">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
        <span className="text-green-700 dark:text-green-400">
          {event.counts.present} présent{event.counts.present > 1 ? "s" : ""}
        </span>
        <span className="text-red-700 dark:text-red-400">
          {event.counts.absent} absent{event.counts.absent > 1 ? "s" : ""}
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {event.counts.noAnswer} sans réponse
        </span>
      </div>

      {present.length === 0 && absent.length === 0 ? (
        <p className="text-sm italic text-gray-500 dark:text-gray-400">
          Personne n&apos;a encore répondu.
        </p>
      ) : (
        <div className="space-y-2.5">
          {present.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                Présents
              </p>
              <ul className="space-y-0.5">
                {present.map((member) => (
                  <li
                    key={member.userId}
                    className="truncate text-sm text-gray-800 dark:text-gray-200"
                  >
                    {getFullName(member.firstName, member.lastName)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {absent.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
                Absents
              </p>
              <ul className="space-y-0.5">
                {absent.map((member) => (
                  <li
                    key={member.userId}
                    className="truncate text-sm text-gray-800 dark:text-gray-200"
                  >
                    {getFullName(member.firstName, member.lastName)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PresenceCardProps {
  event: PresenceEvent;
  onUpdate: (event: PresenceEvent) => void;
}

function PresenceCard({ event, onUpdate }: PresenceCardProps) {
  const [comment, setComment] = useState(event.response.comment ?? "");
  const [commentOpen, setCommentOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
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
  const answeredCount = event.counts.present + event.counts.absent;

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
      } catch (err) {
        setSaveState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "La réponse n'a pas pu être enregistrée."
        );
      } finally {
        setPendingStatus(null);
      }
    },
    [comment, event.id, onUpdate]
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
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          {/* Action column */}
          <div className="flex flex-col">
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
          </div>

          {/* Roster column */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setRosterOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary md:hidden"
            >
              <Users className="h-3.5 w-3.5" />
              {rosterOpen
                ? "Masquer qui a répondu"
                : `Voir qui a répondu (${answeredCount}/${event.counts.totalMembers})`}
              <ChevronDown
                className={cn("h-3 w-3 transition-transform", rosterOpen && "rotate-180")}
              />
            </button>
            <div className={cn(rosterOpen ? "block" : "hidden", "md:block")}>
              <RosterPanel event={event} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MusicianDisponibilites() {
  const [events, setEvents] = useState<PresenceEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdate = useCallback((updatedEvent: PresenceEvent) => {
    setEvents((prev) =>
      prev ? prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)) : prev
    );
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
        <div className="space-y-4">
          {events.map((event) => (
            <PresenceCard key={event.id} event={event} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
