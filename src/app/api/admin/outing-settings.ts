import { env } from "cloudflare:workers";
import type { OutingSettings } from "@/db/types";

import { checkAdminAuth } from "../admin-crud";
import { invalidateCache } from "@/lib/cache";

import { logger } from "@/lib/logger";
export async function handleOutingSettingsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  try {
    if (request.method === "GET") {
      const settings = await env.DB.prepare(
        "SELECT * FROM outing_settings WHERE id = 1"
      ).first<OutingSettings>();

      if (!settings) {
        return new Response(
          JSON.stringify({
            id: 1,
            title: "Inscription Sortie",
            subtitle: null,
            description: null,
            location: null,
            price: null,
            button_text: "S'inscrire",
            button_link: null,
            is_active: 0,
          }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify(settings), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = (await request.json()) as {
        title: string;
        subtitle?: string | null;
        description?: string | null;
        location?: string | null;
        price?: string | null;
        button_text: string;
        button_link?: string | null;
        is_active: number;
      };

      await env.DB.prepare(
        `INSERT INTO outing_settings (id, title, subtitle, description, location, price, button_text, button_link, is_active, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           subtitle = excluded.subtitle,
           description = excluded.description,
           location = excluded.location,
           price = excluded.price,
           button_text = excluded.button_text,
           button_link = excluded.button_link,
           is_active = excluded.is_active,
           updated_at = CURRENT_TIMESTAMP`
      )
        .bind(
          data.title,
          data.subtitle || null,
          data.description || null,
          data.location || null,
          data.price || null,
          data.button_text,
          data.button_link || null,
          data.is_active
        )
        .run();

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
    logger.error("Outing settings API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
