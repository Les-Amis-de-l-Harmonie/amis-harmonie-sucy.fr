import { env } from "cloudflare:workers";
import { verifySession } from "./auth";
import type {
  MusicianProfile,
  MusicianInstrument,
  IdeaCategory,
  InsuranceInstrument,
  IdeaWithLikes,
} from "@/db/types";

interface ProfileWithInstruments extends MusicianProfile {
  instruments: MusicianInstrument[];
  harmonieInstruments: string[];
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
        "SELECT instrument_name FROM harmonie_instruments WHERE user_id = ? ORDER BY instrument_name ASC"
      )
        .bind(user.id)
        .all<{ instrument_name: string }>();

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

      return new Response(
        JSON.stringify({
          ...profile,
          email: userData?.email || "",
          instruments: instruments.results || [],
          harmonieInstruments: (harmonieInstruments.results || []).map((i) => i.instrument_name),
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
      if (data.harmonieInstruments !== undefined) {
        await env.DB.prepare("DELETE FROM harmonie_instruments WHERE user_id = ?")
          .bind(user.id)
          .run();

        for (const instrumentName of data.harmonieInstruments) {
          if (instrumentName?.trim()) {
            await env.DB.prepare(
              `
              INSERT INTO harmonie_instruments (user_id, instrument_name)
              VALUES (?, ?)
            `
            )
              .bind(user.id, instrumentName.trim())
              .run();
          }
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
    console.error("Musician profile API error:", error);
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
    console.error("Avatar upload error:", error);
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
            (SELECT COUNT(*) FROM idea_likes WHERE idea_id = i.id AND user_id = ?) as user_has_liked
          FROM ideas i
          LEFT JOIN musician_profiles p ON i.user_id = p.user_id
          WHERE i.is_public = 1
          ORDER BY i.created_at DESC
          `
        )
          .bind(user.id)
          .all<IdeaWithLikes>();

        return new Response(JSON.stringify(ideas.results || []), {
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

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Musician ideas API error:", error);
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
    console.error("Musician insurance API error:", error);
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

    return new Response(JSON.stringify(results.results || []), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Musician birthdays API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
