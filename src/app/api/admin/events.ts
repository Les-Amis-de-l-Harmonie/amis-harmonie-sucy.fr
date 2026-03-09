import { env } from "cloudflare:workers";
import { invalidateCache } from "@/lib/cache";
import { checkAdminAuth } from "@/app/api/admin-crud";
import type { EventInput } from "@/app/api/admin-crud";

export async function handleEventsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const event = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).first();
        return new Response(JSON.stringify(event), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const events = await env.DB.prepare("SELECT * FROM events ORDER BY date DESC").all();
      return new Response(JSON.stringify(events.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = (await request.json()) as EventInput;
      const result = await env.DB.prepare(
        `INSERT INTO events (title, image, location, description, date, time, price, details_link, reservation_link)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
          data.reservation_link || null
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
      await env.DB.prepare(
        `UPDATE events SET title = ?, image = ?, location = ?, description = ?, date = ?, time = ?, price = ?, details_link = ?, reservation_link = ? WHERE id = ?`
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
    console.error("Events API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
