"use client";

import { cn } from "@/lib/utils";
import { MUSICIAN_TAB_ITEMS } from "@/app/musician/musician-nav-items";
import { isMusicianPathActive } from "@/app/musician/isMusicianPathActive";
import { MusicianMoreSheet } from "@/app/musician/MusicianMoreSheet";

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
 * 4 sections à onglet direct + le sheet « Plus » pour les 2 restantes.
 *
 * L'indicateur actif est une couleur + un point sous le label — jamais une
 * translation ni un changement de taille, pour que la barre reste un
 * élément d'ancrage parfaitement stable au fil des taps.
 */
export function MusicianBottomTabBar({
  pathname,
  firstName,
  lastName,
  avatar,
}: MusicianBottomTabBarProps) {
  return (
    // La zone de sécurité tactile (encoche / barre gestuelle) vit sur cet
    // élément externe, en plus de la hauteur de la rangée — jamais mêlée à
    // elle. Avec `box-sizing: border-box` (Preflight), un `pb-safe` posé
    // directement sur un conteneur `h-16` aurait rogné cette même hauteur au
    // lieu de s'y ajouter : à 34px d'encoche, la rangée interne serait
    // tombée à 14px de haut. Voir gate @oracle Phase 1 (B2).
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom,0px)] shadow-elevation-1 lg:hidden"
    >
      <div className="flex h-16 items-stretch px-1">
        {MUSICIAN_TAB_ITEMS.map((item) => {
          const active = isMusicianPathActive(pathname, item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-[22px] w-[22px]" aria-hidden="true" />
              <span>{item.tabLabel ?? item.label}</span>
              {active && (
                <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
              )}
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
