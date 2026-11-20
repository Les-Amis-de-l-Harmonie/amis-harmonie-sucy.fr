import type { PresenceAnsweredBy } from "./musician-types";

/**
 * « Réponse donnée par Aurélie (mère) », « … par Aurélie » sans lien de parenté,
 * « … par l'association » pour un administrateur. `null` quand le musicien a
 * répondu lui-même (ou que l'API ne renseigne pas l'auteur).
 */
export function formatAnsweredBy(answeredBy: PresenceAnsweredBy | null | undefined): string | null {
  if (!answeredBy) return null;
  if (answeredBy.byYou) return "Réponse donnée par vous";
  if (answeredBy.byAssociation) return "Réponse donnée par l'association";
  const name = answeredBy.name?.trim();
  if (!name) return null;
  const relation = answeredBy.relation?.trim();
  return relation ? `Réponse donnée par ${name} (${relation})` : `Réponse donnée par ${name}`;
}

/** « 1 présent sur 8 », « 12 présents sur 36 » : chiffres neutres, sans seuil ni alerte. */
export function formatPresentOnTotal(present: number, total: number): string {
  return `${present} présent${present > 1 ? "s" : ""} sur ${total}`;
}
