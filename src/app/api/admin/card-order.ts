import { env } from "cloudflare:workers";
import type { CardOrderSettings } from "@/db/types";

import { checkAdminAuth } from "../admin-crud";
import { invalidateCache } from "@/lib/cache";

import { logger } from "@/lib/logger";
export async function handleCardOrderSettingsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  try {
    if (request.method === "GET") {
      const settings = await env.DB.prepare(
        "SELECT * FROM card_order_settings WHERE id = 1"
      ).first<CardOrderSettings>();

      if (!settings) {
        const defaultOrder = [
          "profile",
          "adhesion",
          "assurance",
          "planning",
          "partitions",
          "boite-a-idee",
          "outing",
          "social",
        ];
        return new Response(
          JSON.stringify({
            id: 1,
            card_order: JSON.stringify(defaultOrder),
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
        card_order: string[];
      };

      await env.DB.prepare(
        `INSERT INTO card_order_settings (id, card_order, updated_at)
         VALUES (1, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(id) DO UPDATE SET
           card_order = excluded.card_order,
           updated_at = CURRENT_TIMESTAMP`
      )
        .bind(JSON.stringify(data.card_order))
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
    logger.error("Card order settings API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
