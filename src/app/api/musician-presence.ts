import { env } from "cloudflare:workers";
import { resolveMusicianIdentity } from "./auth";
import { isAdmin, type UserRole } from "@/db/types";
import { logger } from "@/lib/logger";
import {
  getParisDate,
  MUSICIAN_PRESENCE_MEMBER_QUERY,
  PRESENCE_UPSERT_SQL,
  summarisePresence,
  type PresenceRow,
} from "@/lib/presence";

export interface PresenceEventRow {
  id: number;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  address: string | null;
  response_deadline: string | null;
  parental_authorization_required: number;
  authorization_details: string | null;
}

interface OwnPresenceRow {
  eventId: number;
  status: "present" | "absent";
  comment: string | null;
  updated_at: string;
  updatedBy: number | null;
  updaterRole: UserRole | null;
  updaterFirstName: string | null;
  updaterRelation: string | null;
}

interface PresenceAnswerRow {
  eventId: number;
  userId: number;
  status: "present" | "absent";
  comment: string | null;
  updatedAt: string;
}

interface OwnPresenceAnswerRow {
  eventId: number;
  status: "present" | "absent";
  comment: string | null;
  updatedAt: string;
  updatedBy: number | null;
  updaterRole: UserRole | null;
  updaterFirstName: string | null;
  updaterRelation: string | null;
}

export interface EventAuthorizationRow {
  eventId: number;
  guardianUserId: number | null;
  recordedBy: number | null;
  guardianFirstName: string | null;
  relation: string | null;
  detailsSnapshot: string | null;
  authorizedAt: string;
}

export interface PortalAuthorization {
  details: string | null;
  status: "authorized" | "missing";
  authorizedBy: {
    name: string | null;
    relation: string | null;
    byYou: boolean;
    byAssociation: boolean;
    paper: boolean;
  } | null;
  authorizedAt: string | null;
  outdated: boolean;
  canAuthorize: boolean;
}

interface PresenceRosterEntry {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  primaryInstrument: string | null;
  status: "present" | "absent" | null;
}

interface PresenceResponse {
  status: "present" | "absent" | null;
  comment: string | null;
  updated_at: string | null;
  answeredBy: {
    name: string | null;
    relation: string | null;
    byAssociation: boolean;
    byYou: boolean;
  } | null;
}

interface MusicianPresenceEvent {
  id: number;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  address: string | null;
  response_deadline: string | null;
  response: PresenceResponse;
  roster: PresenceRosterEntry[];
  counts: {
    present: number;
    absent: number;
    noAnswer: number;
    totalMembers: number;
  };
  authorization: PortalAuthorization | null;
}

