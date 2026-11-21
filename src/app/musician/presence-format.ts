import type { PresenceAnsweredBy, PresenceEvent } from "./musician-types";

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

type PracticalInfoSource = Pick<PresenceEvent, "call_time" | "dress_code" | "musician_notes">;

export interface PracticalInfo {
  /** « 10H30 » : heure de rendez-vous, telle que saisie. */
  callTime: string | null;
  dressCode: string | null;
  /** Consignes multi-lignes : les sauts de ligne sont à conserver à l'affichage. */
  notes: string | null;
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Rendez-vous, tenue et consignes d'une prestation, sans valeur vide. */
export function getPracticalInfo(event: PracticalInfoSource): PracticalInfo {
  return {
    callTime: clean(event.call_time),
    dressCode: clean(event.dress_code),
    notes: clean(event.musician_notes),
  };
}

/** « Rendez-vous 10H30 · Tenue : noir » pour une ligne de liste ; `null` s'il n'y a rien. */
export function formatPracticalSummary(event: PracticalInfoSource): string | null {
  const { callTime, dressCode } = getPracticalInfo(event);
  const parts = [
    callTime ? `Rendez-vous ${callTime}` : null,
    dressCode ? `Tenue : ${dressCode}` : null,
  ];
  const summary = parts.filter(Boolean).join(" · ");
  return summary || null;
}
