import { CalendarDays, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Skeleton } from "@/app/components/ui/skeleton";
import { StatusPill } from "./StatusPill";
import { formatDateFrench } from "@/lib/dates";
import type { UpcomingEvent } from "./musician-types";

interface PrestationsModuleProps {
  loading: boolean;
  nextEvents: UpcomingEvent[];
  planningUrgent: boolean;
  urgentEvent: UpcomingEvent | null;
}

/**
 * Remplace `PlanningCard` + `UrgentPresenceCard` + `NextEventSummary` par un
 * seul module de contenu réel (Phase 2b) : les trois prochaines prestations,
 * avec la prestation urgente en tête lorsqu'il y en a une.
 *
 * `/api/musician/planning-check` ne renvoie que `{ title, date }` pour
 * `nextEvents` — jamais si le musicien y a déjà répondu (voir
 * `src/app/api/musician.ts:773-798`, `presence_required` sans jointure sur
 * `event_presences` pour `nextEvents`). Un `StatusPill` n'est donc affiché
 * que pour l'événement **urgent** (`ep.id IS NULL`, donc réponse manquante
 * garantie) — jamais pour une prestation ordinaire, ce qui inventerait un statut.
 */
export function PrestationsModule({
  loading,
  nextEvents,
  planningUrgent,
  urgentEvent,
}: PrestationsModuleProps) {
  if (loading) {
    return (
      <Card className="min-h-[168px]" aria-hidden="true">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const isUrgent = planningUrgent && urgentEvent !== null;
  const upcomingEvents = [
    ...(isUrgent && urgentEvent ? [urgentEvent] : []),
    ...nextEvents.filter(
      (event) => !isUrgent || event.title !== urgentEvent?.title || event.date !== urgentEvent.date
    ),
  ].slice(0, 3);

  return (
    <Card className={isUrgent ? "border-l-4 border-l-warning" : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
          Prochaines prestations
        </CardTitle>
        <CardDescription>
          {/* Ni « sortie » (le mot désigne déjà la sortie annuelle, module voisin)
              ni « orchestre » : l'ensemble est une harmonie. */}
          {isUrgent
            ? "Une réponse est attendue de votre part."
            : "Vos prochaines dates avec l'harmonie."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {upcomingEvents.length > 0 ? (
          <>
            <div>
              {upcomingEvents.map((event, index) => {
                const isUrgentEvent =
                  isUrgent && event.title === urgentEvent.title && event.date === urgentEvent.date;
                return (
                  <div
                    key={`${event.title}-${event.date}`}
                    className={index > 0 ? "mt-3 border-t border-border pt-3" : undefined}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{event.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateFrench(event.date)}
                        </p>
                      </div>
                      {isUrgentEvent && (
                        <div className="flex shrink-0 items-center gap-3">
                          <StatusPill status={null} />
                          <a href="/musician/disponibilites">
                            <Button variant="default" size="sm">
                              Répondre maintenant
                              <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                            </Button>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {!isUrgent && (
              <div className="mt-3 flex justify-end">
                <a href="/musician/disponibilites">
                  <Button variant="outline" size="sm">
                    Indiquer mes présences
                    <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                  </Button>
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Aucune prestation à venir pour le moment.
            </p>
            <a href="/musician/disponibilites" className="shrink-0">
              <Button variant="outline" size="sm">
                Voir mes prestations
                <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Button>
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
