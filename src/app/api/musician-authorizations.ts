import { env } from "cloudflare:workers";
import { resolveMusicianIdentity } from "./auth";
import {
  formatPortalAuthorization,
  type EventAuthorizationRow,
  type PresenceEventRow,
} from "./musician-presence";
import { getParisDate } from "@/lib/presence";
import { logger } from "@/lib/logger";
import { canAnswerPresenceOnline, PRESENCE_SHEET_URL } from "@/lib/presence-beta";

interface AuthorizationRequestBody {
  eventId: number;
  authorize: boolean;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isAuthorizationRequestBody(value: unknown): value is AuthorizationRequestBody {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.eventId === "number" &&
    Number.isSafeInteger(record.eventId) &&
    record.eventId > 0 &&
    typeof record.authorize === "boolean"
  );
}

async function readAuthorization(
  event: PresenceEventRow,
  childUserId: number
): Promise<EventAuthorizationRow | null> {
  return env.DB.prepare(
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
}

export async function handleMusicianAuthorizationsApi(request: Request): Promise<Response> {
  let identity: Awaited<ReturnType<typeof resolveMusicianIdentity>>;
  try {
    identity = await resolveMusicianIdentity(request);
  } catch (error) {
    logger.error("Erreur lors de la résolution de l'identité musicien :", error);
    return jsonResponse({ error: "Erreur interne du serveur" }, 500);
  }
  if (!identity) return jsonResponse({ error: "Non autorisé" }, 401);
  if (request.method !== "POST") return jsonResponse({ error: "Méthode non autorisée" }, 405);
  if (!canAnswerPresenceOnline(identity.actor.email)) {
    return jsonResponse(
      {
        error: "Les réponses de présence se font pour l'instant dans le fichier des présences.",
        sheetUrl: PRESENCE_SHEET_URL,
      },
      403
    );
  }
  if (!identity.delegated) {
    return jsonResponse({ error: "Seul un responsable peut gérer cette autorisation." }, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Le corps de la requête est invalide." }, 400);
  }
  if (!isAuthorizationRequestBody(body)) {
    return jsonResponse({ error: "Les données d'autorisation sont invalides." }, 400);
  }

  try {
    const childUserId = identity.effective.id;
    const linked = await env.DB.prepare(
      `SELECT 1 AS linked
       FROM guardian_links gl
       JOIN users child ON child.id = gl.child_user_id
       WHERE gl.child_user_id = ? AND gl.guardian_user_id = ?
         AND child.role = 'MUSICIAN' AND child.is_active = 1 AND child.kind <> 'guardian'
       LIMIT 1`
    )
      .bind(childUserId, identity.actor.id)
      .first<{ linked: number }>();
    if (!linked) {
      return jsonResponse({ error: "Ce musicien n'est pas relié à votre compte." }, 403);
    }

    const event = await env.DB.prepare(
      `SELECT id, title, date, time, location, address, response_deadline,
              parental_authorization_required, authorization_details
       FROM events WHERE id = ?`
    )
      .bind(body.eventId)
      .first<PresenceEventRow>();
    if (
      !event ||
      event.parental_authorization_required !== 1 ||
      event.date < getParisDate()
    ) {
      return jsonResponse(
        { error: "Cette prestation ne demande pas d'autorisation ou est déjà passée." },
        403
      );
    }

    if (body.authorize) {
      const result = await env.DB.prepare(
        `INSERT INTO event_authorizations (
           event_id, child_user_id, guardian_user_id, recorded_by, details_snapshot, authorized_at
         )
         SELECT ?, ?, ?, NULL, ?, datetime('now')
         WHERE EXISTS (
           SELECT 1 FROM guardian_links
           WHERE child_user_id = ? AND guardian_user_id = ?
         )
         ON CONFLICT(event_id, child_user_id) DO UPDATE SET
           guardian_user_id = excluded.guardian_user_id,
           recorded_by = NULL,
           details_snapshot = excluded.details_snapshot,
           authorized_at = datetime('now')`
      )
        .bind(
          event.id,
          childUserId,
          identity.actor.id,
          event.authorization_details,
          childUserId,
          identity.actor.id
        )
        .run();
      if (result.meta.changes === 0) {
        return jsonResponse({ error: "Ce musicien n'est plus relié à votre compte." }, 403);
      }
    } else {
      await env.DB.prepare(
        `DELETE FROM event_authorizations
         WHERE event_id = ? AND child_user_id = ?
           AND EXISTS (
             SELECT 1 FROM guardian_links
             WHERE child_user_id = ? AND guardian_user_id = ?
           )`
      )
        .bind(event.id, childUserId, childUserId, identity.actor.id)
        .run();
    }

    const authorization = await readAuthorization(event, childUserId);
    const responseAuthorization = formatPortalAuthorization(
      event,
      authorization,
      true,
      identity.actor.id,
      identity.delegated
    );
    return jsonResponse({ success: true, authorization: responseAuthorization });
  } catch (error) {
    logger.error("Erreur de l'API des autorisations parentales :", error);
    return jsonResponse({ error: "Erreur interne du serveur" }, 500);
  }
}
