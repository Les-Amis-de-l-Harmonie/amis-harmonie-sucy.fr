import { env } from "cloudflare:workers";
import { verifySession } from "./auth";
import { logger } from "@/lib/logger";
import {
  PRESENCE_MEMBER_QUERY,
  summarisePresence,
  type PresenceMember,
  type PresenceRow,
} from "@/lib/presence";

interface PresenceEventRow {
  id: number;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  address: string | null;
  response_deadline: string | null;
}

interface OwnPresenceRow {
  status: "present" | "absent";
  comment: string | null;
  updated_at: string;
}

interface PresenceRosterEntry {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  status: "present" | "absent";
}

interface PresenceResponse {
  status: "present" | "absent" | null;
  comment: string | null;
  updated_at: string | null;
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
}

interface PresenceRequestBody {
  eventId: number;
  status: "present" | "absent";
  comment?: string | null;
}

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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPresenceStatus(value: unknown): value is "present" | "absent" {
  return value === "present" || value === "absent";
}

function isPresenceRequestBody(value: unknown): value is PresenceRequestBody {
  if (!isRecord(value)) return false;
  if (typeof value.eventId !== "number" || !Number.isInteger(value.eventId)) return false;
  if (!isPresenceStatus(value.status)) return false;
  return value.comment === undefined || value.comment === null || typeof value.comment === "string";
}

async function readPresenceEvent(
  event: PresenceEventRow,
  userId: number
): Promise<MusicianPresenceEvent> {
  const ownPresence = await env.DB.prepare(
    "SELECT status, comment, updated_at FROM event_presences WHERE event_id = ? AND user_id = ?"
  )
    .bind(event.id, userId)
    .first<OwnPresenceRow>();

  const memberRows = await env.DB.prepare(PRESENCE_MEMBER_QUERY).bind(event.id).all<PresenceRow>();
  const summary = summarisePresence(memberRows.results || [], event.response_deadline);
  const roster: PresenceRosterEntry[] = summary.members
    .filter(
      (member): member is PresenceMember & { status: "present" | "absent" } =>
        member.status !== null
    )
    .map((member) => ({
      userId: member.userId,
      firstName: member.firstName,
      lastName: member.lastName,
      status: member.status,
    }));

  return {
    ...event,
    response: {
      status: ownPresence?.status ?? null,
      comment: ownPresence?.comment ?? null,
      updated_at: ownPresence?.updated_at ?? null,
    },
    roster,
    counts: {
      present: summary.present,
      absent: summary.absent,
      noAnswer: summary.noAnswer,
      totalMembers: summary.totalMembers,
    },
  };
}

async function handleGet(request: Request, userId: number): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  const events = await env.DB.prepare(
    `SELECT id, title, date, time, location, address, response_deadline
     FROM events
     WHERE presence_required = 1 AND date >= date('now')
     ORDER BY date ASC`
  ).all<PresenceEventRow>();

  const eventStates = await Promise.all(
    (events.results || []).map((event) => readPresenceEvent(event, userId))
  );

  return jsonResponse({ events: eventStates });
}

async function handlePost(request: Request, userId: number): Promise<Response> {
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

  const comment = body.comment?.trim() || null;
  if (comment !== null && comment.length > 1000) {
    return jsonResponse({ error: "Le commentaire ne peut pas dépasser 1000 caractères." }, 400);
  }
  const event = await env.DB.prepare(
    `SELECT id, title, date, time, location, address, response_deadline
     FROM events
     WHERE id = ? AND presence_required = 1 AND date >= date('now')`
  )
    .bind(body.eventId)
    .first<PresenceEventRow>();

  if (!event) {
    return jsonResponse({ error: "Cet événement n'existe pas ou n'accepte plus de réponse." }, 400);
  }

  const memberRows = await env.DB.prepare(PRESENCE_MEMBER_QUERY).bind(event.id).all<PresenceRow>();
  if (!(memberRows.results || []).some((member) => member.userId === userId)) {
    return jsonResponse({ error: "Vous n'êtes pas membre adhérent de l'harmonie." }, 403);
  }

  await env.DB.prepare(PRESENCE_UPSERT_SQL).bind(event.id, userId, body.status, comment).run();

  const updatedEvent = await readPresenceEvent(event, userId);
  return jsonResponse({ success: true, event: updatedEvent });
}

export async function handleMusicianPresenceApi(request: Request): Promise<Response> {
  const user = await verifySession(request, "musician");
  if (!user) return jsonResponse({ error: "Non autorisé" }, 401);

  try {
    if (request.method === "GET") return await handleGet(request, user.id);
    if (request.method === "POST") return await handlePost(request, user.id);
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  } catch (error) {
    logger.error("Erreur de l'API des présences musicien :", error);
    return jsonResponse({ error: "Erreur interne du serveur" }, 500);
  }
}
