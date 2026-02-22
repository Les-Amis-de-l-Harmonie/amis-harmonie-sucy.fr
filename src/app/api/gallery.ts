import { env } from "cloudflare:workers";
import type { GalleryImage, GalleryCategory } from "@/db/types";

export async function handlePublicGalleryApi(request: Request): Promise<Response> {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const category = url.searchParams.get("category") as GalleryCategory | null;

  try {
    if (category) {
      const images = await env.DB.prepare(
        "SELECT * FROM gallery_images WHERE category = ? ORDER BY sort_order ASC"
      )
        .bind(category)
        .all<GalleryImage>();
      return new Response(JSON.stringify(images.results), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    return new Response(JSON.stringify({ error: "category parameter required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Public Gallery API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
