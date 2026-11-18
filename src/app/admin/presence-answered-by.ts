import { formatParisDateTime } from "./users-shared";

/** Qui a saisi la réponse, quand ce n'est pas le musicien lui-même (`GET /api/admin/presence`). */
export interface PresenceAnsweredBy {
  name: string | null;
  relation: string | null;
  isAdmin: boolean;
  /** Type d'auteur, pour éviter de déduire les replis depuis le texte affiché. */
  kind?: "parent" | "admin" | "deleted" | "noProfile";
}

function fallbackName(answeredBy: PresenceAnsweredBy): string | null {
  if (answeredBy.kind === "deleted") return "un compte supprimé";
  if (answeredBy.kind === "noProfile") {
    return answeredBy.isAdmin ? "un administrateur" : "un compte sans profil";
  }

  // Tolère les anciennes réponses sérialisées avant l'ajout du discriminant.
  const legacyName = answeredBy.name?.trim().toLowerCase();
  if (legacyName === "un administrateur") return "un administrateur";
  if (legacyName === "un compte supprimé") return "un compte supprimé";
  if (legacyName === "un compte sans profil") return "un compte sans profil";
  if (!answeredBy.name?.trim()) return answeredBy.isAdmin ? "un administrateur" : null;
  return null;
}

function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Mention courte sous la pastille : « par Aurélie (mère) », « par Mario (admin) ». */
export function formatAnsweredByShort(answeredBy: PresenceAnsweredBy): string {
  const fallback = fallbackName(answeredBy);
  if (fallback) return `par ${fallback}`;
  const name = answeredBy.name?.trim();
  if (!name) return "";
  const who = firstNameOf(name);
  if (answeredBy.isAdmin) return `par ${who} (admin)`;
  if (answeredBy.relation) return `par ${who} (${answeredBy.relation})`;
  return `par ${who}`;
}

/** Phrase complète pour l'info-bulle : nom entier, lien de parenté, date et heure de Paris. */
export function formatAnsweredByLong(
  answeredBy: PresenceAnsweredBy,
  answeredAt: string | null | undefined
): string {
  const fallback = fallbackName(answeredBy);
  const name = answeredBy.name?.trim();
  let who = fallback ?? name ?? "";
  if (!who) return "Réponse donnée par un compte sans profil";
  if (!fallback) {
    if (answeredBy.isAdmin) who += " (admin)";
    else if (answeredBy.relation) who += ` (${answeredBy.relation})`;
  }
  const sentence = `Réponse donnée par ${who}`;
  if (!answeredAt) return sentence;
  const formatted = formatParisDateTime(answeredAt);
  if (formatted.includes("NaN")) return sentence;
  const [day, time] = formatted.split(" ");
  return `${sentence} le ${day} à ${time}`;
}