interface PresenceRequestBody {
  eventId: number;
  status: "present" | "absent" | null;
  comment?: string | null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPresenceStatus(value: unknown): value is "present" | "absent" | null {
  return value === null || value === "present" || value === "absent";
}

function isPresenceRequestBody(value: unknown): value is PresenceRequestBody {
  if (!isRecord(value)) return false;
  if (typeof value.eventId !== "number" || !Number.isInteger(value.eventId)) return false;
  if (!isPresenceStatus(value.status)) return false;
  return value.comment === undefined || value.comment === null || typeof value.comment === "string";
}

async function readPresenceEvent(
  event: PresenceEventRow,
  userId: number,
  actorId: number,
  delegated: boolean
): Promise<MusicianPresenceEvent> {
  const ownPresence = await env.DB.prepare(
    `SELECT ep.event_id AS eventId, ep.status, ep.comment, ep.updated_at,
            ep.updated_by AS updatedBy,
            updater.role AS updaterRole, updaterProfile.first_name AS updaterFirstName,
            guardianLink.relation AS updaterRelation
     FROM event_presences ep
     LEFT JOIN users updater ON updater.id = ep.updated_by
     LEFT JOIN musician_profiles updaterProfile ON updaterProfile.user_id = updater.id
     LEFT JOIN guardian_links guardianLink
       ON guardianLink.guardian_user_id = ep.updated_by AND guardianLink.child_user_id = ep.user_id
     WHERE ep.event_id = ? AND ep.user_id = ?`
  )
    .bind(event.id, userId)
    .first<OwnPresenceRow>();

  const memberRows = await env.DB.prepare(MUSICIAN_PRESENCE_MEMBER_QUERY)
    .bind(event.id)
    .all<PresenceRow>();
  const summary = summarisePresence(memberRows.results || []);
  const roster: PresenceRosterEntry[] = summary.members.map((member) => ({
    userId: member.userId,
    firstName: member.firstName,
    lastName: member.lastName,
    instruments: member.instruments,
    primaryInstrument: member.primaryInstrument,
    status: member.status,
  }));

  const authorization = await readPortalAuthorization(event, userId, actorId, delegated);
  const {
    parental_authorization_required: _authorizationRequired,
    authorization_details: _authorizationDetails,
    ...eventInfo
  } = event;

  return {
    ...eventInfo,
    response: {
      status: ownPresence?.status ?? null,
      comment: ownPresence?.comment ?? null,
      updated_at: ownPresence?.updated_at ?? null,
      answeredBy: ownPresence ? getAnsweredBy(ownPresence, userId, actorId, delegated) : null,
    },
    roster,
    counts: {
      present: summary.present,
      absent: summary.absent,
      noAnswer: summary.noAnswer,
      totalMembers: summary.totalMembers,
    },
    authorization,
  };
}

function indexPresenceAnswers(
  rows: PresenceAnswerRow[]
): Map<number, Map<number, PresenceAnswerRow>> {
  const answers = new Map<number, Map<number, PresenceAnswerRow>>();
  for (const answer of rows) {
    let eventAnswers = answers.get(answer.eventId);
    if (!eventAnswers) {
      eventAnswers = new Map<number, PresenceAnswerRow>();
      answers.set(answer.eventId, eventAnswers);
    }
    eventAnswers.set(answer.userId, answer);
  }
  return answers;
}

async function readPresenceEvents(
  events: PresenceEventRow[],
  userId: number,
  actorId: number,
  delegated: boolean
): Promise<MusicianPresenceEvent[]> {
  // La colonne de statut jointe n'est pas utilisée pour construire l'effectif. Les réponses
  // sont chargées à part ; les jointures d'auteur ne concernent que les réponses du profil actif.
  // L'identifiant lié est donc arbitraire et sans effet sur l'effectif de référence.
  const memberRows = await env.DB.prepare(MUSICIAN_PRESENCE_MEMBER_QUERY)
    .bind(events[0]?.id ?? 0)
    .all<PresenceRow>();
  const summary = summarisePresence(
    (memberRows.results || []).map((row) => ({ ...row, status: null, statusChangedAt: null }))
  );

  const eventIds = events.map((event) => event.id);
  let answerRows: PresenceAnswerRow[] = [];
  let ownAnswerRows: OwnPresenceAnswerRow[] = [];
  let authorizationRows: EventAuthorizationRow[] = [];
  const linked =
    events.some((event) => event.parental_authorization_required === 1) &&
    !!(await env.DB.prepare("SELECT 1 AS linked FROM guardian_links WHERE child_user_id = ? LIMIT 1")
      .bind(userId)
      .first<{ linked: number }>());
  if (eventIds.length > 0) {
    const answers = await env.DB.prepare(
      `SELECT ep.event_id AS eventId, ep.user_id AS userId, ep.status, ep.comment,
              ep.updated_at AS updatedAt
       FROM event_presences ep
       WHERE ep.event_id IN (SELECT value FROM json_each(?) WHERE type = 'integer')`
    )
      .bind(JSON.stringify(eventIds))
      .all<PresenceAnswerRow>();
    answerRows = answers.results || [];

    const ownAnswers = await env.DB.prepare(
      `SELECT ep.event_id AS eventId, ep.status, ep.comment, ep.updated_at AS updatedAt,
              ep.updated_by AS updatedBy, updater.role AS updaterRole,
              updaterProfile.first_name AS updaterFirstName,
              guardianLink.relation AS updaterRelation
       FROM event_presences ep
       LEFT JOIN users updater ON updater.id = ep.updated_by
       LEFT JOIN musician_profiles updaterProfile ON updaterProfile.user_id = updater.id
       LEFT JOIN guardian_links guardianLink
         ON guardianLink.guardian_user_id = ep.updated_by AND guardianLink.child_user_id = ep.user_id
       WHERE ep.user_id = ?
         AND ep.event_id IN (SELECT value FROM json_each(?) WHERE type = 'integer')`
    )
      .bind(userId, JSON.stringify(eventIds))
      .all<OwnPresenceAnswerRow>();
    ownAnswerRows = ownAnswers.results || [];

    if (linked) {
      const authorizations = await env.DB.prepare(
        `SELECT ea.event_id AS eventId, ea.guardian_user_id AS guardianUserId,
                ea.recorded_by AS recordedBy, guardianProfile.first_name AS guardianFirstName,
                guardianLink.relation AS relation, ea.details_snapshot AS detailsSnapshot,
                ea.authorized_at AS authorizedAt
         FROM event_authorizations ea
         LEFT JOIN musician_profiles guardianProfile ON guardianProfile.user_id = ea.guardian_user_id
         LEFT JOIN guardian_links guardianLink
           ON guardianLink.guardian_user_id = ea.guardian_user_id
          AND guardianLink.child_user_id = ea.child_user_id
         WHERE ea.child_user_id = ?
           AND ea.event_id IN (SELECT value FROM json_each(?) WHERE type = 'integer')`
      )
        .bind(userId, JSON.stringify(eventIds))
        .all<EventAuthorizationRow>();
      authorizationRows = authorizations.results || [];
    }
  }
  const answersByEvent = indexPresenceAnswers(answerRows);
  const ownAnswersByEvent = new Map(ownAnswerRows.map((answer) => [answer.eventId, answer]));
  const authorizationByEvent = new Map(authorizationRows.map((authorization) => [authorization.eventId, authorization]));

  return events.map((event) => {
    const eventAnswers = answersByEvent.get(event.id);
    const roster: PresenceRosterEntry[] = summary.members.map((member) => {
      const answer = eventAnswers?.get(member.userId);
      return {
        userId: member.userId,
        firstName: member.firstName,
        lastName: member.lastName,
        instruments: member.instruments,
        primaryInstrument: member.primaryInstrument,
        status: answer?.status ?? null,
      };
    });
    const ownPresence = ownAnswersByEvent.get(event.id);

    const authorization = formatPortalAuthorization(
      event,
      authorizationByEvent.get(event.id) ?? null,
      linked,
      actorId,
      delegated
    );
    const {
      parental_authorization_required: _authorizationRequired,
      authorization_details: _authorizationDetails,
      ...eventInfo
    } = event;

    return {
      ...eventInfo,
      response: {
        status: ownPresence?.status ?? null,
        comment: ownPresence?.comment ?? null,
        updated_at: ownPresence?.updatedAt ?? null,
        answeredBy: ownPresence ? getAnsweredBy(ownPresence, userId, actorId, delegated) : null,
      },
      roster,
      counts: {
        present: roster.filter((member) => member.status === "present").length,
        absent: roster.filter((member) => member.status === "absent").length,
        noAnswer: roster.filter((member) => member.status === null).length,
        totalMembers: roster.length,
      },
      authorization,
    };
  });
}

async function readPortalAuthorization(
  event: PresenceEventRow,
  childUserId: number,
  actorId: number,
  delegated: boolean
): Promise<PortalAuthorization | null> {
  if (event.parental_authorization_required !== 1) return null;
  const linked = await env.DB.prepare(
    "SELECT 1 AS linked FROM guardian_links WHERE child_user_id = ? LIMIT 1"
  )
    .bind(childUserId)
    .first<{ linked: number }>();
  if (!linked) return null;

  const authorization = await env.DB.prepare(
    `SELECT ea.event_id AS eventId, ea.guardian_user_id AS guardianUserId,
            ea.recorded_by AS recordedBy, guardianProfile.first_name AS guardianFirstName,
            guardianLink.relation AS relation, ea.details_snapshot AS detailsSnapshot,
            ea.authorized_at AS authorizedAt
     FROM event_authorizations ea
     LEFT JOIN musician_profiles guardianProfile ON guardianProfile.user_id = ea.guardian_user_id
     LEFT JOIN guardian_links guardianLink
       ON guardianLink.guardian_user_id = ea.guardian_user_id
      AND guardianLink.child_user_id = ea.child_user_id
     WHERE ea.event_id = ? AND ea.child_user_id = ?`
  )
    .bind(event.id, childUserId)
    .first<EventAuthorizationRow>();

  return formatPortalAuthorization(event, authorization, true, actorId, delegated);
}

export function formatPortalAuthorization(
  event: PresenceEventRow,
  authorization: EventAuthorizationRow | null,
  linked: boolean,
  actorId: number,
  delegated: boolean
): PortalAuthorization | null {
  if (event.parental_authorization_required !== 1 || !linked) return null;
  const hasGuardian = authorization !== null && authorization.guardianUserId !== null;
  const byAssociation = authorization !== null && !hasGuardian;
  const paper =
    authorization !== null &&
    (authorization.recordedBy !== null || authorization.guardianUserId === null);
  return {
    details: event.authorization_details,
    status: authorization ? "authorized" : "missing",
    authorizedBy: authorization
      ? {
          name: hasGuardian ? authorization.guardianFirstName : null,
          relation: hasGuardian ? authorization.relation : null,
          byYou: hasGuardian && delegated && authorization.guardianUserId === actorId,
          byAssociation,
          paper,
        }
      : null,
    authorizedAt: authorization?.authorizedAt ?? null,
    outdated: authorization
      ? authorization.detailsSnapshot !== event.authorization_details
      : false,
    canAuthorize: delegated && event.date >= getParisDate(),
  };
}

function getAnsweredBy(
  answer: Pick<
    OwnPresenceAnswerRow,
    "updatedBy" | "updaterRole" | "updaterFirstName" | "updaterRelation"
  >,
  userId: number,
  actorId: number,
  delegated: boolean
): PresenceResponse["answeredBy"] {
  if (answer.updatedBy === null || answer.updatedBy === userId) return null;
  const byAssociation = answer.updaterRole !== null && isAdmin(answer.updaterRole);
  return {
    name: byAssociation ? null : answer.updaterFirstName,
    relation: byAssociation ? null : answer.updaterRelation,
    byAssociation,
    byYou: delegated && answer.updatedBy === actorId,
  };
}

async function handleGet(
  request: Request,
  userId: number,
  actorId: number,
  delegated: boolean
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  const includePast = new URL(request.url).searchParams.get("includePast") === "1";
  const dateCondition = includePast ? "date >= date('now', '-12 months')" : "date >= date('now')";
  const events = await env.DB.prepare(
    `SELECT id, title, date, time, location, address, response_deadline,
            parental_authorization_required, authorization_details
     FROM events
     WHERE presence_required = 1 AND ${dateCondition}
     ORDER BY date ASC`
  ).all<PresenceEventRow>();

  const eventStates = await readPresenceEvents(events.results || [], userId, actorId, delegated);

  // `currentUserId` évite à l'interface un second appel à /api/musician/profile
  // uniquement pour savoir qui est connecté : sans lui, un échec de cet appel ferait
  // disparaître silencieusement la mise en avant et l'icône d'édition de sa propre ligne.
  // C'est l'identifiant de session, jamais une valeur fournie par le client.
  return jsonResponse({ currentUserId: userId, events: eventStates });
}

async function handlePost(
  request: Request,
  userId: number,
  actorId: number,
  delegated: boolean
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Le corps de la requête est invalide." }, 400);
  }

