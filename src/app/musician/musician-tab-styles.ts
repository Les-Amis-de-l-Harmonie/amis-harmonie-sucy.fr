/**
 * Styles partagés par les quatre onglets de la barre basse mobile
 * (`MusicianBottomTabBar` et le bouton « Plus » de `MusicianMoreSheet`).
 *
 * Texte et icônes en `primary-foreground` (sombre) sur le fond `primary`
 * (clair), en thème clair comme sombre. L'onglet actif est une pastille
 * « carte » (blanche en clair, bleu nuit en sombre) dont le texte suit
 * `card-foreground`, cerclée d'un contour foncé — jamais de translation ni de
 * changement de taille.
 */
export const MUSICIAN_TAB_CLASSNAME =
  "flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 py-2 text-[10px] leading-tight font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground min-[360px]:text-[11px] motion-reduce:transition-none";

// Contour intérieur foncé (`ring-inset` : aucune taille ni position ne change) :
// la pastille claire seule ne ferait que 2,16:1 contre la barre en thème clair ;
// le contour `primary-foreground` atteint ≥ 8:1 contre elle (WCAG 1.4.11, ≥ 3:1).
export const MUSICIAN_TAB_ACTIVE_CLASSNAME =
  "bg-card text-card-foreground shadow-sm ring-2 ring-inset ring-primary-foreground";

export const MUSICIAN_TAB_IDLE_CLASSNAME = "text-primary-foreground hover:bg-primary-foreground/10";
