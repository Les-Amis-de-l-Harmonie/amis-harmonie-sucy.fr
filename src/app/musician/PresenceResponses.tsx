"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  History,
  Loader2,
  Lock,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useActingLabels } from "./acting-labels";
import { showsAuthorizationCard, summarizeAuthorization } from "./authorization-helpers";
import type { PresenceEvent } from "./musician-types";
import { getDeadlineTone } from "./presence-deadline";
import { formatPresentOnTotal } from "./presence-format";
import { formatEventDayLabel, getCellVisual, getEventDateParts } from "./presence-matrix-helpers";
import type { PresenceSaveAction } from "./usePresenceSave";

type QuickStatus = "present" | "absent";

/** « Dim. 22 nov. · 11h30 » : le titre de la ligne, lisible d'un coup d'œil. */
function formatRowDate(event: PresenceEvent): string {
  const parts = getEventDateParts(event.date);
  const day = parts ? `${parts.weekdayShort} ${parts.day} ${parts.monthShort}` : event.date;
  return event.time ? `${day} · ${event.time}` : day;
}

function shortDateLabel(event: PresenceEvent): string {
  const parts = getEventDateParts(event.date);
  return parts ? `${parts.dayPadded}/${parts.monthPadded}` : event.date;
}

interface QuickButtonProps {
  status: QuickStatus;
  selected: boolean;
  busy: boolean;
  disabled: boolean;
  label: string;
  onClick: () => void;
}

function QuickButton({ status, selected, busy, disabled, label, onClick }: QuickButtonProps) {
  const Icon = status === "present" ? Check : X;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={label}
      className={cn(
        "grid h-11 w-11 cursor-pointer place-items-center rounded-xl border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
        selected
          ? status === "present"
            ? "border-success bg-success text-success-foreground"
            : "border-destructive bg-destructive text-destructive-foreground"
          : status === "present"
            ? "border-border bg-card text-success enabled:hover:bg-success/10"
            : "border-border bg-card text-destructive enabled:hover:bg-destructive/10"
      )}
    >
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      ) : (
        <Icon className="h-[22px] w-[22px]" strokeWidth={3} aria-hidden="true" />
      )}
    </button>
  );
}

interface ResponseRowProps {
  event: PresenceEvent;
  pending: PresenceSaveAction | null;
  error: string | null;
  onOpen: (eventId: number) => void;
  onQuickAnswer: (event: PresenceEvent, status: QuickStatus) => void;
}

