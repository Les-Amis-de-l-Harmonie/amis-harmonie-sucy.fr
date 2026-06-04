import { env } from "cloudflare:workers";
import type { PlanningEvent, PlanningInput } from "@/db/types";
import { invalidateCache } from "@/lib/cache";
import { checkAdminAuth } from "@/app/api/admin-crud";

import { logger } from "@/lib/logger";

export async function handlePlanningEventsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const event = await env.DB.prepare("SELECT * FROM planning_events WHERE id = ?")
          .bind(id)
          .first<PlanningEvent>();
        return new Response(JSON.stringify(event), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const events = await env.DB.prepare(
        "SELECT * FROM planning_events ORDER BY date ASC, sort_order ASC"
      ).all<PlanningEvent>();
      return new Response(JSON.stringify(events.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = (await request.json()) as PlanningInput;
      const result = await env.DB.prepare(
        `INSERT INTO planning_events (name, date, time, location, address, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          data.name,
          data.date,
          data.time || null,
          data.location || null,
          data.address || null,
          data.sort_order ?? 0
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
      const data = (await request.json()) as PlanningInput;
      await env.DB.prepare(
        `UPDATE planning_events SET name = ?, date = ?, time = ?, location = ?, address = ?, sort_order = ? WHERE id = ?`
      )
        .bind(
          data.name,
          data.date,
          data.time || null,
          data.location || null,
          data.address || null,
          data.sort_order ?? 0,
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
      await env.DB.prepare("DELETE FROM planning_events WHERE id = ?").bind(id).run();
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
    logger.error("Planning Events API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
