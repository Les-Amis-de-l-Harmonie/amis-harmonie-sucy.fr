import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { StatusPill } from "./StatusPill";
import { formatDateShort } from "@/lib/dates";
import type { UpcomingEvent } from "./musician-types";

interface UrgentPresenceCardProps {
  event: UpcomingEvent;
}

/**
 * Priorité 2 de la zone essentiels.
 *
 * ⚠️ Écart documenté par rapport à la spec initiale ("boutons Présent/Absent
 * inline via une carte PresenceCard compacte") : `/api/musician/
 * planning-check` (consommée par `useMusicianDashboardData`, seule source
 * autorisée ici) ne renvoie que `{ title, date }` pour `urgentEvent` — ni
 * `id`, ni `response`, ni `roster`, ni `counts`, ni `response_deadline`.
 * `PresenceCard` exige un `PresenceEvent` complet pour fonctionner (voir
 * `PresenceCard.tsx`) : impossible à construire depuis ces seules données
 * sans inventer un `id` d'événement, ce qui enverrait de fausses réponses à
 * `/api/musician/presence`. Combler l'écart demanderait soit un nouvel appel
 * réseau (interdiction absolue de cette phase), soit d'enrichir la réponse
 * de `planning-check` (hors périmètre : `src/app/api/**`).
 *
 * Cette carte reste donc un résumé en lecture seule avec un appel à l'action
 * clair vers la page dédiée, où `PresenceCard` (plein, interactif) prend le
 * relais. L'interactivité inline redeviendra possible si `planning-check` est
 * un jour enrichi pour renvoyer au minimum `id` et `response_deadline`.
 * Signalé à l'orchestrateur — voir le rapport de Phase 2b.
 */
export function UrgentPresenceCard({ event }: UrgentPresenceCardProps) {
  return (
    <Card className="border-l-4 border-l-warning bg-warning/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start justify-between gap-3 sm:block">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Une prestation attend votre réponse
            </p>
            <p className="font-heading text-lg font-bold text-foreground">{event.title}</p>
            <p className="text-sm text-muted-foreground">{formatDateShort(event.date)}</p>
          </div>
          <div className="sm:hidden">
            <StatusPill status={null} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden sm:block">
            <StatusPill status={null} />
          </div>
          <a href="/musician/disponibilites">
            <Button className="w-full sm:w-auto">
              Répondre maintenant
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
