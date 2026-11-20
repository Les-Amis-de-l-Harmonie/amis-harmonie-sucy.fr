"use client";

import { cn } from "@/lib/utils";
import { MUSICIAN_TAB_ITEMS } from "@/app/musician/musician-nav-items";
import { isMusicianPathActive } from "@/app/musician/isMusicianPathActive";
import { MusicianMoreSheet } from "@/app/musician/MusicianMoreSheet";
import {
  MUSICIAN_TAB_ACTIVE_CLASSNAME,
  MUSICIAN_TAB_CLASSNAME,
  MUSICIAN_TAB_IDLE_CLASSNAME,
} from "@/app/musician/musician-tab-styles";

interface MusicianBottomTabBarProps {
  pathname: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
}

/**
 * Seule navigation visible en dessous de 1024px (mobile ET tablette —
 * aucun troisième comportement intermédiaire, voir direction design §B2 :
 * c'est exactement la plage où coexistaient les deux anciens hamburgers).
 * 3 sections à onglet direct + le sheet « Plus » pour les 5 restantes.
 *
 * L'indicateur actif est une pastille contrastée — jamais une translation
 * ni un changement de taille, pour que la barre reste un
 * élément d'ancrage parfaitement stable au fil des taps.
 */
export function MusicianBottomTabBar({
  pathname,
  firstName,
  lastName,
  avatar,
}: MusicianBottomTabBarProps) {
  return (
    // Barre collée au bord bas de l'écran, pleine largeur : elle ne recouvre
    // jamais le contenu (MusicianLayout réserve sa hauteur). La zone de sécurité
    // (barre gestuelle) est ajoutée en padding DANS la barre, pour que le fond
    // aille jusqu'au bord et que les cibles restent au-dessus du geste système.
    // Hauteur hors zone de sécurité : 1px bordure + 6px + 56px d'onglet + 8px = 71px.
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-primary-foreground/15 bg-primary px-2 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] text-primary-foreground shadow-[0_-4px_16px_-8px] shadow-black/25 lg:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {MUSICIAN_TAB_ITEMS.map((item) => {
          const active = isMusicianPathActive(pathname, item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                MUSICIAN_TAB_CLASSNAME,
                active ? MUSICIAN_TAB_ACTIVE_CLASSNAME : MUSICIAN_TAB_IDLE_CLASSNAME
              )}
            >
              <item.icon className="h-[22px] w-[22px]" aria-hidden="true" />
              <span className="tracking-tight">{item.tabLabel ?? item.label}</span>
            </a>
          );
        })}
        <MusicianMoreSheet
          pathname={pathname}
          firstName={firstName}
          lastName={lastName}
          avatar={avatar}
        />
      </div>
    </nav>
  );
}
