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
 * 4 sections à onglet direct + le sheet « Plus » pour les 4 restantes.
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
    // La barre flotte au-dessus de la zone gestuelle sans réduire les cibles
    // tactiles. MusicianLayout réserve sa hauteur et ses marges dans le flux.
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] z-40 mx-auto max-w-md rounded-[1.75rem] border border-primary-foreground/10 bg-primary p-1.5 text-primary-foreground shadow-[0_8px_32px_-8px] shadow-primary-foreground/25 lg:hidden"
    >
      <div className="grid grid-cols-5 gap-1">
        {MUSICIAN_TAB_ITEMS.map((item) => {
          const active = isMusicianPathActive(pathname, item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[1.25rem] px-0.5 py-2 text-[10px] leading-tight font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground min-[360px]:text-[11px] motion-reduce:transition-none",
                active
                  ? "bg-primary-foreground text-primary"
                  : "text-primary-foreground hover:bg-primary-foreground/10"
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
