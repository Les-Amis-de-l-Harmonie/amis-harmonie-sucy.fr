import { env } from "cloudflare:workers";
import type { Event } from "@/db/types";
import { invalidateCache } from "@/lib/cache";
import { checkAdminAuth } from "@/app/api/admin-crud";
import type { EventInput } from "@/app/api/admin-crud";

import { logger } from "@/lib/logger";

function getResponseDeadline(data: EventInput): string | null {
  const responseDeadline = data.response_deadline;
  if (responseDeadline === undefined || responseDeadline === null || responseDeadline === "") {
    return null;
  }

  return responseDeadline;
}

function invalidResponseDeadlineResponse(): Response {
  return new Response(
    JSON.stringify({ error: "La date limite de réponse doit être au format AAAA-MM-JJ." }),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}

function normalizeFlag(value: number | undefined, defaultValue: number): number {
  return value === undefined ? defaultValue : value ? 1 : 0;
}

// À la mise à jour, un indicateur absent de la requête doit conserver sa valeur
// actuelle et non revenir à sa valeur par défaut : sans cela, une mise à jour
// partielle rendrait publique une prestation interne (is_public repasserait à 1).
// La valeur null est combinée à COALESCE(?, colonne) côté SQL.
function preservedFlag(value: number | undefined): number | null {
  return value === undefined ? null : value ? 1 : 0;
}

// À la mise à jour, undefined conserve la valeur et null ou "" l'efface explicitement.
function preservedNullableText(value: string | null | undefined): string | null {
  return value === undefined ? null : value === null || value === "" ? "" : value;
}

export async function handleEventsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const event = await env.DB.prepare("SELECT * FROM events WHERE id = ?")
          .bind(id)
          .first<Event>();
        return new Response(JSON.stringify(event), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const events = await env.DB.prepare("SELECT * FROM events ORDER BY date DESC").all<Event>();
      return new Response(JSON.stringify(events.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = (await request.json()) as EventInput;
      const responseDeadline = getResponseDeadline(data);
      if (responseDeadline !== null && !/^\d{4}-\d{2}-\d{2}$/.test(responseDeadline)) {
        return invalidResponseDeadlineResponse();
      }
      const result = await env.DB.prepare(
        `INSERT INTO events (title, image, location, description, date, time, price, details_link, reservation_link, is_public, presence_required, address, response_deadline)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          data.title,
          data.image || null,
          data.location || null,
          data.description || null,
          data.date,
          data.time || null,
          data.price || null,
          data.details_link || null,
          data.reservation_link || null,
          normalizeFlag(data.is_public, 1),
          normalizeFlag(data.presence_required, 0),
          data.address || null,
          responseDeadline
        )
        .run();
      await invalidateCache();
      return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "PUT") {
      if (!id) {
        return new Response(JSON.stringify({ error: "ID required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const data = (await request.json()) as EventInput;
      const responseDeadline = getResponseDeadline(data);
      if (responseDeadline !== null && !/^\d{4}-\d{2}-\d{2}$/.test(responseDeadline)) {
        return invalidResponseDeadlineResponse();
      }
      await env.DB.prepare(
        `UPDATE events SET title = ?, image = ?, location = ?, description = ?, date = ?, time = ?, price = ?, details_link = ?, reservation_link = ?, is_public = COALESCE(?, is_public), presence_required = COALESCE(?, presence_required), address = NULLIF(COALESCE(?, address), ''), response_deadline = NULLIF(COALESCE(?, response_deadline), '') WHERE id = ?`
      )
        .bind(
          data.title,
          data.image || null,
          data.location || null,
          data.description || null,
          data.date,
          data.time || null,
          data.price || null,
          data.details_link || null,
          data.reservation_link || null,
          preservedFlag(data.is_public),
          preservedFlag(data.presence_required),
          preservedNullableText(data.address),
          preservedNullableText(data.response_deadline),
          id
        )
        .run();
      await invalidateCache();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "DELETE") {
      if (!id) {
        return new Response(JSON.stringify({ error: "ID required" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
      await invalidateCache();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Events API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
