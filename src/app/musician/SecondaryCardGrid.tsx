"use client";

import { motion } from "framer-motion";
import type { MusicianCardType, OutingSettings, Video } from "@/db/types";
import type { Birthday, ProfileWithExtras, UpcomingEvent } from "./musician-types";
import { ProfileCard } from "./ProfileCard";
import { AdhesionCard } from "./AdhesionCard";
import { AssuranceCard } from "./AssuranceCard";
import { PlanningCard } from "./PlanningCard";
import { PartitionsCard } from "./PartitionsCard";
import { IdeaBoxCard } from "./IdeaBoxCard";
import { OutingCard } from "./OutingCard";
import { SocialCard } from "./SocialCard";
import { BirthdaysCard } from "./BirthdaysCard";
import { TrombinoscopeCard } from "./TrombinoscopeCard";

interface SecondaryCardGridProps {
  cardOrder: MusicianCardType[];
  profile: ProfileWithExtras | null;
  loading: boolean;
  profileComplete: boolean;
  nextEvent: UpcomingEvent | null;
  planningUrgent: boolean;
  urgentEvent: UpcomingEvent | null;
  outingSettings: OutingSettings | null;
  birthdays: Birthday[];
  unreadIdeasCount: number;
  firstVideo: Video | null;
  onVideoClick: (video: Video) => void;
}

// Stagger d'entrée uniquement — le seul usage de framer-motion conservé sur
// cette page (voir direction design §G1). Le survol des cartes ne passe
// plus par des `motion.div` imbriqués : il utilise `.hover-lift`, l'utilitaire
// CSS déjà écrit dans `styles.css`, posé sur un `<div>` ordinaire à
// l'intérieur du `motion.div` de stagger — jamais sur le même nœud que
// framer-motion contrôle, pour éviter qu'un `transform` inline ne l'emporte
// silencieusement sur la transition CSS au survol.
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

/**
 * Zone secondaire du dashboard : les 10 cartes dans l'ordre exact de
 * `cardOrder`, piloté par l'admin (`CardOrderAdmin.tsx` via
 * `/api/admin/card-order`). Aucun tri, aucun filtrage supplémentaire,
 * aucune promotion vers `EssentialsZone` — seule exception conservée à
 * l'identique : `outing` masquée si `outingSettings.is_active !== 1`.
 *
 * `data-testid="secondary-cards"` et les titres en `<h*>` (via `CardTitle`)
 * sont l'ancrage du test de verrouillage
 * `src/app/musician/__tests__/card-order.test.tsx` — ne pas y toucher.
 */
export function SecondaryCardGrid({
  cardOrder,
  profile,
  loading,
  profileComplete,
  nextEvent,
  planningUrgent,
  urgentEvent,
  outingSettings,
  birthdays,
  unreadIdeasCount,
  firstVideo,
  onVideoClick,
}: SecondaryCardGridProps) {
  const outingActive = outingSettings?.is_active === 1;

  function renderCard(cardType: MusicianCardType) {
    switch (cardType) {
      case "profile":
        return (
          <ProfileCard profile={profile} loading={loading} profileComplete={profileComplete} />
        );
      case "adhesion":
        return (
          <AdhesionCard profile={profile} loading={loading} profileComplete={profileComplete} />
        );
      case "assurance":
        return (
          <AssuranceCard profile={profile} loading={loading} profileComplete={profileComplete} />
        );
      case "planning":
        return (
          <PlanningCard
            loading={loading}
            nextEvent={nextEvent}
            planningUrgent={planningUrgent}
            urgentEvent={urgentEvent}
          />
        );
      case "partitions":
        return <PartitionsCard profileComplete={profileComplete} />;
      case "boite-a-idee":
        return (
          <IdeaBoxCard profileComplete={profileComplete} unreadIdeasCount={unreadIdeasCount} />
        );
      case "outing":
        if (!outingActive || !outingSettings) return null;
        return (
          <OutingCard
            outingSettings={outingSettings}
            profile={profile}
            profileComplete={profileComplete}
          />
        );
      case "social":
        return (
          <SocialCard
            profileComplete={profileComplete}
            firstVideo={firstVideo}
            onVideoClick={onVideoClick}
          />
        );
      case "birthdays":
        return (
          <BirthdaysCard
            profileComplete={profileComplete}
            loading={loading}
            birthdays={birthdays}
          />
        );
      case "trombinoscope":
        return <TrombinoscopeCard profileComplete={profileComplete} />;
      default:
        return null;
    }
  }

  return (
    <motion.div
      data-testid="secondary-cards"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {cardOrder
        .filter((cardType) => cardType !== "outing" || outingActive)
        .map((cardType) => (
          <motion.div key={cardType} variants={itemVariants}>
            <div className="h-full hover-lift">{renderCard(cardType)}</div>
          </motion.div>
        ))}
    </motion.div>
  );
}
