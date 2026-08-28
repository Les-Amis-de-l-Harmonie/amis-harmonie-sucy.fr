import { env } from "cloudflare:workers";
import type { Event } from "@/db/types";
import { checkAdminAuth } from "@/app/api/admin-crud";
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
}

interface PresenceAnswerRow {
  eventId: number;
  userId: number;
  status: "present" | "absent";
  comment: string | null;
  statusChangedAt: string | null;
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
    `SELECT id, title, date, response_deadline
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
  const answers = new Map<number, Map<number, PresenceAnswerRow>>();
  if (eventIds.length > 0) {
    const answerRows = await env.DB.prepare(
      `SELECT event_id AS eventId, user_id AS userId, status, comment,
              status_changed_at AS statusChangedAt
       FROM event_presences
       WHERE event_id IN (SELECT value FROM json_each(?) WHERE type = 'integer')`
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

  return jsonResponse({
    events: eventRows,
    members: members.map((member) => {
      const memberAnswers: Record<
        string,
        {
          status: "present" | "absent" | null;
          comment: string | null;
          changedAfterDeadline: boolean;
        }
      > = {};
      for (const event of eventRows) {
        const answer = answers.get(event.id)?.get(member.userId);
        memberAnswers[String(event.id)] = {
          status: answer?.status ?? null,
          comment: answer?.comment ?? null,
          changedAfterDeadline: answer
            ? hasChangedAfterDeadline(answer.statusChangedAt, event.response_deadline)
            : false,
        };
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

async function handlePost(request: Request): Promise<Response> {
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
      .bind(event.id, body.userId, body.status, comment)
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
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  try {
    if (request.method === "POST") return await handlePost(request);

    const searchParams = new URL(request.url).searchParams;
    if (searchParams.get("grid") === "1") return await readGrid(request);
    return jsonResponse({ error: "Le paramètre grid=1 est requis." }, 400);
  } catch (error) {
    logger.error("Admin presence API error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}
