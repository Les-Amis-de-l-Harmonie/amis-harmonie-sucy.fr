import { env } from "cloudflare:workers";
import type { Event, UserRole } from "@/db/types";
import { isAdmin } from "@/db/types";
import { verifySession } from "@/app/api/auth";
import {
  hasChangedAfterDeadline,
  PRESENCE_MEMBER_QUERY,
  summarisePresence,
  type PresenceRow,
} from "@/lib/presence";
import { logger } from "@/lib/logger";
import { PRESENCE_UPSERT_ADMIN_SQL } from "@/lib/presence";

interface PresenceGridEvent {
  id: number;
  title: string;
  date: string;
  response_deadline: string | null;
  parentalAuthorizationRequired: number;
  authorizationDetails: string | null;
}

interface PresenceAnswerRow {
  eventId: number;
  userId: number;
  status: "present" | "absent";
  comment: string | null;
  statusChangedAt: string | null;
  updatedAt: string | null;
  updatedBy: number | null;
  updaterRole: UserRole | null;
  updaterFirstName: string | null;
  updaterLastName: string | null;
  updaterRelation: string | null;
}

interface GridAuthorizationRow {
  eventId: number;
  childUserId: number;
  guardianUserId: number | null;
  recordedBy: number | null;
  guardianRole: UserRole | null;
  guardianFirstName: string | null;
  guardianLastName: string | null;
  guardianRelation: string | null;
  recorderRole: UserRole | null;
  recorderFirstName: string | null;
  recorderLastName: string | null;
  detailsSnapshot: string | null;
  authorizedAt: string;
}

interface GridAuthorization {
  status: "authorized" | "missing";
  authorizedBy: {
    name: string | null;
    relation: string | null;
    kind: "parent" | "admin" | "deleted" | "noProfile";
    paper: boolean;
  } | null;
  authorizedAt: string | null;
  outdated: boolean;
}

interface PersistedPresenceRow {
  status: "present" | "absent";
  comment: string | null;
  statusChangedAt: string;
}

