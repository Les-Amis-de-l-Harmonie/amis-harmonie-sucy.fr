import { env } from "cloudflare:workers";

import { checkAdminAuth } from "../admin-crud";
import { invalidateCache } from "@/lib/cache";

import { logger } from "@/lib/logger";
void invalidateCache;

export async function handleR2CleanupApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dry_run") !== "false";

  try {
    const referencedUrls = new Set<string>();

    const galleryImages = await env.DB.prepare("SELECT image_url FROM gallery_images").all<{
      image_url: string;
    }>();
    for (const row of galleryImages.results || []) {
      if (row.image_url.includes("/images/r2/")) {
        referencedUrls.add(row.image_url.replace("/images/r2/", ""));
      }
    }

    // Volontairement non filtré sur is_public : tout événement référence une image,
    // qu'il soit public ou interne. Ajouter « WHERE is_public = 1 » ici classerait les
    // images des événements internes comme orphelines et les supprimerait définitivement.
    const eventImages = await env.DB.prepare(
      "SELECT image FROM events WHERE image IS NOT NULL"
    ).all<{
      image: string;
    }>();
    for (const row of eventImages.results || []) {
      if (row.image.includes("/images/r2/")) {
        referencedUrls.add(row.image.replace("/images/r2/", ""));
      }
    }

    const avatars = await env.DB.prepare(
      "SELECT avatar FROM musician_profiles WHERE avatar IS NOT NULL"
    ).all<{ avatar: string }>();
    for (const row of avatars.results || []) {
      if (row.avatar.includes("/images/r2/")) {
        referencedUrls.add(row.avatar.replace("/images/r2/", ""));
      }
    }

    const allR2Objects: string[] = [];
    let cursor: string | undefined;
    do {
      const listed = await env.R2.list({ cursor, limit: 1000 });
      for (const obj of listed.objects) {
        allR2Objects.push(obj.key);
      }
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    const orphans = allR2Objects.filter((key) => !referencedUrls.has(key));
    const kept = allR2Objects.filter((key) => referencedUrls.has(key));

    if (!dryRun && orphans.length > 0) {
      for (const key of orphans) {
        await env.R2.delete(key);
      }
    }

    return new Response(
      JSON.stringify(
        {
          dry_run: dryRun,
          total_r2_objects: allR2Objects.length,
          referenced_in_db: referencedUrls.size,
          orphans_found: orphans.length,
          orphans,
          kept: kept.length,
          deleted: dryRun ? 0 : orphans.length,
        },
        null,
        2
      ),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("R2 cleanup error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
