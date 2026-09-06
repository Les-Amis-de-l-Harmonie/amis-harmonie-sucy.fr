"use client";

import { Skeleton } from "@/app/components/ui/skeleton";
import { ProfileAlertBanner } from "./ProfileAlertBanner";
import { UrgentPresenceCard } from "./UrgentPresenceCard";
import { NextEventSummary } from "./NextEventSummary";
import { MembershipAlerts, getMembershipAlerts } from "./MembershipAlerts";
import { AllClearBanner } from "./AllClearBanner";
import type { ProfileWithExtras, UpcomingEvent } from "./musician-types";

interface EssentialsZoneProps {
  loading: boolean;
  firstName: string;
  profile: ProfileWithExtras | null;
  profileComplete: boolean;
  planningUrgent: boolean;
  urgentEvent: UpcomingEvent | null;
  nextEvent: UpcomingEvent | null;
}

/**
 * Zone haute fixe du dashboard : ordre de priorité **fixe**, jamais piloté
 * par `card_order_settings` (à la différence de `SecondaryCardGrid`).
 * Calculée uniquement à partir des données déjà récupérées par
 * `useMusicianDashboardData` — aucun nouvel appel réseau.
 *
 * Ordre (du plus bloquant au plus informatif) :
 *  1. Profil incomplet — conditionne adhésion et assurance.
 *  2. Échéance de présence urgente OU (exclusif) prochaine prestation non
 *     urgente — les deux désignent souvent le même événement, les montrer
 *     ensemble doublonnerait l'information.
 *  3. Alertes adhésion/assurance groupées — seulement si le profil est
 *     complet (sinon le point 1 couvre déjà le blocage).
 * Si rien de ce qui précède ne s'affiche : bandeau « tout est en ordre »,
 * jamais un vide brutal entre la salutation et la grille secondaire.
 */
export function EssentialsZone({
  loading,
  firstName,
  profile,
  profileComplete,
  planningUrgent,
  urgentEvent,
  nextEvent,
}: EssentialsZoneProps) {
  if (loading) {
    return (
      <div className="space-y-3" aria-hidden="true">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }

  const showUrgent = planningUrgent && urgentEvent !== null;
  const showNext = !showUrgent && nextEvent !== null;
  const membershipAlerts = profileComplete ? getMembershipAlerts(profile) : [];

  const hasAnyModule = !profileComplete || showUrgent || showNext || membershipAlerts.length > 0;

  if (!hasAnyModule) {
    return <AllClearBanner firstName={firstName} />;
  }

  return (
    <div className="space-y-3">
      {!profileComplete && <ProfileAlertBanner />}
      {showUrgent && urgentEvent && <UrgentPresenceCard event={urgentEvent} />}
      {showNext && nextEvent && <NextEventSummary event={nextEvent} />}
      {profileComplete && membershipAlerts.length > 0 && <MembershipAlerts profile={profile} />}
    </div>
  );
}
