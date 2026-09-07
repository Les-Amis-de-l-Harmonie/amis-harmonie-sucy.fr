"use client";

import { Globe, LogOut } from "lucide-react";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { MusicianUserSummary } from "@/app/musician/MusicianUserSummary";
import { MusicianSidebarNavItem } from "@/app/musician/MusicianSidebarNavItem";
import { isNavItemActive, MUSICIAN_NAV_ITEMS } from "@/app/musician/musician-nav-items";

interface MusicianSidebarProps {
  pathname: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
}

/**
 * Navigation latérale persistante, visible en permanence sur desktop
 * (≥ 1024px). Remplace la top-nav à 2 liens et le double système de menu
 * mobile empilé (`MusicianNav` + menu du layout, tous deux supprimés).
 *
 * Largeur fixe 288px (`w-72`), non collapsible : ce public d'âges variés
 * gagne davantage à une lisibilité constante qu'à un mode icônes-seules.
 *
 * Les entrées internes et externes (`item.external`) sont rendues en deux
 * groupes séparés par un simple libellé « Hors du portail » : à 8 entrées,
 * un vrai modèle de groupes génériques serait disproportionné, mais la
 * différence de nature (rester dans le portail / le quitter) mérite mieux
 * qu'un alignement indifférencié.
 */
export function MusicianSidebar({ pathname, firstName, lastName, avatar }: MusicianSidebarProps) {
  const internalItems = MUSICIAN_NAV_ITEMS.filter((item) => !item.external);
  const externalItems = MUSICIAN_NAV_ITEMS.filter((item) => item.external);

  return (
    <aside
      aria-label="Navigation du portail musicien"
      className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-r border-border bg-surface-raised lg:flex"
    >
      <div className="flex flex-col gap-4 border-b border-border px-6 py-6">
        <a href="/musician/" className="flex-shrink-0">
          <img
            src="/images/logo.webp"
            alt="Les Amis de l'Harmonie de Sucy"
            className="h-10 w-auto dark:hidden"
          />
          <img
            src="/images/logo-dark.webp"
            alt="Les Amis de l'Harmonie de Sucy"
            className="hidden h-10 w-auto dark:block"
          />
        </a>
        <MusicianUserSummary firstName={firstName} lastName={lastName} avatar={avatar} />
      </div>

      <nav
        aria-label="Sections de l'espace musicien"
        className="flex-1 space-y-1 overflow-y-auto px-4 py-4"
      >
        {internalItems.map((item) => (
          <MusicianSidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            external={item.external}
            active={isNavItemActive(item, pathname)}
          />
        ))}

        {externalItems.length > 0 && (
          <p className="mt-3 border-t border-border px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Hors du portail
          </p>
        )}

        {externalItems.map((item) => (
          <MusicianSidebarNavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            external={item.external}
            active={isNavItemActive(item, pathname)}
          />
        ))}
      </nav>

      <div className="border-t border-border px-4 py-3">
        <a
          href="/"
          className="flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <Globe className="h-5 w-5 shrink-0" aria-hidden="true" />
          Voir le site public
        </a>
      </div>

      <div className="flex items-center gap-2 border-t border-border px-4 py-4">
        <ThemeToggle />
        <form action="/musician/logout" method="post" className="flex-1">
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 cursor-pointer"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
