import { env } from "cloudflare:workers";
import type { Event } from "@/db/types";
import { checkAdminAuth } from "@/app/api/admin-crud";
import {
  PRESENCE_MEMBER_QUERY,
  summarisePresence,
  type PresenceMember,
  type PresenceRow,
} from "@/lib/presence";
import { logger } from "@/lib/logger";

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

export async function handleAdminPresenceApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const eventId = new URL(request.url).searchParams.get("eventId");

  try {
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

    const memberRows = await env.DB.prepare(PRESENCE_MEMBER_QUERY).bind(eventId).all<PresenceRow>();
    const summary = summarisePresence(memberRows.results, event.response_deadline);

    const comments = await env.DB.prepare(
      "SELECT user_id AS userId, comment FROM event_presences WHERE event_id = ?"
    )
      .bind(eventId)
      .all<PresenceCommentRow>();
    const commentsByUserId = new Map(
      comments.results.map((row) => [row.userId, row.comment] as const)
    );

    return jsonResponse({
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
    });
  } catch (error) {
    logger.error("Admin presence API error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
}
