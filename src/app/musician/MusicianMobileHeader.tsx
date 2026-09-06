import { MUSICIAN_NAV_ITEMS } from "@/app/musician/musician-nav-items";
import { isMusicianPathActive } from "@/app/musician/isMusicianPathActive";

interface MusicianMobileHeaderProps {
  pathname: string;
}

const FALLBACK_TITLE = "Espace musicien";

/**
 * Bandeau de titre compact, uniquement sous 640px (`sm:hidden` inversé —
 * voir §B4 : la tablette garde le <h1> propre à chaque page, seul le
 * téléphone a besoin de ce remplacement condensé). Purement présentationnel,
 * aucun état ni gestionnaire d'événement.
 *
 * Rendu en <p>, pas en <h1> : chacune des 6 pages du portail rend déjà son
 * propre <h1> (ex. MusicianDisponibilites.tsx, MusicianProfile.tsx…). Ce
 * libellé est un repère de navigation dans la coquille, pas un second titre
 * de document — un <h1> ici en dupliquerait un par page sous 640px.
 */
export function MusicianMobileHeader({ pathname }: MusicianMobileHeaderProps) {
  const current = MUSICIAN_NAV_ITEMS.find((item) => isMusicianPathActive(pathname, item.href));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/95 px-4 backdrop-blur-sm sm:hidden">
      <p className="truncate font-heading text-base font-bold text-foreground">
        {current?.label ?? FALLBACK_TITLE}
      </p>
    </header>
  );
}
