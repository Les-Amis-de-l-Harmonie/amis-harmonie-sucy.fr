import { env } from "cloudflare:workers";
import { verifySession } from "./auth";
import type {
  MusicianProfile,
  MusicianInstrument,
  IdeaCategory,
  InsuranceInstrument,
  IdeaPreview,
  IdeaWithLikes,
} from "@/db/types";

import { logger } from "@/lib/logger";
import { resolvePrimaryFromRows, validateHarmonieInstruments } from "@/lib/instruments";

interface ProfileWithInstruments extends MusicianProfile {
  instruments: MusicianInstrument[];
  harmonieInstruments: string[];
  primaryHarmonieInstrument?: string | null;
  email: string;
  insuranceInstruments: InsuranceInstrument[];
  insurance_complete: boolean;
}

interface IdeaInput {
  title: string;
  description: string;
  category: IdeaCategory;
  is_public: boolean;
}

interface HarmonieInstrumentRow {
  instrument_name: string;
  is_primary: number;
}

export async function handleMusicianProfileApi(request: Request): Promise<Response> {
  const user = await verifySession(request, "musician");
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (request.method === "GET") {
      let profile = await env.DB.prepare("SELECT * FROM musician_profiles WHERE user_id = ?")
        .bind(user.id)
        .first<MusicianProfile>();

      if (!profile) {
        await env.DB.prepare("INSERT INTO musician_profiles (user_id) VALUES (?)")
          .bind(user.id)
          .run();

        profile = { user_id: user.id } as MusicianProfile;
      }

      const userData = await env.DB.prepare("SELECT email FROM users WHERE id = ?")
        .bind(user.id)
        .first<{ email: string }>();

      const instruments = await env.DB.prepare(
        "SELECT * FROM musician_instruments WHERE user_id = ? ORDER BY sort_order ASC"
      )
        .bind(user.id)
        .all<MusicianInstrument>();

      const harmonieInstruments = await env.DB.prepare(
        "SELECT instrument_name, is_primary FROM harmonie_instruments WHERE user_id = ? ORDER BY instrument_name ASC"
      )
        .bind(user.id)
        .all<HarmonieInstrumentRow>();
      const harmonieInstrumentRows = harmonieInstruments.results || [];

      const insuranceInstruments = await env.DB.prepare(
        "SELECT * FROM insurance_instruments WHERE user_id = ? ORDER BY id ASC"
      )
        .bind(user.id)
        .all<InsuranceInstrument>();

      const insuranceInstrumentsList = insuranceInstruments.results || [];
      const insurance_complete =
        insuranceInstrumentsList.length > 0 &&
        insuranceInstrumentsList.every(
          (i) => i.instrument_name?.trim() && i.brand?.trim() && i.serial_number?.trim()
        );

      // For fresh profiles (never saved by musician), don't pre-select boolean choices
      const isFreshProfile = !profile.first_name;

      return new Response(
        JSON.stringify({
          ...profile,
          is_conservatory_student: isFreshProfile ? null : profile.is_conservatory_student,
          image_consent: isFreshProfile ? null : profile.image_consent,
          email: userData?.email || "",
          instruments: instruments.results || [],
          harmonieInstruments: harmonieInstrumentRows.map((i) => i.instrument_name),
          primaryHarmonieInstrument: resolvePrimaryFromRows(harmonieInstrumentRows),
          insuranceInstruments: insuranceInstrumentsList,
          insurance_complete,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (request.method === "PUT") {
      const data = (await request.json()) as Partial<ProfileWithInstruments>;
      const harmonieData = validateHarmonieInstruments(
        data.harmonieInstruments,
        data.primaryHarmonieInstrument
      );
      if (typeof harmonieData === "string") {
        return new Response(JSON.stringify({ error: harmonieData }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      await env.DB.prepare(
        `
        UPDATE musician_profiles 
        SET first_name = ?, last_name = ?, date_of_birth = ?, phone = ?,
            address_line1 = ?, address_line2 = ?, postal_code = ?, city = ?,
            harmonie_start_date = ?, is_conservatory_student = ?, music_theory_level = ?,
            emergency_contact_last_name = ?, emergency_contact_first_name = ?,
            emergency_contact_email = ?, emergency_contact_phone = ?, image_consent = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `
      )
        .bind(
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
          data.image_consent ? 1 : 0,
          user.id
        )
        .run();

      // Save harmonie instruments
      if (harmonieData !== null) {
        await env.DB.prepare("DELETE FROM harmonie_instruments WHERE user_id = ?")
          .bind(user.id)
          .run();

        for (const instrumentName of harmonieData.instruments) {
          await env.DB.prepare(
            `
            INSERT INTO harmonie_instruments (user_id, instrument_name, is_primary)
            VALUES (?, ?, ?)
          `
          )
            .bind(user.id, instrumentName, instrumentName === harmonieData.primary ? 1 : 0)
            .run();
        }
      }

      // Save musician instruments (pratique instrumentale)
      if (data.instruments !== undefined) {
        await env.DB.prepare("DELETE FROM musician_instruments WHERE user_id = ?")
          .bind(user.id)
          .run();

        for (let i = 0; i < data.instruments.length; i++) {
          const instr = data.instruments[i];
          if (instr.instrument_name?.trim()) {
            await env.DB.prepare(
              `
              INSERT INTO musician_instruments (user_id, instrument_name, start_date, level, sort_order)
              VALUES (?, ?, ?, ?, ?)
            `
            )
              .bind(
                user.id,
                instr.instrument_name.trim(),
                instr.start_date || null,
                instr.level || null,
                i
              )
              .run();
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
    logger.error("Musician profile API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleMusicianAvatarApi(request: Request): Promise<Response> {
  const user = await verifySession(request, "musician");
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
    )
      .bind(avatarUrl, user.id)
      .run();

    return new Response(JSON.stringify({ success: true, url: avatarUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Avatar upload error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleMusicianIdeasApi(request: Request): Promise<Response> {
  const user = await verifySession(request, "musician");
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const count = url.searchParams.get("count");
      if (count === "unread") {
        // Le compteur répond à « combien de nouveautés des autres ai-je à lire ? ».
        // L'aperçu est celui du mur public : il inclut donc aussi mes idées publiques,
        // comme la vue `public`, afin que l'accueil et la page cible restent cohérents.
        const [countResult, recentResult] = await Promise.all([
          env.DB.prepare(
            `
            SELECT COUNT(*) as count
            FROM ideas i
            WHERE i.is_public = 1
            AND i.user_id != ?
            AND NOT EXISTS (
              SELECT 1 FROM idea_reads r
              WHERE r.idea_id = i.id AND r.user_id = ?
            )
            `
          )
            .bind(user.id, user.id)
            .first<{ count: number }>(),
          env.DB.prepare(
            `
            SELECT
              i.id,
              i.title,
              i.description,
              i.category,
              i.created_at,
              p.first_name as author_first_name,
              (SELECT COUNT(*) FROM idea_likes WHERE idea_id = i.id) as likes_count
            FROM ideas i
            LEFT JOIN musician_profiles p ON i.user_id = p.user_id
            WHERE i.is_public = 1
            ORDER BY i.created_at DESC, i.id DESC
            LIMIT 5
            `
          ).all<IdeaPreview>(),
        ]);

        return new Response(
          JSON.stringify({ count: countResult?.count || 0, recent: recentResult.results || [] }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const view = url.searchParams.get("view");

      if (view === "public") {
        // Get all public ideas with likes count and author info
        const ideas = await env.DB.prepare(
          `
          SELECT 
            i.*,
            p.first_name as author_first_name,
            p.last_name as author_last_name,
            (SELECT COUNT(*) FROM idea_likes WHERE idea_id = i.id) as likes_count,
            (SELECT COUNT(*) FROM idea_likes WHERE idea_id = i.id AND user_id = ?) as user_has_liked,
            (SELECT json_group_array(json_object('first_name', mp.first_name, 'last_name', mp.last_name))
             FROM idea_likes il
             JOIN musician_profiles mp ON il.user_id = mp.user_id
             WHERE il.idea_id = i.id) as likers_json
          FROM ideas i
          LEFT JOIN musician_profiles p ON i.user_id = p.user_id
          WHERE i.is_public = 1
          ORDER BY i.created_at DESC
          `
        )
          .bind(user.id)
          .all<IdeaWithLikes>();

        // Mark all returned ideas as read for this user
        const ideaIds = ideas.results?.map((idea) => idea.id) || [];
        if (ideaIds.length > 0) {
          for (const ideaId of ideaIds) {
            await env.DB.prepare(
              "INSERT OR IGNORE INTO idea_reads (idea_id, user_id) VALUES (?, ?)"
            )
              .bind(ideaId, user.id)
              .run();
          }
        }

        const ideasWithLikers = (ideas.results || []).map((idea) => {
          const ideaWithLikers = { ...idea };
          if ((idea as unknown as Record<string, string>).likers_json) {
            try {
              const likers = JSON.parse(
                (idea as unknown as Record<string, string>).likers_json
              ) as Array<{ first_name: string | null; last_name: string | null }>;
              ideaWithLikers.likers = Array.isArray(likers) ? likers : [];
            } catch {
              ideaWithLikers.likers = [];
            }
            delete (ideaWithLikers as unknown as Record<string, string>).likers_json;
          }
          return ideaWithLikers;
        });

        return new Response(JSON.stringify(ideasWithLikers), {
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // Get user's own ideas (both public and private)
        const ideas = await env.DB.prepare(
          `
          SELECT 
            i.*,
            (SELECT COUNT(*) FROM idea_likes WHERE idea_id = i.id) as likes_count,
            (SELECT COUNT(*) FROM idea_likes WHERE idea_id = i.id AND user_id = ?) as user_has_liked
          FROM ideas i
          WHERE i.user_id = ?
          ORDER BY i.created_at DESC
          `
        )
          .bind(user.id, user.id)
          .all<IdeaWithLikes>();

        return new Response(JSON.stringify(ideas.results || []), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (request.method === "POST") {
      const data = (await request.json()) as IdeaInput;

      if (!data.title?.trim()) {
        return new Response(JSON.stringify({ error: "Le titre est obligatoire" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!data.description?.trim()) {
        return new Response(JSON.stringify({ error: "La description est obligatoire" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (!data.category) {
        return new Response(JSON.stringify({ error: "La catégorie est obligatoire" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const validCategories: IdeaCategory[] = ["association", "harmonie", "website"];
      if (!validCategories.includes(data.category)) {
        return new Response(JSON.stringify({ error: "Catégorie invalide" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isPublic = data.is_public ? 1 : 0;

      const result = await env.DB.prepare(
        "INSERT INTO ideas (user_id, title, description, category, is_public) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(user.id, data.title.trim(), data.description.trim(), data.category, isPublic)
        .run();

      return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Like/unlike an idea
    if (request.method === "PUT") {
      const url = new URL(request.url);
      const ideaId = url.searchParams.get("id");
      const action = url.searchParams.get("action");

      if (!ideaId) {
        return new Response(JSON.stringify({ error: "ID manquant" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (action === "like") {
        // Check if idea is public
        const idea = await env.DB.prepare("SELECT is_public FROM ideas WHERE id = ?")
          .bind(ideaId)
          .first<{ is_public: number }>();

        if (!idea) {
          return new Response(JSON.stringify({ error: "Idée non trouvée" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (idea.is_public !== 1) {
          return new Response(JSON.stringify({ error: "Cette idée n'est pas publique" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Add like (ignore if already exists)
        await env.DB.prepare("INSERT OR IGNORE INTO idea_likes (idea_id, user_id) VALUES (?, ?)")
          .bind(ideaId, user.id)
          .run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      if (action === "unlike") {
        await env.DB.prepare("DELETE FROM idea_likes WHERE idea_id = ? AND user_id = ?")
          .bind(ideaId, user.id)
          .run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Action invalide" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // DELETE - Delete user's own idea
    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const ideaId = url.searchParams.get("id");

      if (!ideaId) {
        return new Response(JSON.stringify({ error: "ID manquant" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Check ownership
      const idea = await env.DB.prepare("SELECT user_id FROM ideas WHERE id = ?")
        .bind(ideaId)
        .first<{ user_id: number }>();

      if (!idea) {
        return new Response(JSON.stringify({ error: "Idée non trouvée" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (idea.user_id !== user.id) {
        return new Response(
          JSON.stringify({ error: "Vous ne pouvez supprimer que vos propres idées" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Delete idea (cascade will handle likes and reads)
      await env.DB.prepare("DELETE FROM ideas WHERE id = ?").bind(ideaId).run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Musician ideas API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleMusicianInsuranceApi(request: Request): Promise<Response> {
  const user = await verifySession(request, "musician");
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (request.method === "GET") {
      const instruments = await env.DB.prepare(
        "SELECT * FROM insurance_instruments WHERE user_id = ? ORDER BY id ASC"
      )
        .bind(user.id)
        .all<InsuranceInstrument>();

      return new Response(JSON.stringify(instruments.results || []), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "PUT") {
      const data = (await request.json()) as {
        instruments: Array<{
          id?: number;
          instrument_name: string;
          brand: string;
          model: string;
          serial_number: string;
        }>;
      };

      if (!data.instruments || data.instruments.length === 0) {
        return new Response(JSON.stringify({ error: "Au moins un instrument est requis" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (data.instruments.length > 2) {
        return new Response(JSON.stringify({ error: "Maximum 2 instruments autorisés" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      for (const instr of data.instruments) {
        if (!instr.instrument_name?.trim()) {
          return new Response(JSON.stringify({ error: "Le nom de l'instrument est obligatoire" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!instr.brand?.trim()) {
          return new Response(JSON.stringify({ error: "La marque est obligatoire" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!instr.model?.trim()) {
          return new Response(JSON.stringify({ error: "Le modèle est obligatoire" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (!instr.serial_number?.trim()) {
          return new Response(JSON.stringify({ error: "Le numéro de série est obligatoire" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      }

      await env.DB.prepare("DELETE FROM insurance_instruments WHERE user_id = ?")
        .bind(user.id)
        .run();

      for (const instr of data.instruments) {
        await env.DB.prepare(
          "INSERT INTO insurance_instruments (user_id, instrument_name, brand, model, serial_number) VALUES (?, ?, ?, ?, ?)"
        )
          .bind(
            user.id,
            instr.instrument_name.trim(),
            instr.brand.trim(),
            instr.model.trim(),
            instr.serial_number.trim()
          )
          .run();
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
    logger.error("Musician insurance API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleMusicianBirthdaysApi(request: Request): Promise<Response> {
  const user = await verifySession(request, "musician");
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");

    const results = await env.DB.prepare(
      `
      SELECT p.first_name, p.last_name, p.date_of_birth, p.avatar
      FROM musician_profiles p
      JOIN users u ON p.user_id = u.id
      WHERE u.is_active = 1
        AND u.role = 'MUSICIAN'
        AND p.date_of_birth IS NOT NULL
        AND substr(p.date_of_birth, 6, 2) = ?
      ORDER BY CAST(substr(p.date_of_birth, 9, 2) AS INTEGER) ASC
      `
    )
      .bind(month)
      .all<{
        first_name: string | null;
        last_name: string | null;
        date_of_birth: string;
        avatar: string | null;
      }>();

    const seen = new Set<string>();
    const uniqueBirthdays = (results.results || []).filter((b) => {
      const key = `${b.first_name || ""}|${b.last_name || ""}|${b.date_of_birth}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return new Response(JSON.stringify(uniqueBirthdays), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Musician birthdays API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleMusicianPlanningCheckApi(request: Request): Promise<Response> {
  const user = await verifySession(request, "musician");
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const [nextEvent, urgentEvent, pendingResult] = await Promise.all([
      env.DB.prepare(
        `SELECT title, date
         FROM events
         WHERE presence_required = 1 AND date >= date('now')
         ORDER BY date ASC
         LIMIT 1`
      ).first<{ title: string; date: string }>(),
      env.DB.prepare(
        `SELECT e.title, e.date
         FROM events e
         LEFT JOIN event_presences ep ON ep.event_id = e.id AND ep.user_id = ?
         -- L'urgence suit la date limite de réponse, pas la date de l'événement.
         WHERE e.presence_required = 1
           AND e.date >= date('now')
           AND ep.id IS NULL
           AND (
             (e.response_deadline IS NOT NULL AND e.response_deadline <= date('now', '+14 days'))
             OR (e.response_deadline IS NULL AND e.date <= date('now', '+30 days'))
           )
         ORDER BY CASE WHEN e.response_deadline IS NULL THEN e.date ELSE e.response_deadline END ASC,
                  e.date ASC
         LIMIT 1`
      )
        .bind(user.id)
        .first<{ title: string; date: string }>(),
      env.DB.prepare(
        `SELECT COUNT(*) as count
         FROM events e
         LEFT JOIN event_presences ep ON ep.event_id = e.id AND ep.user_id = ?
         WHERE e.presence_required = 1
           AND e.date >= date('now')
           AND ep.id IS NULL`
      )
        .bind(user.id)
        .first<{ count: number }>(),
    ]);

    return new Response(
      JSON.stringify({
        urgent: !!urgentEvent,
        nextEvent: nextEvent ? { title: nextEvent.title, date: nextEvent.date } : null,
        urgentEvent: urgentEvent ? { title: urgentEvent.title, date: urgentEvent.date } : null,
        pendingCount: pendingResult?.count ?? 0,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("Planning check API error:", error);
    return new Response(
      JSON.stringify({ urgent: false, nextEvent: null, urgentEvent: null, pendingCount: 0 }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleMusicianTrombinoscopeApi(request: Request): Promise<Response> {
  const user = await verifySession(request, "musician");
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const results = await env.DB.prepare(
      `
      SELECT
        u.id as user_id,
        mp.first_name,
        mp.last_name,
        mp.avatar,
        mp.harmonie_start_date,
        mp.image_consent,
        GROUP_CONCAT(hi.instrument_name, ', ') as instruments
      FROM users u
      INNER JOIN musician_profiles mp ON mp.user_id = u.id
      LEFT JOIN harmonie_instruments hi ON hi.user_id = u.id
      WHERE u.role = 'MUSICIAN' AND u.is_active = 1
      GROUP BY u.id
      ORDER BY mp.last_name ASC, mp.first_name ASC
      `
    ).all<{
      user_id: number;
      first_name: string | null;
      last_name: string | null;
      avatar: string | null;
      harmonie_start_date: string | null;
      image_consent: number | null;
      instruments: string | null;
    }>();

    const musicians = (results.results || []).map((m) => ({
      ...m,
      instruments: m.instruments ? m.instruments.split(", ") : [],
    }));

    return new Response(JSON.stringify({ musicians }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Trombinoscope API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
