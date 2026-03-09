import { env } from "cloudflare:workers";

import { invalidateCache } from "@/lib/cache";
import { checkAdminAuth } from "@/app/api/admin-crud";
import type { PublicationInput } from "@/app/api/admin-crud";

export async function handlePublicationsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const pub = await env.DB.prepare("SELECT * FROM publications WHERE id = ?")
          .bind(id)
          .first();
        return new Response(JSON.stringify(pub), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const pubs = await env.DB.prepare(
        "SELECT * FROM publications ORDER BY COALESCE(publication_date, date(created_at)) DESC, created_at DESC"
      ).all();
      return new Response(JSON.stringify(pubs.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = (await request.json()) as PublicationInput;
      const postId = data.instagram_post_id.trim().replace(/\/+$/, "");
      const result = await env.DB.prepare(
        "INSERT INTO publications (instagram_post_id, thumbnail, publication_date) VALUES (?, ?, ?)"
      )
        .bind(postId, data.thumbnail || null, data.publication_date || null)
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
      const data = (await request.json()) as PublicationInput;
      const postId = data.instagram_post_id.trim().replace(/\/+$/, "");
      await env.DB.prepare(
        "UPDATE publications SET instagram_post_id = ?, thumbnail = ?, publication_date = ? WHERE id = ?"
      )
        .bind(postId, data.thumbnail || null, data.publication_date || null, id)
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
      await env.DB.prepare("DELETE FROM publications WHERE id = ?").bind(id).run();
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
    console.error("Publications API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
