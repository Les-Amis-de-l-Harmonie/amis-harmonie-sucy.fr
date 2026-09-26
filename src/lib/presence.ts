import { compareInstruments } from "@/lib/instruments";

// Cette requête est conservée pour la grille d'administration : elle inclut les comptes
// ADMIN qui jouent d'un instrument, notamment le chef d'orchestre. Ne JAMAIS y ajouter
// la colonne `comment` ; les commentaires sont joints séparément côté administration.
export const PRESENCE_MEMBER_QUERY = `SELECT
  u.id                 AS userId,
  mp.first_name        AS firstName,
  mp.last_name         AS lastName,
  hi.instrument_name   AS instrument,
  hi.is_primary        AS isPrimary,
  ep.status            AS status,
  ep.status_changed_at AS statusChangedAt
FROM users u
JOIN musician_profiles mp ON mp.user_id = u.id
LEFT JOIN harmonie_instruments hi ON hi.user_id = u.id
LEFT JOIN event_presences ep ON ep.user_id = u.id AND ep.event_id = ?
WHERE u.is_active = 1
  AND (
    u.role = 'MUSICIAN'
    OR EXISTS (SELECT 1 FROM harmonie_instruments h WHERE h.user_id = u.id)
  )`;

// Le portail musicien ne doit pas confondre deux comptes distincts d'une même personne :
// seuls les comptes MUSICIAN actifs font partie de son roster. La condition d'adhésion
// reste volontairement absente, comme pour la grille d'administration.
export const MUSICIAN_PRESENCE_MEMBER_QUERY = `SELECT
  u.id                 AS userId,
  mp.first_name        AS firstName,
  mp.last_name         AS lastName,
  hi.instrument_name   AS instrument,
  hi.is_primary        AS isPrimary,
  ep.status            AS status,
  ep.status_changed_at AS statusChangedAt
FROM users u
JOIN musician_profiles mp ON mp.user_id = u.id
LEFT JOIN harmonie_instruments hi ON hi.user_id = u.id
LEFT JOIN event_presences ep ON ep.user_id = u.id AND ep.event_id = ?
WHERE u.is_active = 1
  AND u.role = 'MUSICIAN'`;

// Les deux variantes d'enregistrement d'une réponse sont placées côte à côte :
// elles ne diffèrent que par la ligne `comment`, et cette différence est délibérée.
//
// Dans les deux cas, `updated_at` est posé à la main (SQLite n'a pas de sémantique
// ON UPDATE) et `status_changed_at` ne bouge QUE lors d'un vrai changement de statut :
// modifier un commentaire ne doit pas déclencher la fausse alerte « réponse modifiée
// après la date limite ».

/**
 * Variante MUSICIEN : le commentaire est remplacé tel quel.
 * C'est correct ici, car un musicien soumet toujours son commentaire en même temps
 * que son statut — vider le champ signifie donc bien « supprimer mon commentaire ».
 */
export const PRESENCE_UPSERT_SQL = `INSERT INTO event_presences (event_id, user_id, status, comment, status_changed_at, created_at, updated_at)
VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
ON CONFLICT(event_id, user_id) DO UPDATE SET
  status = excluded.status,
  comment = excluded.comment,
  updated_at = datetime('now'),
  status_changed_at = CASE
    WHEN excluded.status <> event_presences.status THEN datetime('now')
    ELSE event_presences.status_changed_at
  END`;

/**
 * Variante ADMINISTRATEUR : un commentaire absent de la requête est PRÉSERVÉ.
 *
 * La grille d'administration ne modifie que le statut. Avec un remplacement pur,
 * corriger une case effaçait silencieusement le commentaire écrit par le musicien
 * (« Je suis en congés cette semaine-là. ») — c'est-à-dire exactement le contexte
 * sur lequel se fonde la décision d'embaucher un renfort, perdu sans avertissement
 * ni moyen de le récupérer.
 *
 * Conséquence assumée : un administrateur ne peut pas vider un commentaire. Aucune
 * interface ne le propose, et préserver est le sens sûr.
 */
