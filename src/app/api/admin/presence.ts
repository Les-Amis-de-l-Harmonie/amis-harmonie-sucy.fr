import { env } from "cloudflare:workers";
import type { Event } from "@/db/types";
import { checkAdminAuth } from "@/app/api/admin-crud";
import {
  PRESENCE_MEMBER_QUERY,
  summarisePresence,
  type PresenceMember,
  type PresenceRow,
} from "@/lib/presence";
import { compareInstruments } from "@/lib/instruments";
import { logger } from "@/lib/logger";
import { PRESENCE_UPSERT_ADMIN_SQL } from "@/lib/presence";

interface PresenceEventOption {
  id: number;
  title: string;
  date: string;
  response_deadline: string | null;
  is_public: number;
}

interface PresenceCommentRow {
  userId: number;
  comment: string | null;
}

interface AdminPresenceMember extends PresenceMember {
  comment: string | null;
}

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

function memberName(member: PresenceMember): string {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ");
  return name || `Membre ${member.userId}`;
}

function addComments(
  members: PresenceMember[],
  commentsByUserId: Map<number, string | null>
): AdminPresenceMember[] {
  return members.map((member) => ({
    ...member,
    comment: commentsByUserId.get(member.userId) ?? null,
  }));
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

function compareGridMembers(a: PresenceMember, b: PresenceMember): number {
  const instrumentA = a.instruments[0];
  const instrumentB = b.instruments[0];
  if (instrumentA === undefined && instrumentB !== undefined) return 1;
  if (instrumentA !== undefined && instrumentB === undefined) return -1;
  if (instrumentA !== undefined && instrumentB !== undefined) {
    const instrumentComparison = compareInstruments(instrumentA, instrumentB);
    if (instrumentComparison !== 0) return instrumentComparison;
  }
  return compareMembersByName(a, b);
}

async function readAdminEvent(event: Event): Promise<Record<string, unknown>> {
  const memberRows = await env.DB.prepare(PRESENCE_MEMBER_QUERY).bind(event.id).all<PresenceRow>();
  const summary = summarisePresence(memberRows.results || [], event.response_deadline);

  const comments = await env.DB.prepare(
    "SELECT user_id AS userId, comment FROM event_presences WHERE event_id = ?"
  )
    .bind(event.id)
    .all<PresenceCommentRow>();
  const commentsByUserId = new Map(
    comments.results.map((row) => [row.userId, row.comment] as const)
  );

  return {
    event,
    totalMembers: summary.totalMembers,
    present: summary.present,
    absent: summary.absent,
    noAnswer: summary.noAnswer,
    responseRate: summary.responseRate,
    byInstrument: summary.byInstrument.map((breakdown) => ({
      ...breakdown,
      members: addComments(breakdown.members, commentsByUserId),
    })),
    nonResponders: addComments(summary.nonResponders, commentsByUserId),
    lateChanges: addComments(summary.lateChanges, commentsByUserId),
    nonRespondersText: summary.nonResponders.map(memberName).join(", "),
  };
}

async function readGrid(): Promise<Response> {
  const events = await env.DB.prepare(
    `SELECT id, title, date, response_deadline
     FROM events
     WHERE presence_required = 1 AND date >= date('now')
     ORDER BY date ASC`
  ).all<PresenceGridEvent>();
  const eventRows = events.results || [];

  const memberRows = await env.DB.prepare(PRESENCE_MEMBER_QUERY)
    .bind(eventRows[0]?.id ?? 0)
    .all<PresenceRow>();
  const members = summarisePresence(memberRows.results || [], null).members.sort(
    compareGridMembers
  );

  const eventIds = eventRows.map((event) => event.id);
  const answers = new Map<number, Map<number, "present" | "absent">>();
  if (eventIds.length > 0) {
    const placeholders = eventIds.map(() => "?").join(", ");
    const answerRows = await env.DB.prepare(
      `SELECT event_id AS eventId, user_id AS userId, status
       FROM event_presences
       WHERE event_id IN (${placeholders})`
    )
      .bind(...eventIds)
      .all<PresenceAnswerRow>();

    for (const answer of answerRows.results || []) {
      let eventAnswers = answers.get(answer.eventId);
      if (!eventAnswers) {
        eventAnswers = new Map();
        answers.set(answer.eventId, eventAnswers);
      }
      eventAnswers.set(answer.userId, answer.status);
    }
  }

  return jsonResponse({
    events: eventRows,
    members: members.map((member) => {
      const memberAnswers: Record<string, "present" | "absent" | null> = {};
      for (const event of eventRows) {
        memberAnswers[String(event.id)] = answers.get(event.id)?.get(member.userId) ?? null;
      }
      return {
        userId: member.userId,
        firstName: member.firstName,
        lastName: member.lastName,
        instruments: member.instruments,
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

  if (body.status === null) {
    await env.DB.prepare("DELETE FROM event_presences WHERE event_id = ? AND user_id = ?")
      .bind(event.id, body.userId)
      .run();
  } else {
    await env.DB.prepare(PRESENCE_UPSERT_ADMIN_SQL)
      .bind(event.id, body.userId, body.status, comment)
      .run();
  }

  return jsonResponse(await readAdminEvent(event));
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
    if (searchParams.get("grid") === "1") return await readGrid();

    const eventId = searchParams.get("eventId");
    if (!eventId) {
      // L'administration doit commencer par l'événement à venir le plus proche à décider.
      const events = await env.DB.prepare(
        `SELECT id, title, date, response_deadline, is_public
         FROM events
         WHERE presence_required = 1
         ORDER BY CASE WHEN date >= date('now') THEN 0 ELSE 1 END,
                  CASE WHEN date >= date('now') THEN date END ASC,
                  date DESC`
      ).all<PresenceEventOption>();
      return jsonResponse(events.results);
    }

    const event = await env.DB.prepare(
      "SELECT * FROM events WHERE id = ? AND presence_required = 1"
    )
      .bind(eventId)
      .first<Event>();
    if (!event) {
      return jsonResponse({ error: "Événement introuvable." }, 404);
    }

    return jsonResponse(await readAdminEvent(event));
  } catch (error) {
    logger.error("Admin presence API error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}
