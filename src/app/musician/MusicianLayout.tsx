"use client";

import { MusicianSidebar } from "@/app/musician/MusicianSidebar";
import { MusicianMobileHeader } from "@/app/musician/MusicianMobileHeader";
import { MusicianBottomTabBar } from "@/app/musician/MusicianBottomTabBar";

interface MusicianLayoutProps {
  children: React.ReactNode;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  pathname: string;
}

/**
 * Coquille du portail musicien : sidebar persistante sur desktop (≥1024px),
 * bandeau de titre + barre d'onglets basse en dessous de 1024px (mobile ET
 * tablette, aucun troisième comportement intermédiaire — voir §B2 de la
 * direction design). Remplace l'ancienne top-nav à 2 liens et les deux menus
 * mobiles empilés (`MusicianNav` + menu du layout), désormais supprimés.
 *
 * Les 6 routes gardées du portail instancient ce composant **en ligne**
 * depuis `src/worker.tsx` (jamais via `layout()`, qui ne transmet aucune prop
 * personnalisée) — c'est la seule façon de faire transiter `firstName` /
 * `lastName` / `avatar` issus de l'auth. `pathname` est passé en prop depuis
 * la même route (décision D6) plutôt que lu via `window.location` pendant le
 * rendu, pour éliminer l'écart d'hydratation qui rendait l'état actif faux
 * au premier paint serveur.
 */
export function MusicianLayout({
  children,
  firstName,
  lastName,
  avatar,
  pathname,
}: MusicianLayoutProps) {
  return (
    <div className="min-h-screen bg-background lg:flex">
      <MusicianSidebar
        pathname={pathname}
        firstName={firstName}
        lastName={lastName}
        avatar={avatar}
      />

      <MusicianMobileHeader pathname={pathname} />

      {/* pb-* : réserve la hauteur de la barre d'onglets basse (64px) + sa
          propre zone de sécurité tactile (voir MusicianBottomTabBar) — sans
          cette marge, le bas de page repasserait sous la barre sur un
          appareil à encoche. max-w-6xl : plafond de largeur du contenu,
          repris à l'identique de l'ancien MusicianLayout (qui allait jusqu'à
          max-w-7xl en 2xl ; 6xl suffit ici et évite des lignes de formulaire
          ou des cartes de dashboard étirées à l'excès sur grand écran). */}
      <main className="min-w-0 flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-6 sm:px-6 lg:px-8 lg:pb-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      <MusicianBottomTabBar
        pathname={pathname}
        firstName={firstName}
        lastName={lastName}
        avatar={avatar}
      />
    </div>
  );
}
