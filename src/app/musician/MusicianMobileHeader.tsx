"use client";

import { useMusicianSession } from "@/app/musician/MusicianSession";
import { findActiveNavItem } from "@/app/musician/musician-nav-items";

interface MusicianMobileHeaderProps {
  pathname: string;
}

const FALLBACK_TITLE = "Espace musicien";

/**
 * Bandeau de titre compact, uniquement sous 640px (`sm:hidden` inversé —
 * voir §B4 : la tablette garde le <h1> propre à chaque page, seul le
 * téléphone a besoin de ce remplacement condensé). Sans état ni
 * gestionnaire d'événement ; lit seulement la session pour le rappel « Pour X ».
 *
 * Rendu en <p>, pas en <h1> : chacune des 6 pages du portail rend déjà son
 * propre <h1> (ex. MusicianDisponibilites.tsx, MusicianProfile.tsx…). Ce
 * libellé est un repère de navigation dans la coquille, pas un second titre
 * de document — un <h1> ici en dupliquerait un par page sous 640px.
 */
export function MusicianMobileHeader({ pathname }: MusicianMobileHeaderProps) {
  const current = findActiveNavItem(pathname);
  const { delegated, effective } = useMusicianSession();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:hidden">
      <p className="truncate font-heading text-base font-bold text-foreground">
        {(delegated ? (current?.tabLabel ?? current?.label) : current?.label) ?? FALLBACK_TITLE}
      </p>
      {/* Rappel permanent (l'en-tête reste visible au défilement) : le bandeau
          complet est en haut de page et sort de l'écran dès qu'on descend. */}
      {delegated && effective?.firstName && (
        <p className="ml-auto max-w-[45%] truncate rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-foreground">
          Pour {effective.firstName}
        </p>
      )}
    </header>
  );
}
