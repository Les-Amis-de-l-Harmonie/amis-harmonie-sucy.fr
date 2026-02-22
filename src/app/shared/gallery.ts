import { env } from "cloudflare:workers";
import type { GalleryImage, GalleryCategory } from "@/db/types";

export async function getGalleryImages(category: GalleryCategory): Promise<GalleryImage[]> {
  const images = await env.DB.prepare(
    "SELECT * FROM gallery_images WHERE category = ? ORDER BY sort_order ASC"
  )
    .bind(category)
    .all<GalleryImage>();
  return images.results || [];
}
