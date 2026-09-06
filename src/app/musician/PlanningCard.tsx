import { CalendarDays, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { formatDateShort } from "@/lib/dates";
import type { UpcomingEvent } from "./musician-types";

interface PlanningCardProps {
  loading: boolean;
  nextEvent: UpcomingEvent | null;
  planningUrgent: boolean;
  urgentEvent: UpcomingEvent | null;
}

/**
 * Jamais verrouillée. L'échéance urgente est déjà mise en avant dans la
 * zone essentiels (`UrgentPresenceCard`) — cette carte reste le rappel
 * secondaire, cohérent avec l'ordre choisi par l'admin.
 */
export function PlanningCard({
  loading,
  nextEvent,
  planningUrgent,
  urgentEvent,
}: PlanningCardProps) {
  return (
    <Card className="flex min-h-[220px] flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarDays className="h-5 w-5 text-primary" aria-hidden="true" />
          Mes prestations
        </CardTitle>
        <CardDescription>
          Indiquez si vous serez présent aux prochaines prestations.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="mb-4 flex-1">
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : nextEvent ? (
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Prochain évènement :</p>
              <p className="text-sm font-semibold text-primary">{nextEvent.title}</p>
              <p className="text-sm text-muted-foreground">{formatDateShort(nextEvent.date)}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune prestation à venir</p>
          )}
          {planningUrgent && (
            <div className="mt-3 rounded-md border border-warning/30 bg-warning/10 p-3">
              <p className="text-sm font-semibold text-warning">
                À répondre : {urgentEvent ? urgentEvent.title : "une prestation à venir"}
              </p>
              {urgentEvent && (
                <p className="mt-0.5 text-xs text-warning">{formatDateShort(urgentEvent.date)}</p>
              )}
            </div>
          )}
        </div>
        <a href="/musician/disponibilites" className="mt-auto">
          <Button variant="outline" className="w-full">
            Indiquer mes présences
            <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}
