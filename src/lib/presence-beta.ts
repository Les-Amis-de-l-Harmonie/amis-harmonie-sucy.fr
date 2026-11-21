/**
 * Les réponses de présence en ligne sont en bêta (décision de Maxime, 21/11/2026) :
 * seuls les testeurs ci-dessous peuvent répondre sur le site. Tous les autres
 * musiciens voient un message qui les renvoie vers le fichier des présences.
 *
 * Pour ouvrir la fonctionnalité à tous : mettre PRESENCE_BETA_ENABLED à false
 * (le serveur et l'espace musicien suivent), puis déployer.
 */
export const PRESENCE_BETA_ENABLED = true;

/** Adresses de connexion (compte musicien) autorisées à répondre sur le site. */
export const PRESENCE_BETA_TESTERS: readonly string[] = ["leducmaxime@gmail.com"];

/** Fichier Google Sheets « Planning/Présence », où les musiciens répondent pour l'instant. */
export const PRESENCE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/17UAV3DKOReGBluVfPCSybkAj1OxObkC9fUiSsljZOac/edit#gid=1506151961";

/** Fonction pure permettant de vérifier la règle avec une configuration explicite. */
export function canAnswerPresenceOnlineWithConfig(
  actorEmail: string | null | undefined,
  enabled: boolean,
  testers: readonly string[]
): boolean {
  if (!enabled) return true;
  const email = (actorEmail ?? "").trim().toLowerCase();
  return testers.some((tester) => tester.trim().toLowerCase() === email);
}

/** Le compte connecté (l'acteur, pas l'enfant pour lequel il agit) peut-il répondre sur le site ? */
export function canAnswerPresenceOnline(actorEmail: string | null | undefined): boolean {
  return canAnswerPresenceOnlineWithConfig(
    actorEmail,
    PRESENCE_BETA_ENABLED,
    PRESENCE_BETA_TESTERS
  );
}