interface AdminPresenceRequestBody {
  eventId: number;
  userId: number;
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

function isAdminPresenceRequestBody(value: unknown): value is AdminPresenceRequestBody {
  if (!isRecord(value)) return false;
  if (typeof value.eventId !== "number" || !Number.isInteger(value.eventId)) return false;
  if (typeof value.userId !== "number" || !Number.isInteger(value.userId)) return false;
  if (!isPresenceStatus(value.status)) return false;
  return value.comment === undefined || value.comment === null || typeof value.comment === "string";
}

async function readGrid(request: Request): Promise<Response> {
  const includePast = new URL(request.url).searchParams.get("includePast") === "1";
  const dateCondition = includePast ? "date >= date('now', '-12 months')" : "date >= date('now')";
  const events = await env.DB.prepare(
    `SELECT id, title, date, response_deadline,
            parental_authorization_required AS parentalAuthorizationRequired,
            authorization_details AS authorizationDetails
     FROM events
     WHERE presence_required = 1 AND ${dateCondition}
     ORDER BY date ASC`
  ).all<PresenceGridEvent>();
  const eventRows = events.results || [];

  // La valeur sert uniquement à satisfaire le paramètre du LEFT JOIN de PRESENCE_MEMBER_QUERY.
  const memberRows = await env.DB.prepare(PRESENCE_MEMBER_QUERY)
    .bind(eventRows[0]?.id ?? 0)
    .all<PresenceRow>();
  const members = summarisePresence(memberRows.results || []).members;

  const eventIds = eventRows.map((event) => event.id);
  const authorizationEventIds = eventRows
    .filter((event) => event.parentalAuthorizationRequired === 1)
    .map((event) => event.id);
  const answers = new Map<number, Map<number, PresenceAnswerRow>>();
  if (eventIds.length > 0) {
    const answerRows = await env.DB.prepare(
      `SELECT ep.event_id AS eventId, ep.user_id AS userId, ep.status, ep.comment,
              ep.status_changed_at AS statusChangedAt, ep.updated_by AS updatedBy,
              ep.updated_at AS updatedAt,
              updater.role AS updaterRole, updaterProfile.first_name AS updaterFirstName,
              updaterProfile.last_name AS updaterLastName, guardianLink.relation AS updaterRelation
       FROM event_presences ep
       LEFT JOIN users updater ON updater.id = ep.updated_by
       LEFT JOIN musician_profiles updaterProfile ON updaterProfile.user_id = updater.id
       LEFT JOIN guardian_links guardianLink
         ON guardianLink.guardian_user_id = ep.updated_by AND guardianLink.child_user_id = ep.user_id
       WHERE ep.event_id IN (SELECT value FROM json_each(?) WHERE type = 'integer')`
    )
      .bind(JSON.stringify(eventIds))
      .all<PresenceAnswerRow>();

    for (const answer of answerRows.results || []) {
      let eventAnswers = answers.get(answer.eventId);
      if (!eventAnswers) {
        eventAnswers = new Map();
        answers.set(answer.eventId, eventAnswers);
      }
      eventAnswers.set(answer.userId, answer);
    }
  }

  const linkedChildren = new Set<number>();
  const authorizations = new Map<string, GridAuthorizationRow>();
  if (authorizationEventIds.length > 0 && members.length > 0) {
    const linkedRows = await env.DB.prepare(
      `SELECT DISTINCT child_user_id AS childUserId
       FROM guardian_links
       WHERE child_user_id IN (SELECT value FROM json_each(?) WHERE type = 'integer')`
    )
      .bind(JSON.stringify(members.map((member) => member.userId)))
      .all<{ childUserId: number }>();
    for (const row of linkedRows.results || []) linkedChildren.add(row.childUserId);

    if (linkedChildren.size > 0) {
      const authorizationRows = await env.DB.prepare(
        `SELECT ea.event_id AS eventId, ea.child_user_id AS childUserId,
                ea.guardian_user_id AS guardianUserId, ea.recorded_by AS recordedBy,
                guardian.role AS guardianRole, guardianProfile.first_name AS guardianFirstName,
                guardianProfile.last_name AS guardianLastName, guardianLink.relation AS guardianRelation,
                recorder.role AS recorderRole, recorderProfile.first_name AS recorderFirstName,
                recorderProfile.last_name AS recorderLastName,
                ea.details_snapshot AS detailsSnapshot, ea.authorized_at AS authorizedAt
         FROM event_authorizations ea
         LEFT JOIN users guardian ON guardian.id = ea.guardian_user_id
         LEFT JOIN musician_profiles guardianProfile ON guardianProfile.user_id = guardian.id
         LEFT JOIN guardian_links guardianLink
           ON guardianLink.guardian_user_id = ea.guardian_user_id
          AND guardianLink.child_user_id = ea.child_user_id
         LEFT JOIN users recorder ON recorder.id = ea.recorded_by
         LEFT JOIN musician_profiles recorderProfile ON recorderProfile.user_id = recorder.id
         WHERE ea.event_id IN (SELECT value FROM json_each(?) WHERE type = 'integer')
           AND ea.child_user_id IN (SELECT value FROM json_each(?) WHERE type = 'integer')`
      )
        .bind(
          JSON.stringify(authorizationEventIds),
          JSON.stringify(Array.from(linkedChildren))
        )
        .all<GridAuthorizationRow>();
      for (const row of authorizationRows.results || []) {
        authorizations.set(`${row.eventId}:${row.childUserId}`, row);
      }
    }
  }

  return jsonResponse({
    events: eventRows.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      response_deadline: event.response_deadline,
      parentalAuthorizationRequired: event.parentalAuthorizationRequired === 1,
      authorizationDetails: event.authorizationDetails,
    })),
    members: members.map((member) => {
      const memberAnswers: Record<
        string,
        {
          status: "present" | "absent" | null;
          comment: string | null;
          changedAfterDeadline: boolean;
          answeredBy: {
            name: string | null;
            relation: string | null;
            isAdmin: boolean;
            kind: "parent" | "admin" | "deleted" | "noProfile";
          } | null;
          answeredAt: string | null;
        }
      > = {};
      for (const event of eventRows) {
        const answer = answers.get(event.id)?.get(member.userId);
        const memberAnswer: {
          status: "present" | "absent" | null;
          comment: string | null;
          changedAfterDeadline: boolean;
          answeredBy: {
            name: string | null;
            relation: string | null;
            isAdmin: boolean;
            kind: "parent" | "admin" | "deleted" | "noProfile";
          } | null;
          answeredAt: string | null;
          authorization?: GridAuthorization;
        } = {
          status: answer?.status ?? null,
          comment: answer?.comment ?? null,
          changedAfterDeadline: answer
            ? hasChangedAfterDeadline(answer.statusChangedAt, event.response_deadline)
            : false,
          answeredBy: answer ? getAnsweredBy(answer, member.userId) : null,
          answeredAt: answer?.updatedAt ?? null,
        };
        if (event.parentalAuthorizationRequired === 1 && linkedChildren.has(member.userId)) {
          const authorization = authorizations.get(`${event.id}:${member.userId}`) ?? null;
          memberAnswer.authorization = formatGridAuthorization(event, authorization);
        }
        memberAnswers[String(event.id)] = memberAnswer;
      }
      return {
        userId: member.userId,
        firstName: member.firstName,
        lastName: member.lastName,
        instruments: member.instruments,
        primaryInstrument: member.primaryInstrument,
        answers: memberAnswers,
      };
    }),
  });
}

