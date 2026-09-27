"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, Lock, X } from "lucide-react";
import { formatDateFrench, isEventPast } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PresenceCard, type PresenceCardProps } from "./PresenceCard";
import { getCellVisual } from "./presence-matrix-helpers";
import type { PresenceEvent } from "./musician-types";

interface PresenceResponsesProps {
  events: PresenceEvent[];
  openEventId: number | null;
  onEditResponse: (eventId: number) => void;
  onClose: () => void;
  onUpdate: PresenceCardProps["onUpdate"];
  onStatusChanged: PresenceCardProps["onStatusChanged"];
}

/** Accès mobile aux réponses personnelles, indépendant du défilement du tableau. */
export function PresenceResponses({
  events,
  openEventId,
  onEditResponse,
  onClose,
  onUpdate,
  onStatusChanged,
}: PresenceResponsesProps) {
  const triggers = useRef(new Map<number, HTMLButtonElement>());
  const previousOpenId = useRef<number | null>(null);

  useEffect(() => {
    const targetId = openEventId ?? previousOpenId.current;
    if (targetId !== null) {
      // Conserver le contexte, y compris après une ouverture depuis le tableau.
      const trigger = triggers.current.get(targetId);
      trigger?.focus({ preventScroll: true });
      trigger?.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
    previousOpenId.current = openEventId;
  }, [openEventId]);

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
          const expanded = openEventId === event.id;
          const triggerId = `response-trigger-${event.id}`;
          const panelId = `response-panel-${event.id}`;
          return (
            <li key={event.id}>
              <button
                type="button"
                id={triggerId}
                ref={(node) => {
                  if (node) triggers.current.set(event.id, node);
                  else triggers.current.delete(event.id);
                }}
                onClick={() => (expanded ? onClose() : onEditResponse(event.id))}
                aria-expanded={expanded}
                aria-controls={panelId}
                aria-label={`${action} : ${event.title}, ${formatDateFrench(event.date)}, ${visual.label.toLowerCase()}`}
                className="flex min-h-11 w-full scroll-mt-20 scroll-mb-24 cursor-pointer items-center gap-3 p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
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
                    <ChevronDown
                      className={cn("h-4 w-4", expanded && "rotate-180")}
                      aria-hidden="true"
                    />
                  )}
                </span>
              </button>
              <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!expanded}>
                {expanded && (
                  <div className="space-y-2 border-t border-border bg-muted/30 p-2">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                        Fermer
                      </button>
                    </div>
                    <PresenceCard
                      event={event}
                      onUpdate={onUpdate}
                      onStatusChanged={onStatusChanged}
                    />
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
