/**
 * Feuille A4 portrait, fond blanc forcé (même en thème sombre) pour les listes imprimables
 * de l'admin (Familles, autorisations parentales). À placer dans un `<style>` de la vue.
 */
export const PRINT_PAGE_CSS =
  "@page { size: A4 portrait; margin: 12mm; } @media print { html, body, html.dark, html.dark body { background: #fff !important; } }";
