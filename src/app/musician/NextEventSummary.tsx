import { CalendarDays, ChevronRight } from "lucide-react";
import { formatDateShort } from "@/lib/dates";
import type { UpcomingEvent } from "./musician-types";

interface NextEventSummaryProps {
  event: UpcomingEvent;
}

/**
 * Priorité 3 de la zone essentiels : une ligne, pas une carte — cette
 * prestation n'a rien d'urgent (sinon `UrgentPresenceCard` aurait déjà pris
 * sa place, voir `EssentialsZone`).
 *
 * Pas de badge de statut de réponse ici : `/api/musician/planning-check` ne
 * renvoie pas non plus cette information pour `nextEvent` (seulement
 * `{ title, date }`, voir `useMusicianDashboardData`) — même limite de
 * données que documentée dans `UrgentPresenceCard`.
 */
export function NextEventSummary({ event }: NextEventSummaryProps) {
  return (
    <a
      href="/musician/disponibilites"
      className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40"
    >
      <CalendarDays className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-muted-foreground">Prochaine prestation</p>
        <p className="truncate font-medium text-foreground">
          {event.title} · {formatDateShort(event.date)}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </a>
  );
}
