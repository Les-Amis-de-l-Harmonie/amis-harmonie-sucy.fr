import { env } from "cloudflare:workers";
import { verifySession } from "./auth";

async function checkAuth(request: Request): Promise<Response | null> {
  const session = await verifySession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export async function handleEventsApi(request: Request): Promise<Response> {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const event = await env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).first();
        return new Response(JSON.stringify(event), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const events = await env.DB.prepare("SELECT * FROM events ORDER BY date DESC").all();
      return new Response(JSON.stringify(events.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = await request.json();
      const result = await env.DB.prepare(
        `INSERT INTO events (title, image, location, description, date, time, price, details_link, reservation_link) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        data.title,
        data.image || null,
        data.location || null,
        data.description || null,
        data.date,
        data.time || null,
        data.price || null,
        data.details_link || null,
        data.reservation_link || null
      ).run();
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
      const data = await request.json();
      await env.DB.prepare(
        `UPDATE events SET title = ?, image = ?, location = ?, description = ?, date = ?, time = ?, price = ?, details_link = ?, reservation_link = ? WHERE id = ?`
      ).bind(
        data.title,
        data.image || null,
        data.location || null,
        data.description || null,
        data.date,
        data.time || null,
        data.price || null,
        data.details_link || null,
        data.reservation_link || null,
        id
      ).run();
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
      await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Events API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleVideosApi(request: Request): Promise<Response> {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const video = await env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(id).first();
        return new Response(JSON.stringify(video), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const videos = await env.DB.prepare("SELECT * FROM videos ORDER BY created_at DESC").all();
      return new Response(JSON.stringify(videos.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = await request.json();
      const result = await env.DB.prepare(
        "INSERT INTO videos (title, youtube_id, thumbnail) VALUES (?, ?, ?)"
      ).bind(data.title, data.youtube_id, data.thumbnail || null).run();
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
      const data = await request.json();
      await env.DB.prepare(
        "UPDATE videos SET title = ?, youtube_id = ?, thumbnail = ? WHERE id = ?"
      ).bind(data.title, data.youtube_id, data.thumbnail || null, id).run();
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
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Videos API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handlePublicationsApi(request: Request): Promise<Response> {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const pub = await env.DB.prepare("SELECT * FROM publications WHERE id = ?").bind(id).first();
        return new Response(JSON.stringify(pub), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const pubs = await env.DB.prepare("SELECT * FROM publications ORDER BY created_at DESC").all();
      return new Response(JSON.stringify(pubs.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = await request.json();
      const result = await env.DB.prepare(
        "INSERT INTO publications (instagram_post_id) VALUES (?)"
      ).bind(data.instagram_post_id).run();
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
      const data = await request.json();
      await env.DB.prepare(
        "UPDATE publications SET instagram_post_id = ? WHERE id = ?"
      ).bind(data.instagram_post_id, id).run();
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
      await env.DB.prepare("DELETE FROM publications WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Publications API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleGuestbookApi(request: Request): Promise<Response> {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const entry = await env.DB.prepare("SELECT * FROM guestbook WHERE id = ?").bind(id).first();
        return new Response(JSON.stringify(entry), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const entries = await env.DB.prepare("SELECT * FROM guestbook ORDER BY date DESC").all();
      return new Response(JSON.stringify(entries.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = await request.json();
      const result = await env.DB.prepare(
        "INSERT INTO guestbook (first_name, last_name, message, date) VALUES (?, ?, ?, ?)"
      ).bind(data.first_name, data.last_name, data.message, data.date).run();
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
      const data = await request.json();
      await env.DB.prepare(
        "UPDATE guestbook SET first_name = ?, last_name = ?, message = ?, date = ? WHERE id = ?"
      ).bind(data.first_name, data.last_name, data.message, data.date, id).run();
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
      await env.DB.prepare("DELETE FROM guestbook WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Guestbook API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleContactApi(request: Request): Promise<Response> {
  const authError = await checkAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const sub = await env.DB.prepare("SELECT * FROM contact_submissions WHERE id = ?").bind(id).first();
        return new Response(JSON.stringify(sub), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const subs = await env.DB.prepare("SELECT * FROM contact_submissions ORDER BY created_at DESC").all();
      return new Response(JSON.stringify(subs.results), {
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
      await env.DB.prepare("DELETE FROM contact_submissions WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Contact API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
