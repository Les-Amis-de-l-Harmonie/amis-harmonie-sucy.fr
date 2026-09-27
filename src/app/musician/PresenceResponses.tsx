"use client";

import { ChevronRight, Lock } from "lucide-react";
import { formatDateFrench, isEventPast } from "@/lib/dates";
import { getCellVisual } from "./presence-matrix-helpers";
import type { PresenceEvent } from "./musician-types";

interface PresenceResponsesProps {
  events: PresenceEvent[];
  onEditResponse: (eventId: number, trigger: HTMLButtonElement) => void;
}

/** Accès mobile aux réponses personnelles, indépendant du défilement du tableau. */
export function PresenceResponses({ events, onEditResponse }: PresenceResponsesProps) {
  return (
    <section aria-labelledby="my-responses-heading" className="space-y-3 md:hidden">
      <h2 id="my-responses-heading" className="text-lg font-semibold text-foreground">
        Mes réponses
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {events.map((event) => {
          const isPast = isEventPast(event.date);
          const visual = getCellVisual(event.response.status);
          const action = isPast ? "Consulter" : event.response.status ? "Modifier" : "Répondre";
          return (
            <li key={event.id}>
              <button
                type="button"
                onClick={(e) => onEditResponse(event.id, e.currentTarget)}
                aria-label={`${action} : ${event.title}, ${formatDateFrench(event.date)}, ${visual.label.toLowerCase()}`}
                className="flex min-h-11 w-full cursor-pointer items-center gap-3 p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
              >
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="block break-words text-sm font-semibold text-foreground">
                    {event.title}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatDateFrench(event.date)}
                    {event.time && ` · ${event.time}`}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-foreground">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center ${visual.shapeClass}`}
                    >
                      <visual.Icon className="h-3 w-3" aria-hidden="true" />
                    </span>
                    {visual.label}
                    {isPast && <span className="text-muted-foreground">· Réponses closes</span>}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-foreground">
                  {action}
                  {isPast ? (
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
