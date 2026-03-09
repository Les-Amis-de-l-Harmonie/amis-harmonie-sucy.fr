import { env } from "cloudflare:workers";

import { checkAdminAuth } from "@/app/api/admin-crud";

export async function handleContactApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const sub = await env.DB.prepare("SELECT * FROM contact_submissions WHERE id = ?")
          .bind(id)
          .first();
        return new Response(JSON.stringify(sub), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const subs = await env.DB.prepare(
        "SELECT * FROM contact_submissions ORDER BY created_at DESC"
      ).all();
      return new Response(JSON.stringify(subs.results), {
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
      await env.DB.prepare("DELETE FROM contact_submissions WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Contact API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
