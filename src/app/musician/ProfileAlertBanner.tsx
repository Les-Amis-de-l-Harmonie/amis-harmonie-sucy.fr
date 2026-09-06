import { ArrowRight, TriangleAlert } from "lucide-react";
import { Button } from "@/app/components/ui/button";

/**
 * Priorité 1 de la zone essentiels : un profil incomplet conditionne
 * l'adhésion et l'assurance (voir `LockedCardOverlay`), donc cette alerte
 * passe avant même une échéance de présence urgente.
 */
export function ProfileAlertBanner() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div>
          <p className="font-semibold text-foreground">Votre profil n&apos;est pas complet</p>
          <p className="text-sm text-muted-foreground">
            Certaines fonctionnalités restent bloquées tant qu&apos;il manque des informations.
          </p>
        </div>
      </div>
      <a href="/musician/profile" className="shrink-0">
        <Button className="w-full sm:w-auto">
          Compléter mon profil
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      </a>
    </div>
  );
}
