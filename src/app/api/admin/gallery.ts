import { env } from "cloudflare:workers";
import type { GalleryCategory } from "@/db/types";
import { invalidateCache } from "@/lib/cache";
import { checkAdminAuth } from "../admin-crud";

interface GalleryImageInput {
  category: GalleryCategory;
  image_url: string;
  alt_text?: string;
  link_url?: string;
  link_name?: string;
  sort_order?: number;
}

interface ReorderInput {
  ids: number[];
}

export async function handleGalleryApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const category = url.searchParams.get("category") as GalleryCategory | null;
  const action = url.searchParams.get("action");

  try {
    if (request.method === "GET") {
      if (id) {
        const image = await env.DB.prepare("SELECT * FROM gallery_images WHERE id = ?")
          .bind(id)
          .first();
        return new Response(JSON.stringify(image), {
          headers: { "Content-Type": "application/json" },
        });
      }
      if (category) {
        const images = await env.DB.prepare(
          "SELECT * FROM gallery_images WHERE category = ? ORDER BY sort_order ASC"
        )
          .bind(category)
          .all();
        return new Response(JSON.stringify(images.results), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const images = await env.DB.prepare(
        "SELECT * FROM gallery_images ORDER BY category, sort_order ASC"
      ).all();
      return new Response(JSON.stringify(images.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      if (action === "reorder") {
        const data = (await request.json()) as ReorderInput;
        if (!data.ids || !Array.isArray(data.ids)) {
          return new Response(JSON.stringify({ error: "ids array required" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        for (let i = 0; i < data.ids.length; i++) {
          await env.DB.prepare("UPDATE gallery_images SET sort_order = ? WHERE id = ?")
            .bind(i, data.ids[i])
            .run();
        }
        await invalidateCache();
        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = (await request.json()) as GalleryImageInput;
      const maxOrder = await env.DB.prepare(
        "SELECT MAX(sort_order) as max_order FROM gallery_images WHERE category = ?"
      )
        .bind(data.category)
        .first<{ max_order: number | null }>();
      const nextOrder = (maxOrder?.max_order ?? -1) + 1;

      const result = await env.DB.prepare(
        `INSERT INTO gallery_images (category, image_url, alt_text, link_url, link_name, sort_order) 
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(
          data.category,
          data.image_url,
          data.alt_text || null,
          data.link_url || null,
          data.link_name || null,
          data.sort_order ?? nextOrder
        )
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
      const data = (await request.json()) as GalleryImageInput;
      await env.DB.prepare(
        `UPDATE gallery_images SET category = ?, image_url = ?, alt_text = ?, link_url = ?, link_name = ?, sort_order = ? WHERE id = ?`
      )
        .bind(
          data.category,
          data.image_url,
          data.alt_text || null,
          data.link_url || null,
          data.link_name || null,
          data.sort_order ?? 0,
          id
        )
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
      const image = await env.DB.prepare("SELECT image_url FROM gallery_images WHERE id = ?")
        .bind(id)
        .first<{ image_url: string }>();
      if (image?.image_url?.includes("/images/r2/")) {
        const r2Path = image.image_url.replace("/images/r2/", "");
        try {
          await env.R2.delete(r2Path);
        } catch (e) {
          console.error("Error deleting R2 object:", e);
        }
      }
      await env.DB.prepare("DELETE FROM gallery_images WHERE id = ?").bind(id).run();
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
    console.error("Gallery API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