  if (!isPresenceRequestBody(body)) {
    return jsonResponse({ error: "Les données de présence sont invalides." }, 400);
  }

  const comment = body.status === null ? null : body.comment?.trim() || null;
  if (comment !== null && comment.length > 1000) {
    return jsonResponse({ error: "Le commentaire ne peut pas dépasser 1000 caractères." }, 400);
  }
  const event = await env.DB.prepare(
    `SELECT id, title, date, time, location, address, response_deadline,
            parental_authorization_required, authorization_details
     FROM events
     WHERE id = ? AND presence_required = 1 AND date >= date('now')`
  )
    .bind(body.eventId)
    .first<PresenceEventRow>();

  if (!event) {
    return jsonResponse({ error: "Cet événement n'existe pas ou n'accepte plus de réponse." }, 400);
  }

  const memberRows = await env.DB.prepare(MUSICIAN_PRESENCE_MEMBER_QUERY)
    .bind(event.id)
    .all<PresenceRow>();
  if (!(memberRows.results || []).some((member) => member.userId === userId)) {
    // L'adhésion n'entre plus dans l'effectif de référence : ce refus ne concerne
    // pas la cotisation, mais l'appartenance à l'effectif (compte désactivé, ou
    // administrateur sans instrument).
    return jsonResponse(
      { error: "Vous ne faites pas partie de l'effectif de référence de l'harmonie." },
      403
    );
  }