export const PRESENCE_UPSERT_ADMIN_SQL = `INSERT INTO event_presences (event_id, user_id, status, comment, status_changed_at, created_at, updated_at)
VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
ON CONFLICT(event_id, user_id) DO UPDATE SET
  status = excluded.status,
  comment = COALESCE(excluded.comment, event_presences.comment),
  updated_at = datetime('now'),
  status_changed_at = CASE
    WHEN excluded.status <> event_presences.status THEN datetime('now')
    ELSE event_presences.status_changed_at
  END`;

export interface PresenceRow {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instrument: string | null;
  isPrimary: number | null;
  status: "present" | "absent" | null;
  statusChangedAt: string | null;
}

export interface PresenceMember {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  primaryInstrument: string | null;
  status: "present" | "absent" | null;
}

export interface PresenceSummary {
  totalMembers: number;
  present: number;
  absent: number;
  noAnswer: number;
  members: PresenceMember[];
}

interface PresenceMemberAccumulator {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: Set<string>;
  primaryInstruments: Set<string>;
  status: "present" | "absent" | null;
}

export function compareMembersByName(
  a: { userId: number; firstName: string | null; lastName: string | null },
  b: { userId: number; firstName: string | null; lastName: string | null }
): number {
  const lastNameComparison = (a.lastName ?? "")
    .toLocaleLowerCase("fr")
    .localeCompare((b.lastName ?? "").toLocaleLowerCase("fr"), "fr");
  if (lastNameComparison !== 0) return lastNameComparison;

  const firstNameComparison = (a.firstName ?? "")
    .toLocaleLowerCase("fr")
    .localeCompare((b.firstName ?? "").toLocaleLowerCase("fr"), "fr");
  if (firstNameComparison !== 0) return firstNameComparison;
  return a.userId - b.userId;
}

export function hasChangedAfterDeadline(
  statusChangedAt: string | null,
  responseDeadline: string | null
) {
  return (
    responseDeadline !== null &&
    statusChangedAt !== null &&
    statusChangedAt.slice(0, 10) > responseDeadline
  );
}

export function summarisePresence(rows: PresenceRow[]): PresenceSummary {
  const memberAccumulators = new Map<number, PresenceMemberAccumulator>();

  for (const row of rows) {
    let accumulator = memberAccumulators.get(row.userId);
    if (!accumulator) {
      accumulator = {
        userId: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        instruments: new Set<string>(),
        primaryInstruments: new Set<string>(),
        status: row.status,
      };
      memberAccumulators.set(row.userId, accumulator);
    } else {
      accumulator.status ??= row.status;
    }

    if (row.instrument !== null) accumulator.instruments.add(row.instrument);
    if (row.instrument !== null && row.isPrimary === 1) {
      accumulator.primaryInstruments.add(row.instrument);
    }
  }

  const members = Array.from(memberAccumulators.values())
    .map((accumulator) => ({
      userId: accumulator.userId,
      firstName: accumulator.firstName,
      lastName: accumulator.lastName,
      instruments: Array.from(accumulator.instruments).sort(compareInstruments),
      primaryInstrument:
        // Garde-fou défensif : la sélection côté groupes gère les données obsolètes.
        Array.from(accumulator.primaryInstruments)
          .filter((instrument) => accumulator.instruments.has(instrument))
          .sort(compareInstruments)[0] ??
        Array.from(accumulator.instruments).sort(compareInstruments)[0] ??
        null,
      status: accumulator.status,
    }))
    .sort(compareMembersByName);
  const present = members.filter((member) => member.status === "present").length;
  const absent = members.filter((member) => member.status === "absent").length;
  const noAnswer = members.filter((member) => member.status === null).length;

  return {
    totalMembers: members.length,
    present,
    absent,
    noAnswer,
    members,
  };
}
