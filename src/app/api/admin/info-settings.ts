import { env } from "cloudflare:workers";
import type { InfoSettings } from "@/db/types";

import { checkAdminAuth } from "../admin-crud";
import { invalidateCache } from "@/lib/cache";

import { logger } from "@/lib/logger";
export async function handleInfoSettingsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  try {
    if (request.method === "GET") {
      const settings = await env.DB.prepare(
        "SELECT * FROM info_settings WHERE id = 1"
      ).first<InfoSettings>();

      if (!settings) {
        return new Response(
          JSON.stringify({
            id: 1,
            title: "Information",
            subtitle: null,
            content: null,
            bg_color: "bg-blue-50",
            text_color: "text-blue-900",
            border_color: "border-blue-200",
            icon: "Info",
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
        content?: string | null;
        bg_color: string;
        text_color: string;
        border_color: string;
        icon: string;
        is_active: number;
      };

      await env.DB.prepare(
        `INSERT INTO info_settings (id, title, subtitle, content, bg_color, text_color, border_color, icon, is_active, updated_at)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           subtitle = excluded.subtitle,
           content = excluded.content,
           bg_color = excluded.bg_color,
           text_color = excluded.text_color,
           border_color = excluded.border_color,
           icon = excluded.icon,
           is_active = excluded.is_active,
           updated_at = CURRENT_TIMESTAMP`
      )
        .bind(
          data.title,
          data.subtitle || null,
          data.content || null,
          data.bg_color,
          data.text_color,
          data.border_color,
          data.icon,
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
    logger.error("Info settings API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