function ResponseRow({ event, pending, error, onOpen, onQuickAnswer }: ResponseRowProps) {
  const labels = useActingLabels();
  const status = event.response.status;
  const unanswered = status === null;
  const deadline = getDeadlineTone(event.response_deadline, false);
  const currentYear = new Date().getFullYear();
  const dayLabel = formatEventDayLabel(event.date, currentYear);
  // Titre et heure distinguent deux prestations le même jour.
  const eventLabel = event.time ? `${event.title} à ${event.time}` : event.title;
  const authorization =
    event.authorization && showsAuthorizationCard(event)
      ? summarizeAuthorization(event.authorization)
      : null;

  return (
    <li
      className={cn(
        "rounded-2xl border border-border bg-card",
        unanswered && "border-l-4 border-l-warning bg-warning/5 dark:bg-warning/10"
      )}
    >
      <div className={cn("flex items-center gap-2 py-2 pr-2", unanswered ? "pl-2.5" : "pl-3")}>
        <button
          type="button"
          data-presence-trigger={event.id}
          aria-haspopup="dialog"
          // Pendant un enregistrement rapide, la feuille s'ouvrirait sur un événement périmé,
          // avec des boutons actifs : on attend la réponse du serveur.
          disabled={pending !== null}
          onClick={() => onOpen(event.id)}
          className="min-h-11 min-w-0 flex-1 cursor-pointer rounded-lg py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait"
        >
          <span className="block text-sm font-bold leading-tight text-foreground">
            {formatRowDate(event)}
          </span>
          <span className="mt-0.5 block text-sm leading-tight text-foreground/80">
            {event.title}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {formatPresentOnTotal(event.counts.present, event.counts.totalMembers)}
            {event.response.comment && (
              <>
                <MessageSquare className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="sr-only">{labels.ownCommentIndicator}</span>
              </>
            )}
          </span>
          {unanswered && (
            <span
              className={cn(
                "mt-0.5 block text-xs font-semibold",
                deadline.tone === "danger" ? "text-destructive" : "text-warning"
              )}
            >
              {!event.response_deadline
                ? "À répondre"
                : deadline.tone === "danger"
                  ? deadline.label
                  : `À répondre avant le ${formatEventDayLabel(event.response_deadline, currentYear)}`}
            </span>
          )}
          {authorization && (
            <span
              className={cn(
                "mt-0.5 flex items-center gap-1 text-xs font-semibold",
                authorization.tone === "ok" ? "text-success" : "text-warning"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {authorization.label}
            </span>
          )}
        </button>
        <div className="flex shrink-0 gap-1.5">
          {(["present", "absent"] as const).map((value) => (
            <QuickButton
              key={value}
              status={value}
              selected={status === value}
              busy={pending === value}
              disabled={pending !== null}
              label={labels.quickAnswer(value, dayLabel, eventLabel)}
              onClick={() => onQuickAnswer(event, value)}
            />
          ))}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="flex items-start gap-1.5 px-3 pb-2.5 text-xs font-medium text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </li>
  );
}

export interface PastEventsState {
  open: boolean;
  loading: boolean;
  error: string | null;
  /** `null` tant que la première ouverture n'a rien chargé. */
  events: PresenceEvent[] | null;
}

interface PresenceResponsesProps {
  events: PresenceEvent[];
  pending: Record<number, PresenceSaveAction>;
  errors: Record<number, string>;
  past: PastEventsState;
  onOpen: (eventId: number) => void;
  onQuickAnswer: (event: PresenceEvent, status: QuickStatus) => void;
  onTogglePast: () => void;
  onRetryPast: () => void;
}

/** Liste « Mes réponses » : une ligne par prestation, réponse en un geste, passé replié. */
export function PresenceResponses({
  events,
  pending,
  errors,
  past,
  onOpen,
  onQuickAnswer,
  onTogglePast,
  onRetryPast,
}: PresenceResponsesProps) {
  const labels = useActingLabels();

  return (
    <div className="space-y-3">
      {events.length > 0 && (
        <p className="px-0.5 text-sm text-muted-foreground">{labels.listHelp}</p>
      )}

      <ul className="space-y-1.5">
        {events.map((event) => (
          <ResponseRow
            key={event.id}
            event={event}
            pending={pending[event.id] ?? null}
            error={errors[event.id] ?? null}
            onOpen={onOpen}
            onQuickAnswer={onQuickAnswer}
          />
        ))}
      </ul>

      <section
        aria-label="Prestations passées"
        className="border-t border-dashed border-border pt-1"
      >
        <button
          type="button"
          aria-expanded={past.open}
          aria-controls="past-events-panel"
          onClick={onTogglePast}
          className="flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-lg px-1 text-left text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <History className="h-4 w-4" aria-hidden="true" />
          Prestations passées
          {past.events !== null && <span className="font-normal">({past.events.length})</span>}
          <ChevronDown
            className={cn("ml-auto h-4 w-4 transition-transform", past.open && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        <div id="past-events-panel" hidden={!past.open}>
          {past.open && (
            <div className="space-y-1.5 pb-1 pt-1">
              {past.loading && (
                <p
                  role="status"
                  className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground"
                >
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Chargement…
                </p>
              )}
              {past.error && !past.loading && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/20"
                >
                  <span>{past.error}</span>
                  <button
                    type="button"
                    onClick={onRetryPast}
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 font-medium underline-offset-2 hover:underline"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Réessayer
                  </button>
                </div>
              )}
              {past.events !== null && past.events.length === 0 && !past.loading && (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                  Aucune prestation passée sur les 12 derniers mois.
                </p>
              )}
              {past.events !== null && past.events.length > 0 && (
                <ul className="space-y-1.5">
                  {past.events.map((event) => {
                    const visual = getCellVisual(event.response.status);
                    const label = labels.viewAnswerCell(
                      `${event.title} du ${shortDateLabel(event)}`,
                      visual.label.toLowerCase()
                    );
                    return (
                      <li key={event.id}>
                        <button
                          type="button"
                          data-presence-trigger={event.id}
                          aria-haspopup="dialog"
                          aria-label={label}
                          onClick={() => onOpen(event.id)}
                          className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <span className="min-w-0 flex-1" aria-hidden="true">
                            <span className="block text-sm font-bold leading-tight text-foreground">
                              {formatRowDate(event)}
                            </span>
                            <span className="mt-0.5 block text-sm leading-tight text-foreground/80">
                              {event.title}
                            </span>
                          </span>
                          <span
                            className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-muted-foreground"
                            aria-hidden="true"
                          >
                            <visual.Icon className="h-3.5 w-3.5" strokeWidth={3} />
                            {visual.label}
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
