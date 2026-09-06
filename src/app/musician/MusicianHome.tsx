"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import type { Video } from "@/db/types";
import { useMusicianDashboardData } from "./useMusicianDashboardData";
import { EssentialsZone } from "./EssentialsZone";
import { SecondaryCardGrid } from "./SecondaryCardGrid";
import { VideoModal } from "./VideoModal";

interface MusicianHomeClientProps {
  userId: number;
  firstName: string;
  lastName: string;
}

// Seules animations d'entrée conservées (voir direction design §G1) : la
// salutation et la carte info admin restent des fondus/glissés ponctuels au
// premier rendu. Le stagger de la grille secondaire vit dans
// `SecondaryCardGrid`. Aucune animation de survol par `motion.div` : voir
// `.hover-lift` (CSS pur) posé dans `SecondaryCardGrid`.
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
 * Dashboard hiérarchisé à deux zones (voir direction design §C) :
 *  - `EssentialsZone` — ordre fixe par urgence, jamais piloté par l'admin ;
 *  - `SecondaryCardGrid` — les 10 cartes dans l'ordre de `cardOrder`.
 * Ce composant ne fait plus que l'assemblage : tout le calcul de données vit
 * dans `useMusicianDashboardData`, toute la logique d'affichage vit dans les
 * composants qu'il compose.
 */
export function MusicianHomeClient({
  userId: _userId,
  firstName,
  lastName: _lastName,
}: MusicianHomeClientProps) {
  const data = useMusicianDashboardData();
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const displayName = firstName || "Musicien";

  return (
    <div className="relative space-y-6">
      {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}

      <motion.div initial="hidden" animate="visible" variants={headerVariants}>
        <h1 className="text-2xl font-bold text-foreground">Bonjour, {displayName} !</h1>
        <p className="text-muted-foreground">Bienvenue dans votre espace personnel</p>
      </motion.div>

      {/* Cartouche éditoriale du bureau : garde sa place au-dessus de la zone
          essentiels, comportement inchangé. */}
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

      <EssentialsZone
        loading={data.loading}
        firstName={displayName}
        profile={data.profile}
        profileComplete={data.profileComplete}
        planningUrgent={data.planningUrgent}
        urgentEvent={data.urgentEvent}
        nextEvent={data.nextEvent}
      />

      <div>
        <h2 className="mb-4 font-heading text-lg font-bold text-foreground">Vos accès rapides</h2>
        <SecondaryCardGrid
          cardOrder={data.cardOrder}
          profile={data.profile}
          loading={data.loading}
          profileComplete={data.profileComplete}
          nextEvent={data.nextEvent}
          planningUrgent={data.planningUrgent}
          urgentEvent={data.urgentEvent}
          outingSettings={data.outingSettings}
          birthdays={data.birthdays}
          unreadIdeasCount={data.unreadIdeasCount}
          firstVideo={data.firstVideo}
          onVideoClick={setActiveVideo}
        />
      </div>
    </div>
  );
}
