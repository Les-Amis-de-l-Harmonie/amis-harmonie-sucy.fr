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
  nextEvent: UpcomingEvent | null;
  planningUrgent: boolean;
  urgentEvent: UpcomingEvent | null;
}

/**
 * Remplace `PlanningCard` + `UrgentPresenceCard` + `NextEventSummary` par un
 * seul module de contenu réel (Phase 2b) : la prestation la plus pertinente
 * (urgente si elle existe, sinon la prochaine), avec son état de réponse
 * quand on le connaît.
 *
 * `/api/musician/planning-check` ne renvoie que `{ title, date }` pour
 * `nextEvent` — jamais si le musicien y a déjà répondu (voir
 * `src/app/api/musician.ts:773-798`, `presence_required` sans jointure sur
 * `event_presences` pour `nextEvent`). Un `StatusPill` n'est donc affiché
 * que pour l'événement **urgent** (`ep.id IS NULL`, donc réponse manquante
 * garantie) — jamais pour `nextEvent` seul, ce qui inventerait un statut.
 */
export function PrestationsModule({
  loading,
  nextEvent,
  planningUrgent,
  urgentEvent,
}: PrestationsModuleProps) {
  if (loading) {
    return (
      <Card className="min-h-[168px]" aria-hidden="true">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const isUrgent = planningUrgent && urgentEvent !== null;
  const highlighted = isUrgent ? urgentEvent : nextEvent;

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
            : "Votre prochaine date avec l'harmonie."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {highlighted ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{highlighted.title}</p>
              <p className="text-sm text-muted-foreground">{formatDateFrench(highlighted.date)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {isUrgent && <StatusPill status={null} />}
              <a href="/musician/disponibilites">
                <Button variant={isUrgent ? "default" : "outline"} size="sm">
                  {isUrgent ? "Répondre maintenant" : "Indiquer mes présences"}
                  <ChevronRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Button>
              </a>
            </div>
          </div>
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
