import { formatParisDateTime } from "./users-shared";

/**
 * Autorisation parentale d'un musicien pour un événement, telle que renvoyée par
 * `GET /api/admin/presence` pour les événements qui en demandent une.
 */
export interface PresenceAuthorization {
  status: "authorized" | "missing";
  authorizedBy: {
    name: string | null;
    relation: string | null;
    kind: "parent" | "admin" | "deleted" | "noProfile";
    paper: boolean;
  } | null;
  authorizedAt: string | null;
  /** Donnée sur un texte d'informations différent de celui d'aujourd'hui. */
  outdated: boolean;
}

export type AuthorizationState = "authorized" | "outdated" | "missing";

export function authorizationState(authorization: PresenceAuthorization): AuthorizationState {
  if (authorization.status !== "authorized") return "missing";
  return authorization.outdated ? "outdated" : "authorized";
}

export const AUTHORIZATION_STATE_LABELS: Record<AuthorizationState, string> = {
  authorized: "Autorisée",
  outdated: "Autorisée sur un texte antérieur",
  missing: "Autorisation manquante",
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** « par Aurélie (mère) », « saisie papier par un administrateur »… */
export function describeAuthorizedBy(authorization: PresenceAuthorization): string | null {
  const by = authorization.authorizedBy;
  if (!by) return null;
  if (by.paper && by.kind !== "parent") return "saisie papier par un admin";
  if (by.kind === "deleted") return "par un compte supprimé";
  if (by.kind === "noProfile") return "par un responsable";
  if (by.kind === "admin") {
    return by.name
      ? `saisie papier par ${firstName(by.name)} (admin)`
      : "saisie papier par un admin";
  }
  const parent = !by.name
    ? "par un responsable"
    : by.relation
      ? `par ${firstName(by.name)} (${by.relation})`
      : `par ${firstName(by.name)}`;
  return by.paper ? `${parent}, saisie papier par un admin` : parent;
}

/** Phrase complète pour une info-bulle ou le détail d'une case. */
export function describeAuthorization(authorization: PresenceAuthorization): string {
  const state = authorizationState(authorization);
  if (state === "missing") return AUTHORIZATION_STATE_LABELS.missing;
  let sentence = AUTHORIZATION_STATE_LABELS[state];
  const by = describeAuthorizedBy(authorization);
  // « Autorisée par Aurélie (mère) » se lit tout seul ; une saisie papier prend une virgule.
  if (by) sentence += by.startsWith("saisie papier") ? `, ${by}` : ` ${by}`;
  if (authorization.authorizedAt) {
    const formatted = formatParisDateTime(authorization.authorizedAt);
    if (!formatted.includes("NaN")) {
      const [day, time] = formatted.split(" ");
      sentence += ` le ${day} à ${time}`;
    }
  }
  return sentence;
}

/** Date seule (jj/mm/aaaa) pour les tableaux imprimés. */
export function formatAuthorizedDay(authorizedAt: string | null): string {
  if (!authorizedAt) return "";
  const formatted = formatParisDateTime(authorizedAt);
  return formatted.includes("NaN") ? "" : formatted.split(" ")[0];
}

export interface AuthorizationCounts {
  concerned: number;
  authorized: number;
  outdated: number;
  missing: number;
}

export function countAuthorizations(
  authorizations: (PresenceAuthorization | null | undefined)[]
): AuthorizationCounts {
  const counts: AuthorizationCounts = { concerned: 0, authorized: 0, outdated: 0, missing: 0 };
  for (const authorization of authorizations) {
    if (!authorization) continue;
    counts.concerned += 1;
    const state = authorizationState(authorization);
    if (state === "missing") counts.missing += 1;
    else {
      counts.authorized += 1;
      if (state === "outdated") counts.outdated += 1;
    }
  }
  return counts;
}
