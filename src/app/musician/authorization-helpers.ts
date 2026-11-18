import { isEventPast } from "@/lib/dates";
import type { PresenceAuthorization, PresenceEvent } from "./musician-types";

/**
 * Une sortie à venir dont l'autorisation parentale manque ou doit être confirmée de
 * nouveau. La carte de l'événement doit alors rester visible même si le musicien a
 * déjà répondu « présent » : sinon le responsable ne verrait jamais le bloc.
 */
export function needsAuthorizationAttention(event: PresenceEvent): boolean {
  const authorization = event.authorization;
  if (!authorization || isEventPast(event.date)) return false;
  return authorization.status === "missing" || authorization.outdated;
}

/**
 * La carte d'une sortie à venir reste affichée tant qu'un responsable peut encore agir
 * sur son autorisation (la donner, la confirmer ou la retirer) : sans cela, la carte
 * disparaîtrait dès qu'il a cliqué sur « J'autorise », sans confirmation ni moyen de
 * revenir en arrière. Pour le jeune (lecture seule), seules les autorisations à traiter
 * justifient de garder la carte visible.
 */
export function showsAuthorizationCard(event: PresenceEvent): boolean {
  const authorization = event.authorization;
  if (!authorization || isEventPast(event.date)) return false;
  return authorization.canAuthorize || needsAuthorizationAttention(event);
}

/** Résumé d'une ligne pour la liste « Réponses » (mobile) : état + ton visuel. */
export function summarizeAuthorization(authorization: PresenceAuthorization): {
  label: string;
  tone: "ok" | "warning";
} {
  if (authorization.status === "missing") {
    return { label: "Autorisation parentale manquante", tone: "warning" };
  }
  if (authorization.outdated) {
    return { label: "Autorisation parentale à confirmer", tone: "warning" };
  }
  return { label: "Autorisation parentale donnée", tone: "ok" };
}