  if (body.status === null) {
    await env.DB.prepare("DELETE FROM event_presences WHERE event_id = ? AND user_id = ?")
      .bind(event.id, userId)
      .run();
  } else {
    await env.DB.prepare(PRESENCE_UPSERT_SQL)
      .bind(event.id, userId, body.status, comment, actorId)
      .run();
  }

  const updatedEvent = await readPresenceEvent(event, userId, actorId, delegated);
  return jsonResponse({ success: true, event: updatedEvent });
}

export async function handleMusicianPresenceApi(request: Request): Promise<Response> {
  const identity = await resolveMusicianIdentity(request);
  const user = identity?.effective;
  if (!user) return jsonResponse({ error: "Non autorisé" }, 401);
  if (user.kind === "guardian" && !identity.delegated) {
    return jsonResponse({ error: "Les présences sont réservées aux musiciens." }, 403);
  }

  try {
    if (request.method === "GET") {
      return await handleGet(request, user.id, identity.actor.id, identity.delegated);
    }
    if (request.method === "POST") {
      return await handlePost(request, user.id, identity.actor.id, identity.delegated);
    }
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  } catch (error) {
    logger.error("Erreur de l'API des présences musicien :", error);
    return jsonResponse({ error: "Erreur interne du serveur" }, 500);
  }
}
