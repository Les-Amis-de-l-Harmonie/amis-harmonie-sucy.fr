import { env } from "cloudflare:workers";
import type { User } from "@/db/types";
import { isAdmin } from "@/db/types";

export async function handleUserCheckRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await request.formData();
    const email = formData.get("email")?.toString().toLowerCase().trim();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await env.DB.prepare(
      "SELECT id, email, role, is_active, created_at, last_login FROM users WHERE email = ?"
    )
      .bind(email)
      .first<User>();

    if (!user) {
      return new Response(
        JSON.stringify({
          exists: false,
          message: "Utilisateur non trouvé",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        exists: true,
        role: user.role,
        isAdmin: isAdmin(user.role),
        isActive: user.is_active === 1,
        hasLoggedIn: user.last_login !== null,
        createdAt: user.created_at,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
