/**
 * Détection de route active à partir d'un `pathname` déjà connu au rendu
 * (passé en prop depuis `src/worker.tsx`, jamais lu via `window.location` —
 * voir décision D6 : lire `window.location.pathname` pendant le rendu créait
 * un écart d'hydratation, l'état actif étant faux au premier paint serveur).
 *
 * Fonction pure à deux arguments plutôt qu'un hook `useX` retournant une
 * fonction : le préfixe `use` faisait appliquer `react-hooks/rules-of-hooks`
 * (interdiction de l'appeler dans une condition ou une boucle) à une
 * fonction qui n'a ni état ni effet — une contrainte artificielle, gênante
 * dès que les sites d'appel se multiplient (Phases 2-3).
 */
export function isMusicianPathActive(pathname: string, href: string): boolean {
  // "/musician/" est la racine : elle ne doit être active que sur elle-même,
  // jamais en préfixe des autres pages (sinon toutes les pages du portail
  // allumeraient aussi l'onglet Accueil).
  if (href === "/musician/") {
    return pathname === "/musician" || pathname === "/musician/";
  }

  const normalizedHref = href.endsWith("/") ? href.slice(0, -1) : href;
  return pathname === normalizedHref || pathname.startsWith(`${normalizedHref}/`);
}
