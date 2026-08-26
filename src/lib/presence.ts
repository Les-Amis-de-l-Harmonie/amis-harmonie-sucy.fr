import { compareInstruments, INSTRUMENT_WITHOUT_SECTION_LABEL } from "@/lib/instruments";

// Cette requête alimente la réponse envoyée aux musiciens : ne JAMAIS y ajouter la colonne
// `comment`. Les commentaires sont joints séparément, côté administration uniquement
// (`src/app/api/admin/presence.ts`).
//
// EFFECTIF DE RÉFÉRENCE = la liste des utilisateurs musiciens actifs.
// Volontairement SANS condition d'adhésion : l'adhésion est remise à zéro à chaque
// saison (`migrations/0012_rollover_membership_season.sql`), ce qui viderait
// l'effectif — et donc le dénominateur du taux de réponse — jusqu'à ce que chacun
// ait ré-adhéré. Un musicien doit être compté et relancé qu'il soit à jour de sa
// cotisation ou non ; l'adhésion se suit dans l'espace Utilisateurs, pas ici.
//
// La disjonction rôle / instruments inclut le chef d'orchestre, qui est un ADMIN
// mais joue, et exclut les administrateurs purement back-office.
export const PRESENCE_MEMBER_QUERY = `SELECT
  u.id                 AS userId,
  mp.first_name        AS firstName,
  mp.last_name         AS lastName,
  hi.instrument_name   AS instrument,
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
  status: "present" | "absent" | null;
  statusChangedAt: string | null;
}

export interface PresenceMember {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  status: "present" | "absent" | null;
  changedAfterDeadline: boolean;
}

export interface InstrumentBreakdown {
  instrument: string;
  present: number;
  absent: number;
  noAnswer: number;
  members: PresenceMember[];
}

export interface PresenceSummary {
  totalMembers: number;
  present: number;
  absent: number;
  noAnswer: number;
  responseRate: number;
  members: PresenceMember[];
  byInstrument: InstrumentBreakdown[];
  nonResponders: PresenceMember[];
  lateChanges: PresenceMember[];
}

interface PresenceMemberAccumulator {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: Set<string>;
  status: "present" | "absent" | null;
  changedAfterDeadline: boolean;
}

function compareMembersByName(a: PresenceMember, b: PresenceMember): number {
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

function hasChangedAfterDeadline(statusChangedAt: string | null, responseDeadline: string | null) {
  return (
    responseDeadline !== null &&
    statusChangedAt !== null &&
    statusChangedAt.slice(0, 10) > responseDeadline
  );
}

export function summarisePresence(
  rows: PresenceRow[],
  responseDeadline: string | null
): PresenceSummary {
  const memberAccumulators = new Map<number, PresenceMemberAccumulator>();

  for (const row of rows) {
    let accumulator = memberAccumulators.get(row.userId);
    if (!accumulator) {
      accumulator = {
        userId: row.userId,
        firstName: row.firstName,
        lastName: row.lastName,
        instruments: new Set<string>(),
        status: row.status,
        changedAfterDeadline: hasChangedAfterDeadline(row.statusChangedAt, responseDeadline),
      };
      memberAccumulators.set(row.userId, accumulator);
    } else {
      accumulator.status ??= row.status;
      accumulator.changedAfterDeadline ||= hasChangedAfterDeadline(
        row.statusChangedAt,
        responseDeadline
      );
    }

    if (row.instrument !== null) accumulator.instruments.add(row.instrument);
  }

  const members = Array.from(memberAccumulators.values())
    .map((accumulator) => ({
      userId: accumulator.userId,
      firstName: accumulator.firstName,
      lastName: accumulator.lastName,
      instruments: Array.from(accumulator.instruments).sort(compareInstruments),
      status: accumulator.status,
      changedAfterDeadline: accumulator.changedAfterDeadline,
    }))
    .sort(compareMembersByName);

  const byInstrumentMap = new Map<string, InstrumentBreakdown>();
  for (const member of members) {
    const instruments =
      member.instruments.length > 0 ? member.instruments : [INSTRUMENT_WITHOUT_SECTION_LABEL];

    for (const instrument of instruments) {
      let breakdown = byInstrumentMap.get(instrument);
      if (!breakdown) {
        breakdown = { instrument, present: 0, absent: 0, noAnswer: 0, members: [] };
        byInstrumentMap.set(instrument, breakdown);
      }

      if (member.status === "present") breakdown.present++;
      else if (member.status === "absent") breakdown.absent++;
      else breakdown.noAnswer++;
      breakdown.members.push(member);
    }
  }

  const byInstrument = Array.from(byInstrumentMap.values()).sort((a, b) => {
    if (a.instrument === INSTRUMENT_WITHOUT_SECTION_LABEL) return 1;
    if (b.instrument === INSTRUMENT_WITHOUT_SECTION_LABEL) return -1;
    return compareInstruments(a.instrument, b.instrument);
  });
  const nonResponders = members
    .filter((member) => member.status === null)
    .sort(compareMembersByName);
  const lateChanges = members
    .filter((member) => member.changedAfterDeadline)
    .sort(compareMembersByName);
  const present = members.filter((member) => member.status === "present").length;
  const absent = members.filter((member) => member.status === "absent").length;
  const noAnswer = members.filter((member) => member.status === null).length;

  return {
    totalMembers: members.length,
    present,
    absent,
    noAnswer,
    responseRate: members.length === 0 ? 0 : (present + absent) / members.length,
    members,
    byInstrument,
    nonResponders,
    lateChanges,
  };
}
