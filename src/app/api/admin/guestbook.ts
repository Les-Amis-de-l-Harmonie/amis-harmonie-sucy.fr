import { env } from "cloudflare:workers";
import type { GuestbookEntry } from "@/db/types";

import { invalidateCache } from "@/lib/cache";
import { checkAdminAuth } from "@/app/api/admin-crud";

import { logger } from "@/lib/logger";
interface GuestbookInput {
  first_name: string;
  last_name: string;
  message: string;
  date: string;
}

export async function handleGuestbookApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const entry = await env.DB.prepare("SELECT * FROM guestbook WHERE id = ?")
          .bind(id)
          .first<GuestbookEntry>();
        return new Response(JSON.stringify(entry), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const entries = await env.DB.prepare(
        "SELECT * FROM guestbook ORDER BY date DESC"
      ).all<GuestbookEntry>();
      return new Response(JSON.stringify(entries.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = (await request.json()) as GuestbookInput;
      const result = await env.DB.prepare(
        "INSERT INTO guestbook (first_name, last_name, message, date) VALUES (?, ?, ?, ?)"
      )
        .bind(data.first_name, data.last_name, data.message, data.date)
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
      const data = (await request.json()) as GuestbookInput;
      await env.DB.prepare(
        "UPDATE guestbook SET first_name = ?, last_name = ?, message = ?, date = ? WHERE id = ?"
      )
        .bind(data.first_name, data.last_name, data.message, data.date, id)
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
      await env.DB.prepare("DELETE FROM guestbook WHERE id = ?").bind(id).run();
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
    logger.error("Guestbook API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
