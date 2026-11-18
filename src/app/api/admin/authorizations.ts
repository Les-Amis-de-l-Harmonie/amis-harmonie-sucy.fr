import { env } from "cloudflare:workers";
import { verifySession } from "@/app/api/auth";
import { isAdmin } from "@/db/types";
import { logger } from "@/lib/logger";

interface AdminAuthorizationRequestBody {
  eventId: number;
  childUserId: number;
  authorize: boolean;
  guardianUserId?: number;
}

interface EventAuthorizationContext {
  id: number;
  authorization_details: string | null;
  parental_authorization_required: number;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isPositiveId(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isRequestBody(value: unknown): value is AdminAuthorizationRequestBody {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    isPositiveId(record.eventId) &&
    isPositiveId(record.childUserId) &&
    typeof record.authorize === "boolean" &&
    (record.guardianUserId === undefined || isPositiveId(record.guardianUserId))
  );
}

export async function handleAdminAuthorizationsApi(request: Request): Promise<Response> {
  let admin: Awaited<ReturnType<typeof verifySession>>;
  try {
    admin = await verifySession(request, "admin");
  } catch (error) {
    logger.error("Admin authorization authentication error:", error);
    return jsonResponse({ error: "Une erreur interne est survenue." }, 500);
  }
  if (!admin || !isAdmin(admin.role)) return jsonResponse({ error: "Non autorisé" }, 401);
  if (request.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Le corps de la requête est invalide." }, 400);
  }
  if (!isRequestBody(body)) {
    return jsonResponse({ error: "Les données d'autorisation sont invalides." }, 400);
  }

  try {
    const eventId = body.eventId;
    const childUserId = body.childUserId;
    const guardianUserId = body.guardianUserId ?? null;
    const event = await env.DB.prepare(
      "SELECT id, parental_authorization_required, authorization_details FROM events WHERE id = ?"
    )
      .bind(eventId)
      .first<EventAuthorizationContext>();
    if (!event || event.parental_authorization_required !== 1) {
      return jsonResponse({ error: "Cette prestation ne demande pas d'autorisation parentale." }, 400);
    }

    const child = await env.DB.prepare(
      `SELECT id FROM users
       WHERE id = ? AND role = 'MUSICIAN' AND is_active = 1 AND kind <> 'guardian'
         AND EXISTS (SELECT 1 FROM guardian_links WHERE child_user_id = users.id)`
    )
      .bind(childUserId)
      .first<{ id: number }>();
    if (!child) {
      return jsonResponse({ error: "Ce musicien n'est pas concerné par l'autorisation." }, 400);
    }

    if (guardianUserId !== null) {
      const link = await env.DB.prepare(
        "SELECT id FROM guardian_links WHERE guardian_user_id = ? AND child_user_id = ?"
      )
        .bind(guardianUserId, childUserId)
        .first<{ id: number }>();
      if (!link) return jsonResponse({ error: "Ce responsable n'est pas lié à ce musicien." }, 400);
    }

    if (body.authorize) {
      await env.DB.prepare(
        `INSERT INTO event_authorizations (
           event_id, child_user_id, guardian_user_id, recorded_by, details_snapshot, authorized_at
         ) VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(event_id, child_user_id) DO UPDATE SET
           guardian_user_id = excluded.guardian_user_id,
           recorded_by = excluded.recorded_by,
           details_snapshot = excluded.details_snapshot,
           authorized_at = datetime('now')`
      )
        .bind(eventId, childUserId, guardianUserId, admin.id, event.authorization_details)
        .run();
    } else {
      await env.DB.prepare("DELETE FROM event_authorizations WHERE event_id = ? AND child_user_id = ?")
        .bind(eventId, childUserId)
        .run();
    }

    return jsonResponse({ success: true });
  } catch (error) {
    logger.error("Admin authorizations API error:", error);
    return jsonResponse({ error: "Une erreur interne est survenue." }, 500);
  }
}
