import { env } from "cloudflare:workers";
import { logger, getRequestLogContext } from "@/lib/logger";
import { getFreeEvent, RENCONTRE_HARMONIES_2026 } from "@/lib/free-events";
import { computeReservationStats } from "@/lib/free-events/stats";

import type { ReservationStatsRow } from "@/lib/free-events/stats";

function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return new Response(request.method === "HEAD" ? null : JSON.stringify(body, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

async function tokensMatch(expected: string, provided: string): Promise<boolean> {
  const encoder = new globalThis.TextEncoder();
  const [expectedDigest, providedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
  ]);
  const expectedBytes = new Uint8Array(expectedDigest);
  const providedBytes = new Uint8Array(providedDigest);
  let difference = 0;
  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= expectedBytes[index] ^ providedBytes[index];
  }
  return difference === 0;
}

export async function handleReservationStatsApi(request: Request): Promise<Response> {
  const expected = env.RESERVATIONS_STATS_TOKEN;
  const provided = new URL(request.url).searchParams.get("token");
  if (!expected || !provided || !(await tokensMatch(expected, provided))) {
    return jsonResponse(request, { error: "Introuvable." }, 404);
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse(request, { error: "Méthode non autorisée." }, 405);
  }

  try {
    const url = new URL(request.url);
    const event = getFreeEvent(url.searchParams.get("event") ?? RENCONTRE_HARMONIES_2026.slug);
    if (!event) return jsonResponse(request, { error: "Événement introuvable." }, 404);

    const result = await env.DB.prepare(
      `SELECT party_size, interests, source, newsletter_opt_in, unsubscribed_at, status, origin,
        email IS NOT NULL AS has_email, confirmation_sent_at,
        confirmation_error IS NOT NULL AS has_confirmation_error, anonymized_at, created_at
      FROM free_reservations WHERE event_slug = ?`
    )
      .bind(event.slug)
      .all<ReservationStatsRow>();

    return jsonResponse(request, computeReservationStats(event, result.results));
  } catch (error) {
    logger.error(
      "Erreur API des statistiques de réservations",
      error,
      getRequestLogContext(request)
    );
    return jsonResponse(request, { error: "Une erreur est survenue." }, 500);
  }
}
