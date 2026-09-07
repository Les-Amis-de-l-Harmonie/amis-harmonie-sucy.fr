"use client";

import { useState } from "react";
import { ExternalLink, Globe, LogOut, MoreHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { MusicianUserSummary } from "@/app/musician/MusicianUserSummary";
import {
  isNavItemActive,
  MUSICIAN_OVERFLOW_ITEMS,
} from "@/app/musician/musician-nav-items";
import { cn } from "@/lib/utils";

interface MusicianMoreSheetProps {
  pathname: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
}

/**
 * 5e "onglet" de la barre basse mobile : ouvre un panneau glissant depuis le
 * bas listant les sections de consultation ponctuelle définies dans
 * `MUSICIAN_OVERFLOW_ITEMS`, plus le site public, le thème et la déconnexion. C'est
 * l'équivalent mobile du bas de sidebar desktop, sous une présentation différente.
 *
 * Même distinction interne/externe qu'en sidebar desktop (libellé « Hors du
 * portail ») : Assurance et Trombinoscope restent dans le portail, Adhésion
 * et Partitions en sortent.
 */
export function MusicianMoreSheet({
  pathname,
  firstName,
  lastName,
  avatar,
}: MusicianMoreSheetProps) {
  const [open, setOpen] = useState(false);
  const tabActive = MUSICIAN_OVERFLOW_ITEMS.some((item) => isNavItemActive(item, pathname));
  const internalOverflowItems = MUSICIAN_OVERFLOW_ITEMS.filter((item) => !item.external);
  const externalOverflowItems = MUSICIAN_OVERFLOW_ITEMS.filter((item) => item.external);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Pas d'aria-current ici : ce bouton ouvre un panneau, ce n'est pas un
          lien vers la page courante — seul le style "actif" est conservé,
          pour signaler qu'une des pages qu'il contient est ouverte. */}
      <SheetTrigger
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium transition-colors",
          tabActive ? "text-primary" : "text-muted-foreground"
        )}
      >
        <MoreHorizontal className="h-[22px] w-[22px]" aria-hidden="true" />
        <span>Plus</span>
        {tabActive && (
          <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" aria-hidden="true" />
        )}
      </SheetTrigger>

      {/* aria-describedby={undefined} : ce panneau n'a pas de description,
          seulement un titre (sr-only ci-dessous) — sans ça Radix émet un
          avertissement console "Missing Description" à chaque ouverture. */}
      <SheetContent side="bottom" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle className="sr-only">Plus de sections</SheetTitle>
          <MusicianUserSummary
            firstName={firstName}
            lastName={lastName}
            avatar={avatar}
            size="sm"
          />
        </SheetHeader>

        <nav aria-label="Sections supplémentaires" className="space-y-1">
          {internalOverflowItems.map((item) => {
            const active = isNavItemActive(item, pathname);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  active ? "bg-primary/12 text-primary" : "text-foreground hover:bg-muted/60"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {item.label}
              </a>
            );
          })}

          {externalOverflowItems.length > 0 && (
            <p className="mt-3 border-t border-border px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              Hors du portail
            </p>
          )}

          {externalOverflowItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted/60"
            >
              <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="flex-1 truncate">
                {item.label}
                <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />
            </a>
          ))}

          <a
            href="/"
            className="flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <Globe className="h-5 w-5 shrink-0" aria-hidden="true" />
            Voir le site public
          </a>
        </nav>

        <div className="flex items-center gap-2 border-t border-border pt-4">
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

        {/* Réserve la zone de sécurité tactile (encoche / barre gestuelle) sur un
            élément dédié plutôt que sur le conteneur : évite tout conflit de
            spécificité avec le `p-6` déjà posé par SheetContent. */}
        <div className="pb-safe" aria-hidden="true" />
      </SheetContent>
    </Sheet>
  );
}
