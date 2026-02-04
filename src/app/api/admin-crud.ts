import { env } from "cloudflare:workers";
import { verifySession } from "./auth";
import { invalidateCache } from "@/lib/cache";
import type { User, MusicianProfile } from "@/db/types";

async function checkAdminAuth(request: Request): Promise<Response | null> {
  const user = await verifySession(request, 'admin');
  if (!user || user.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export async function handleEventsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
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
      await env.DB.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
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
    console.error("Events API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleVideosApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
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
      const videos = await env.DB.prepare("SELECT * FROM videos ORDER BY publication_date DESC, created_at DESC").all();
      return new Response(JSON.stringify(videos.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = await request.json();
      const result = await env.DB.prepare(
        "INSERT INTO videos (title, youtube_id, thumbnail, is_short, publication_date) VALUES (?, ?, ?, ?, ?)"
      ).bind(data.title, data.youtube_id, data.thumbnail || null, data.is_short || 0, data.publication_date || null).run();
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
      const data = await request.json();
      await env.DB.prepare(
        "UPDATE videos SET title = ?, youtube_id = ?, thumbnail = ?, is_short = ?, publication_date = ? WHERE id = ?"
      ).bind(data.title, data.youtube_id, data.thumbnail || null, data.is_short || 0, data.publication_date || null, id).run();
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
    console.error("Videos API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handlePublicationsApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
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
      const data = await request.json();
      await env.DB.prepare(
        "UPDATE publications SET instagram_post_id = ? WHERE id = ?"
      ).bind(data.instagram_post_id, id).run();
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
      await env.DB.prepare("DELETE FROM publications WHERE id = ?").bind(id).run();
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
    console.error("Publications API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleGuestbookApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
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
      const data = await request.json();
      await env.DB.prepare(
        "UPDATE guestbook SET first_name = ?, last_name = ?, message = ?, date = ? WHERE id = ?"
      ).bind(data.first_name, data.last_name, data.message, data.date, id).run();
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
      await env.DB.prepare("DELETE FROM guestbook WHERE id = ?").bind(id).run();
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
    console.error("Guestbook API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleContactApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
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

interface UserInstrument {
  instrument_name: string;
  start_date?: string;
  level?: string;
}

interface UserWithProfile {
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  date_of_birth?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string;
  postal_code?: string;
  city?: string;
  harmonie_start_date?: string;
  is_conservatory_student?: number;
  music_theory_level?: string;
  emergency_contact_last_name?: string;
  emergency_contact_first_name?: string;
  emergency_contact_email?: string;
  emergency_contact_phone?: string;
  instruments?: UserInstrument[];
}

export async function handleUsersApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return authError;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (id) {
        const user = await env.DB.prepare(`
          SELECT u.*, p.first_name, p.last_name, p.avatar, p.date_of_birth, p.phone,
                 p.address_line1, p.address_line2, p.postal_code, p.city,
                 p.harmonie_start_date, p.is_conservatory_student, p.music_theory_level,
                 p.emergency_contact_last_name, p.emergency_contact_first_name,
                 p.emergency_contact_email, p.emergency_contact_phone
          FROM users u
          LEFT JOIN musician_profiles p ON u.id = p.user_id
          WHERE u.id = ?
        `).bind(id).first();

        const instruments = await env.DB.prepare(
          "SELECT instrument_name, start_date, level FROM musician_instruments WHERE user_id = ? ORDER BY sort_order ASC"
        ).bind(id).all();

        return new Response(JSON.stringify({
          ...user,
          instruments: instruments.results || []
        }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      const users = await env.DB.prepare(`
        SELECT u.*, p.first_name, p.last_name, p.avatar, p.date_of_birth, p.phone,
               p.address_line1, p.address_line2, p.postal_code, p.city,
               p.harmonie_start_date, p.is_conservatory_student, p.music_theory_level,
               p.emergency_contact_last_name, p.emergency_contact_first_name,
               p.emergency_contact_email, p.emergency_contact_phone
        FROM users u
        LEFT JOIN musician_profiles p ON u.id = p.user_id
        ORDER BY u.created_at DESC
      `).all();
      return new Response(JSON.stringify(users.results), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = await request.json() as UserWithProfile;
      
      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(data.email.toLowerCase().trim()).first();
      if (existing) {
        return new Response(JSON.stringify({ error: "Un utilisateur avec cet email existe déjà" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const result = await env.DB.prepare(
        "INSERT INTO users (email, role) VALUES (?, ?)"
      ).bind(data.email.toLowerCase().trim(), data.role || 'MUSICIAN').run();

      const userId = result.meta.last_row_id;

      await env.DB.prepare(`
        INSERT INTO musician_profiles (user_id, first_name, last_name, avatar, date_of_birth, phone,
          address_line1, address_line2, postal_code, city,
          harmonie_start_date, is_conservatory_student, music_theory_level,
          emergency_contact_last_name, emergency_contact_first_name, emergency_contact_email, emergency_contact_phone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        data.first_name || null,
        data.last_name || null,
        data.avatar || null,
        data.date_of_birth || null,
        data.phone || null,
        data.address_line1 || null,
        data.address_line2 || null,
        data.postal_code || null,
        data.city || null,
        data.harmonie_start_date || null,
        data.is_conservatory_student ? 1 : 0,
        data.music_theory_level || null,
        data.emergency_contact_last_name || null,
        data.emergency_contact_first_name || null,
        data.emergency_contact_email || null,
        data.emergency_contact_phone || null
      ).run();

      if (data.instruments) {
        for (let i = 0; i < data.instruments.length; i++) {
          const inst = data.instruments[i];
          if (inst.instrument_name?.trim()) {
            await env.DB.prepare(`
              INSERT INTO musician_instruments (user_id, instrument_name, start_date, level, sort_order)
              VALUES (?, ?, ?, ?, ?)
            `).bind(
              userId,
              inst.instrument_name.trim(),
              inst.start_date || null,
              inst.level || null,
              i
            ).run();
          }
        }
      }

      return new Response(JSON.stringify({ success: true, id: userId }), {
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
      const data = await request.json() as UserWithProfile;
      
      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ? AND id != ?")
        .bind(data.email.toLowerCase().trim(), id).first();
      if (existing) {
        return new Response(JSON.stringify({ error: "Un autre utilisateur avec cet email existe déjà" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await env.DB.prepare(
        "UPDATE users SET email = ?, role = ? WHERE id = ?"
      ).bind(data.email.toLowerCase().trim(), data.role, id).run();

      const existingProfile = await env.DB.prepare("SELECT id FROM musician_profiles WHERE user_id = ?").bind(id).first();
      if (existingProfile) {
        await env.DB.prepare(`
          UPDATE musician_profiles 
          SET first_name = ?, last_name = ?, avatar = ?, date_of_birth = ?, phone = ?,
              address_line1 = ?, address_line2 = ?, postal_code = ?, city = ?,
              harmonie_start_date = ?, is_conservatory_student = ?, music_theory_level = ?,
              emergency_contact_last_name = ?, emergency_contact_first_name = ?,
              emergency_contact_email = ?, emergency_contact_phone = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).bind(
          data.first_name || null,
          data.last_name || null,
          data.avatar || null,
          data.date_of_birth || null,
          data.phone || null,
          data.address_line1 || null,
          data.address_line2 || null,
          data.postal_code || null,
          data.city || null,
          data.harmonie_start_date || null,
          data.is_conservatory_student ? 1 : 0,
          data.music_theory_level || null,
          data.emergency_contact_last_name || null,
          data.emergency_contact_first_name || null,
          data.emergency_contact_email || null,
          data.emergency_contact_phone || null,
          id
        ).run();
      } else {
        await env.DB.prepare(`
          INSERT INTO musician_profiles (user_id, first_name, last_name, avatar, date_of_birth, phone,
            address_line1, address_line2, postal_code, city,
            harmonie_start_date, is_conservatory_student, music_theory_level,
            emergency_contact_last_name, emergency_contact_first_name, emergency_contact_email, emergency_contact_phone)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          id,
          data.first_name || null,
          data.last_name || null,
          data.avatar || null,
          data.date_of_birth || null,
          data.phone || null,
          data.address_line1 || null,
          data.address_line2 || null,
          data.postal_code || null,
          data.city || null,
          data.harmonie_start_date || null,
          data.is_conservatory_student ? 1 : 0,
          data.music_theory_level || null,
          data.emergency_contact_last_name || null,
          data.emergency_contact_first_name || null,
          data.emergency_contact_email || null,
          data.emergency_contact_phone || null
        ).run();
      }

      await env.DB.prepare("DELETE FROM musician_instruments WHERE user_id = ?").bind(id).run();
      if (data.instruments) {
        for (let i = 0; i < data.instruments.length; i++) {
          const inst = data.instruments[i];
          if (inst.instrument_name?.trim()) {
            await env.DB.prepare(`
              INSERT INTO musician_instruments (user_id, instrument_name, start_date, level, sort_order)
              VALUES (?, ?, ?, ?, ?)
            `).bind(
              id,
              inst.instrument_name.trim(),
              inst.start_date || null,
              inst.level || null,
              i
            ).run();
          }
        }
      }

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
      
      await env.DB.prepare("DELETE FROM musician_instruments WHERE user_id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM musician_profiles WHERE user_id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id).run();
      await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Users API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
