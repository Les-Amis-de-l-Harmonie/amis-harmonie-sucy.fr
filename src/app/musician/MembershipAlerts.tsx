import { ArrowRight, Heart, Shield, type LucideIcon } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import type { ProfileWithExtras } from "./musician-types";

export interface MembershipAlert {
  key: string;
  icon: LucideIcon;
  text: string;
  href: string;
  cta: string;
}

/**
 * Calcule les alertes à afficher, exporté à part pour que `EssentialsZone`
 * puisse savoir "y a-t-il quelque chose à montrer ici ?" sans dupliquer
 * cette condition — une seule source de vérité, consommée par le composant
 * ci-dessous ET par la décision "rien d'urgent" de la zone essentiels.
 *
 * Mutuellement exclusifs dans les données actuelles : l'assurance ne se
 * déclare qu'une fois adhérent, donc au plus une alerte s'affiche en
 * pratique — la fonction retourne malgré tout une liste, pas un choix
 * binaire figé, au cas où un futur critère s'ajouterait.
 */
export function getMembershipAlerts(profile: ProfileWithExtras | null): MembershipAlert[] {
  const isMember = profile?.adhesion_2026_2027 === 1;

  if (!isMember) {
    return [
      {
        key: "adhesion",
        icon: Heart,
        text: "Vous n'êtes pas encore adhérent pour 2026-2027.",
        href: "/adhesion",
        cta: "Adhérer",
      },
    ];
  }

  if (!profile?.insurance_complete) {
    return [
      {
        key: "assurance",
        icon: Shield,
        text: "Votre assurance instrument n'est pas encore déclarée.",
        href: "/musician/assurance",
        cta: "Compléter",
      },
    ];
  }

  return [];
}

interface MembershipAlertsProps {
  profile: ProfileWithExtras | null;
}

/**
 * Priorité 4 de la zone essentiels, appelée uniquement quand le profil est
 * complet (sinon `ProfileAlertBanner` couvre déjà le blocage, voir
 * `EssentialsZone`).
 */
export function MembershipAlerts({ profile }: MembershipAlertsProps) {
  const alerts = getMembershipAlerts(profile);
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map(({ key, icon: Icon, text, href, cta }) => (
        <div
          key={key}
          className="flex flex-col gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <Icon className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-sm font-medium text-foreground">{text}</p>
          </div>
          <a href={href} className="shrink-0">
            <Button variant="outline" className="w-full sm:w-auto">
              {cta}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </a>
        </div>
      ))}
    </div>
  );
}
