import { env } from "cloudflare:workers";
import { verifySession } from "./auth";
import { invalidateCache } from "@/lib/cache";
import { isAdmin } from "@/db/types";
import type { GalleryCategory } from "@/db/types";

export interface EventInput {
  title: string;
  image?: string | null;
  location?: string | null;
  description?: string | null;
  date: string;
  time?: string | null;
  price?: string | null;
  details_link?: string | null;
  reservation_link?: string | null;
}

export interface PublicationInput {
  instagram_post_id: string;
  thumbnail?: string | null;
  publication_date?: string | null;
}

export async function checkAdminAuth(request: Request): Promise<Response | null> {
  const user = await verifySession(request, "admin");
  if (!user || !isAdmin(user.role)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

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

    const eventImages = await env.DB.prepare(
      "SELECT image FROM events WHERE image IS NOT NULL"
    ).all<{ image: string }>();
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
    console.error("R2 cleanup error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleIdeasApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      const ideas = await env.DB.prepare(
        `
        SELECT i.*, u.email as user_email, mp.first_name as user_first_name, mp.last_name as user_last_name
        FROM ideas i
        LEFT JOIN users u ON i.user_id = u.id
        LEFT JOIN musician_profiles mp ON i.user_id = mp.user_id
        ORDER BY i.created_at DESC
      `
      ).all();

      return new Response(JSON.stringify(ideas.results || []), {
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

      const data = (await request.json()) as {
        admin_notes?: string;
        is_public?: number;
      };

      const updates: string[] = [];
      const values: (string | number | null)[] = [];

      if (data.admin_notes !== undefined) {
        updates.push("admin_notes = ?");
        values.push(data.admin_notes || null);
      }

      if (data.is_public !== undefined) {
        updates.push("is_public = ?");
        values.push(data.is_public);
      }

      updates.push("updated_at = CURRENT_TIMESTAMP");

      if (updates.length === 0) {
        return new Response(JSON.stringify({ error: "No fields to update" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      values.push(id);

      const query = `UPDATE ideas SET ${updates.join(", ")} WHERE id = ?`;
      await env.DB.prepare(query)
        .bind(...values)
        .run();

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
      await env.DB.prepare("DELETE FROM ideas WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Ideas API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleOutingSettingsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  try {
    if (request.method === "GET") {
      const settings = await env.DB.prepare("SELECT * FROM outing_settings WHERE id = 1").first();

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
    console.error("Outing settings API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleCardOrderSettingsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  try {
    if (request.method === "GET") {
      const settings = await env.DB.prepare(
        "SELECT * FROM card_order_settings WHERE id = 1"
      ).first();

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
    console.error("Card order settings API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleInfoSettingsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  try {
    if (request.method === "GET") {
      const settings = await env.DB.prepare("SELECT * FROM info_settings WHERE id = 1").first();

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
    console.error("Info settings API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
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
      ).all();

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
    console.error("Insurance API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
