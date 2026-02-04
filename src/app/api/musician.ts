import { env } from "cloudflare:workers";
import { verifySession } from "./auth";
import type { MusicianProfile, MusicianInstrument } from "@/db/types";

interface ProfileWithInstruments extends MusicianProfile {
  instruments: MusicianInstrument[];
}

export async function handleMusicianProfileApi(request: Request): Promise<Response> {
  const user = await verifySession(request, 'musician');
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (request.method === "GET") {
      let profile = await env.DB.prepare(
        "SELECT * FROM musician_profiles WHERE user_id = ?"
      ).bind(user.id).first<MusicianProfile>();

      if (!profile) {
        await env.DB.prepare(
          "INSERT INTO musician_profiles (user_id) VALUES (?)"
        ).bind(user.id).run();
        
        profile = { user_id: user.id } as MusicianProfile;
      }

      const instruments = await env.DB.prepare(
        "SELECT * FROM musician_instruments WHERE user_id = ? ORDER BY sort_order ASC"
      ).bind(user.id).all<MusicianInstrument>();

      return new Response(JSON.stringify({
        ...profile,
        instruments: instruments.results || []
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "PUT") {
      const data = await request.json() as Partial<ProfileWithInstruments>;

      await env.DB.prepare(`
        UPDATE musician_profiles 
        SET first_name = ?, last_name = ?, date_of_birth = ?, phone = ?,
            address_line1 = ?, address_line2 = ?, postal_code = ?, city = ?,
            harmonie_start_date = ?, is_conservatory_student = ?, music_theory_level = ?,
            emergency_contact_last_name = ?, emergency_contact_first_name = ?,
            emergency_contact_email = ?, emergency_contact_phone = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(
        data.first_name || null,
        data.last_name || null,
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
        user.id
      ).run();

      if (data.instruments) {
        await env.DB.prepare("DELETE FROM musician_instruments WHERE user_id = ?").bind(user.id).run();
        
        for (let i = 0; i < data.instruments.length; i++) {
          const inst = data.instruments[i];
          if (inst.instrument_name?.trim()) {
            await env.DB.prepare(`
              INSERT INTO musician_instruments (user_id, instrument_name, start_date, level, sort_order)
              VALUES (?, ?, ?, ?, ?)
            `).bind(
              user.id,
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

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Musician profile API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleMusicianAvatarApi(request: Request): Promise<Response> {
  const user = await verifySession(request, 'musician');
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: "Invalid file type" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "File too large" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ext = file.type.split("/")[1];
    const filename = `avatars/${user.id}-${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    await env.R2.put(filename, arrayBuffer, {
      httpMetadata: { contentType: file.type },
    });

    const avatarUrl = `/images/r2/${filename}`;

    await env.DB.prepare(
      "UPDATE musician_profiles SET avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
    ).bind(avatarUrl, user.id).run();

    return new Response(JSON.stringify({ success: true, url: avatarUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