function formatGridAuthorization(
  event: PresenceGridEvent,
  authorization: GridAuthorizationRow | null
): GridAuthorization {
  if (!authorization) {
    return { status: "missing", authorizedBy: null, authorizedAt: null, outdated: false };
  }
  const paper = authorization.recordedBy !== null || authorization.guardianUserId === null;
  const hasGuardian = authorization.guardianUserId !== null;
  const authorRole = hasGuardian ? authorization.guardianRole : authorization.recorderRole;
  const authorIsAdmin = authorRole !== null && isAdmin(authorRole);
  const firstName = hasGuardian ? authorization.guardianFirstName : authorization.recorderFirstName;
  const lastName = hasGuardian ? authorization.guardianLastName : authorization.recorderLastName;
  const name = [firstName, lastName]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join(" ");
  const kind =
    hasGuardian
      ? "parent"
      : authorRole === null
      ? "deleted"
      : !name
        ? "noProfile"
        : authorIsAdmin
          ? "admin"
          : "parent";

  return {
    status: "authorized",
    authorizedBy: {
      name: name || null,
      relation: hasGuardian ? authorization.guardianRelation : null,
      kind,
      paper,
    },
    authorizedAt: authorization.authorizedAt,
    outdated: authorization.detailsSnapshot !== event.authorizationDetails,
  };
}

function getAnsweredBy(
  answer: PresenceAnswerRow,
  userId: number
): {
  name: string | null;
  relation: string | null;
  isAdmin: boolean;
  kind: "parent" | "admin" | "deleted" | "noProfile";
} | null {
  if (answer.updatedBy === null || answer.updatedBy === userId) return null;

  const updaterIsAdmin = answer.updaterRole !== null && isAdmin(answer.updaterRole);
  const profileName = [answer.updaterFirstName, answer.updaterLastName]
    .map((part) => part?.trim() ?? "")
    .filter((part) => part.length > 0)
    .join(" ");
  const kind =
    answer.updaterRole === null
      ? "deleted"
      : !profileName
        ? "noProfile"
        : updaterIsAdmin
          ? "admin"
          : "parent";

  return {
    name: profileName || null,
    relation: answer.updaterRelation,
    isAdmin: updaterIsAdmin,
    kind,
  };
}

async function handlePost(request: Request, adminId: number): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Le corps de la requête est invalide." }, 400);
  }

  if (!isAdminPresenceRequestBody(body)) {
    return jsonResponse({ error: "Les données de présence sont invalides." }, 400);
  }

  const comment = body.comment?.trim() || null;
  if (comment !== null && comment.length > 1000) {
    return jsonResponse({ error: "Le commentaire ne peut pas dépasser 1000 caractères." }, 400);
  }

  const event = await env.DB.prepare("SELECT * FROM events WHERE id = ? AND presence_required = 1")
    .bind(body.eventId)
    .first<Event>();
  if (!event) return jsonResponse({ error: "Événement introuvable." }, 404);

  const memberRows = await env.DB.prepare(PRESENCE_MEMBER_QUERY).bind(event.id).all<PresenceRow>();
  if (!(memberRows.results || []).some((member) => member.userId === body.userId)) {
    return jsonResponse(
      { error: "Ce musicien ne fait pas partie de l'effectif de référence." },
      400
    );
  }

  let responseComment: string | null = null;
  let changedAfterDeadline = false;
  let responseStatus = body.status;
  if (body.status === null) {
    await env.DB.prepare("DELETE FROM event_presences WHERE event_id = ? AND user_id = ?")
      .bind(event.id, body.userId)
      .run();
  } else {
    await env.DB.prepare(PRESENCE_UPSERT_ADMIN_SQL)
      .bind(event.id, body.userId, body.status, comment, adminId)
      .run();
    const persisted = await env.DB.prepare(
      "SELECT status, comment, status_changed_at AS statusChangedAt FROM event_presences WHERE event_id = ? AND user_id = ?"
    )
      .bind(event.id, body.userId)
      .first<PersistedPresenceRow>();
    responseStatus = persisted?.status ?? body.status;
    responseComment = persisted?.comment ?? null;
    changedAfterDeadline = persisted
      ? hasChangedAfterDeadline(persisted.statusChangedAt, event.response_deadline)
      : false;
  }

  return jsonResponse({
    success: true,
    eventId: body.eventId,
    userId: body.userId,
    status: responseStatus,
    comment: responseComment,
    changedAfterDeadline,
  });
}

export async function handleAdminPresenceApi(request: Request): Promise<Response> {
  const admin = await verifySession(request, "admin");
  if (!admin || !isAdmin(admin.role)) return jsonResponse({ error: "Non autorisé" }, 401);

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  try {
    if (request.method === "POST") return await handlePost(request, admin.id);

    const searchParams = new URL(request.url).searchParams;
    if (searchParams.get("grid") === "1") return await readGrid(request);
    return jsonResponse({ error: "Le paramètre grid=1 est requis." }, 400);
  } catch (error) {
    logger.error("Admin presence API error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}
