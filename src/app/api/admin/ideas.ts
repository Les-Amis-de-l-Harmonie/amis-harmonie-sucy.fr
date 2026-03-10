import { env } from "cloudflare:workers";
import type { Idea } from "@/db/types";
import { checkAdminAuth } from "../admin-crud";

import { logger } from "@/lib/logger";
interface IdeaAdminListItem extends Idea {
  user_email: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
}

export async function handleIdeasApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      const ideas = await env.DB.prepare(
        `
        SELECT i.*, u.email as user_email, mp.first_name as user_first_name, mp.last_name as user_last_name
        FROM ideas i
        LEFT JOIN users u ON i.user_id = u.id
        LEFT JOIN musician_profiles mp ON i.user_id = mp.user_id
        ORDER BY i.created_at DESC
      `
      ).all<IdeaAdminListItem>();

      return new Response(JSON.stringify(ideas.results || []), {
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

      const data = (await request.json()) as {
        admin_notes?: string;
        is_public?: number;
      };

      const updates: string[] = [];
      const values: (string | number | null)[] = [];

      if (data.admin_notes !== undefined) {
        updates.push("admin_notes = ?");
        values.push(data.admin_notes || null);
      }

      if (data.is_public !== undefined) {
        updates.push("is_public = ?");
        values.push(data.is_public);
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");

      if (updates.length === 0) {
        return new Response(JSON.stringify({ error: "No fields to update" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      values.push(id);

      const query = `UPDATE ideas SET ${updates.join(", ")} WHERE id = ?`;
      await env.DB.prepare(query)
        .bind(...values)
        .run();

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
      await env.DB.prepare("DELETE FROM ideas WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Ideas API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
