import { env } from "cloudflare:workers";
import { resolveMusicianIdentity } from "./auth";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Bascule le profil actif uniquement parmi ceux résolus depuis la session courante. */
export async function handleMusicianActingApi(request: Request): Promise<Response> {
  const identity = await resolveMusicianIdentity(request);
  if (!identity) return jsonResponse({ error: "Non autorisé" }, 401);
  if (request.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Le corps de la requête est invalide." }, 400);
  }
  if (!isRecord(body) || !(body.userId === null || typeof body.userId === "number")) {
    return jsonResponse({ error: "Le profil demandé est invalide." }, 400);
  }

  const userId = body.userId === null ? identity.actor.id : body.userId;
  if (
    !Number.isInteger(userId) ||
    !identity.profiles.some((profile) => profile.userId === userId)
  ) {
    return jsonResponse({ error: "Vous ne pouvez pas agir pour ce profil." }, 403);
  }

  await env.DB.prepare(
    "UPDATE sessions SET acting_user_id = ? WHERE session_id = ? AND user_id = ?"
  )
    .bind(userId, identity.actor.sessionId, identity.actor.id)
    .run();

  return jsonResponse({ success: true });
}
