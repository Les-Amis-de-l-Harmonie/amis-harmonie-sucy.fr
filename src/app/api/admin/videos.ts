import { env } from "cloudflare:workers";
import type { Video } from "@/db/types";

import { checkAdminAuth } from "@/app/api/admin-crud";
import { invalidateCache } from "@/lib/cache";

import { logger } from "@/lib/logger";
interface VideoInput {
  title: string;
  youtube_id: string;
  thumbnail?: string | null;
  is_short?: number;
  publication_date?: string | null;
}

function parseYouTubeUrl(url: string): { id: string; isShort: boolean } | null {
  const trimmed = url.trim();

  const shortsMatch = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/
  );
  if (shortsMatch) {
    return { id: shortsMatch[1], isShort: true };
  }

  const shortUrlWithFeature = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+).*?(?:\?|&)feature=shorts/);
  if (shortUrlWithFeature) {
    return { id: shortUrlWithFeature[1], isShort: true };
  }

  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) {
    return { id: watchMatch[1], isShort: false };
  }

  const shortUrlMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortUrlMatch) {
    return { id: shortUrlMatch[1], isShort: false };
  }

  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/);
  if (embedMatch) {
    return { id: embedMatch[1], isShort: false };
  }

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return { id: trimmed, isShort: false };
  }

  return null;
}

export async function handleVideosApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const action = url.searchParams.get("action");

  try {
    if (request.method === "GET") {
      if (id) {
        const video = await env.DB.prepare("SELECT * FROM videos WHERE id = ?")
          .bind(id)
          .first<Video>();
        return new Response(JSON.stringify(video), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const videos = await env.DB.prepare(
        "SELECT * FROM videos ORDER BY sort_order ASC, publication_date DESC, created_at DESC"
      ).all<Video>();
      return new Response(JSON.stringify(videos.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      if (action === "reorder") {
        const { ids } = (await request.json()) as { ids: number[] };
        await Promise.all(
          ids.map((videoId, index) =>
            env.DB.prepare("UPDATE videos SET sort_order = ? WHERE id = ?")
              .bind(index, videoId)
              .run()
          )
        );
        await invalidateCache();
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const data = (await request.json()) as VideoInput;
      const parsed = parseYouTubeUrl(data.youtube_id);
      if (!parsed) {
        return new Response(JSON.stringify({ error: "Invalid YouTube URL or ID" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      await env.DB.prepare("UPDATE videos SET sort_order = sort_order + 1").run();
      const result = await env.DB.prepare(
        "INSERT INTO videos (title, youtube_id, thumbnail, is_short, publication_date, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
      )
        .bind(
          data.title,
          parsed.id,
          data.thumbnail || null,
          data.is_short ?? (parsed.isShort ? 1 : 0),
          data.publication_date || null,
          0
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
      const data = (await request.json()) as VideoInput;
      const parsed = parseYouTubeUrl(data.youtube_id);
      if (!parsed) {
        return new Response(JSON.stringify({ error: "Invalid YouTube URL or ID" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      await env.DB.prepare(
        "UPDATE videos SET title = ?, youtube_id = ?, thumbnail = ?, is_short = ?, publication_date = ? WHERE id = ?"
      )
        .bind(
          data.title,
          parsed.id,
          data.thumbnail || null,
          data.is_short ?? (parsed.isShort ? 1 : 0),
          data.publication_date || null,
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
      await env.DB.prepare("DELETE FROM videos WHERE id = ?").bind(id).run();
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
    logger.error("Videos API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
