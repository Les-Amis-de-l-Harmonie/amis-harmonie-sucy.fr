"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Info } from "lucide-react";
import type { Video } from "@/db/types";
import { useMusicianDashboardData } from "./useMusicianDashboardData";
import { JourneyModule } from "./JourneyModule";
import { PrestationsModule } from "./PrestationsModule";
import { RecentIdeasModule } from "./RecentIdeasModule";
import { BirthdaysModule } from "./BirthdaysModule";
import { VideoModule } from "./VideoModule";
import { OutingModule } from "./OutingModule";
import { VideoModal } from "./VideoModal";

interface MusicianHomeClientProps {
  userId: number;
  firstName: string;
  lastName: string;
}

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

const infoCardVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

/**
 * Architecture retenue en Phase 2b (voir le rapport) : la grille de 10
 * cartes de navigation disparaît, remplacée par deux zones dans l'ordre
 * exigé par la spécification —
 *
 *  1. `JourneyModule` — parcours de complétion chiffré, profil → adhésion →
 *     assurance → réponses de présence. Remplace `EssentialsZone` et les
 *     bandeaux d'alerte associés (`ProfileAlertBanner`, `MembershipAlerts`,
 *     `AllClearBanner`) : un seul endroit qui dit "où j'en suis" et "quelle
 *     est la prochaine action", jamais un simple booléen.
 *  2. Contenu réel — `PrestationsModule`, `RecentIdeasModule`,
 *     `BirthdaysModule`, `VideoModule`, `OutingModule` (si actif). Chacun
 *     remplace une carte de navigation devenue redondante avec la nouvelle
 *     sidebar, en montrant ce qu'il y a réellement à voir plutôt qu'un
 *     simple lien.
 *
 * `PartitionsCard`, `TrombinoscopeCard` et `ProfileCard` (carte de
 * navigation pure) n'ont pas de remplaçant : la sidebar fait déjà ce travail
 * (voir `musician-nav-items.ts`), et le profil est représenté par sa
 * première étape dans `JourneyModule`.
 */
export function MusicianHomeClient({
  userId: _userId,
  firstName,
  lastName: _lastName,
}: MusicianHomeClientProps) {
  const data = useMusicianDashboardData();
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const displayName = firstName || "Musicien";
  const shouldReduceMotion = useReducedMotion();
  const outingActive = data.outingSettings?.is_active === 1;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: shouldReduceMotion ? 0 : 0.08 },
    },
  };

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0 : 0.45,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <div className="relative space-y-6">
      {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}

      <motion.div initial="hidden" animate="visible" variants={headerVariants}>
        <h1 className="text-2xl font-bold text-foreground">Bonjour, {displayName} !</h1>
        <p className="text-muted-foreground">
          Voici où vous en êtes, et ce qui se passe à l&apos;harmonie.
        </p>
      </motion.div>

      {/* Cartouche éditoriale du bureau : garde sa place au-dessus du parcours
          de complétion, comportement inchangé depuis l'ancien MusicianHome. */}
      {data.infoSettings?.is_active === 1 && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={infoCardVariants}
          className={`rounded-lg border p-4 ${data.infoSettings.bg_color} ${data.infoSettings.border_color}`}
        >
          <div className="flex items-start gap-3">
            <Info className={`mt-0.5 h-5 w-5 ${data.infoSettings.text_color}`} aria-hidden="true" />
            <div className="flex-1">
              <h3 className={`text-lg font-semibold ${data.infoSettings.text_color}`}>
                {data.infoSettings.title || "Information"}
              </h3>
              {data.infoSettings.subtitle && (
                <p
                  className={`mt-1 text-sm font-medium opacity-80 ${data.infoSettings.text_color}`}
                >
                  {data.infoSettings.subtitle}
                </p>
              )}
              {data.infoSettings.content && (
                <div
                  className={`mt-2 rich-text-content ${data.infoSettings.text_color}`}
                  dangerouslySetInnerHTML={{ __html: data.infoSettings.content }}
                />
              )}
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        <motion.div variants={itemVariants}>
          <JourneyModule
            loading={data.loading}
            profile={data.profile}
            planningUrgent={data.planningUrgent}
            urgentEvent={data.urgentEvent}
            pendingCount={data.pendingCount}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Quoi de neuf</h2>

          <div className="space-y-6">
            <PrestationsModule
              loading={data.loading}
              nextEvent={data.nextEvent}
              planningUrgent={data.planningUrgent}
              urgentEvent={data.urgentEvent}
            />

            <RecentIdeasModule loading={data.loading} ideas={data.recentIdeas} />

            <div className="grid gap-6 sm:grid-cols-2">
              <BirthdaysModule loading={data.loading} birthdays={data.birthdays} />
              <VideoModule
                loading={data.loading}
                video={data.firstVideo}
                onVideoClick={setActiveVideo}
              />
            </div>

            {!data.loading && outingActive && data.outingSettings && (
              <OutingModule outingSettings={data.outingSettings} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
