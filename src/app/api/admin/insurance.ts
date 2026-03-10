import { env } from "cloudflare:workers";
import type { InsuranceInstrument } from "@/db/types";

import { checkAdminAuth } from "../admin-crud";
import { invalidateCache } from "@/lib/cache";

import { logger } from "@/lib/logger";
void invalidateCache;

interface InsuranceInstrumentWithUser extends InsuranceInstrument {
  email: string;
  first_name: string | null;
  last_name: string | null;
}

export async function handleInsuranceApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      const instruments = await env.DB.prepare(
        `
        SELECT ii.*, u.email, mp.first_name, mp.last_name
        FROM insurance_instruments ii
        JOIN users u ON ii.user_id = u.id
        LEFT JOIN musician_profiles mp ON ii.user_id = mp.user_id
        ORDER BY mp.last_name ASC, mp.first_name ASC
      `
      ).all<InsuranceInstrumentWithUser>();

      return new Response(JSON.stringify(instruments.results || []), {
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
      await env.DB.prepare("DELETE FROM insurance_instruments WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Insurance API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
