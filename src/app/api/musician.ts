import { env } from "cloudflare:workers";
import { verifySession } from "./auth";
import type {
  MusicianProfile,
  MusicianInstrument,
  IdeaCategory,
  InsuranceInstrument,
  IdeaWithLikes,
  PlanningEvent,
  PlanningAvailability,
} from "@/db/types";

import { logger } from "@/lib/logger";

// ── Google Sheets sync ──────────────────────────────────────────────

interface ParsedSheetEvent {
  name: string;
  date: string;
  time: string | null;
  location: string | null;
  address: string | null;
}

interface ParsedSheetResponse {
  name: string;
  columns: Map<number, string>; // CSV column index → "oui" | "non" | "peut-etre"
}

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/17UAV3DKOReGBluVfPCSybkAj1OxObkC9fUiSsljZOac/export?format=csv";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const FRENCH_MONTHS: Record<string, number> = {
  janvier: 0, février: 0, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
  fevrier: 1, aout: 7,
};

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseSheetDate(dateStr: string): string | null {
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // First, try with a week day prefix and year: "dimanche 7 juin 2026"
  let match = trimmed.match(
    /[a-zéû]+\s+(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i
  );
  if (match) {
    const day = parseInt(match[1]);
    const month = FRENCH_MONTHS[match[2].toLowerCase()];
    const year = parseInt(match[3]);
    if (month !== undefined) {
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Try: "dimanche 7 juin" (week day, no year)
  match = trimmed.match(/[a-zéû]+\s+(\d{1,2})\s+([a-zéû]+)/i);
  if (match) {
    const day = parseInt(match[1]);
    const month = FRENCH_MONTHS[match[2].toLowerCase()];
    if (month !== undefined) {
      const now = new Date();
      const currentYear = now.getFullYear();
      let date = new Date(currentYear, month, day);
      if (date < now) {
        date = new Date(currentYear + 1, month, day);
      }
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
  }

  // Try: "7 juin 2026" (no week day, with year)
  match = trimmed.match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i);
  if (match) {
    const day = parseInt(match[1]);
    const month = FRENCH_MONTHS[match[2].toLowerCase()];
    const year = parseInt(match[3]);
    if (month !== undefined) {
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Try: "7 juin" (no week day, no year)
  match = trimmed.match(/(\d{1,2})\s+([a-zéû]+)/i);
  if (match) {
    const day = parseInt(match[1]);
    const month = FRENCH_MONTHS[match[2].toLowerCase()];
    if (month !== undefined) {
      const now = new Date();
      const currentYear = now.getFullYear();
      let date = new Date(currentYear, month, day);
      if (date < now) {
        date = new Date(currentYear + 1, month, day);
      }
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }
  }

  return null;
}

async function parseGoogleSheet(): Promise<{
  eventsByCol: Map<number, ParsedSheetEvent>;
  responses: ParsedSheetResponse[];
}> {
  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) return { eventsByCol: new Map(), responses: [] };

    const csvText = await res.text();
    const lines = csvText.split("\n").filter((l) => l.trim());

    if (lines.length < 6) return { eventsByCol: new Map(), responses: [] };

    const nameRow = parseCSVLine(lines[0]);
    const dateRow = parseCSVLine(lines[1]);
    const timeRow = parseCSVLine(lines[2]);
    const locationRow = parseCSVLine(lines[3]);
    const addressRow = parseCSVLine(lines[4]);

    const maxCols = Math.max(dateRow.length, nameRow.length);
    const eventsByCol = new Map<number, ParsedSheetEvent>();

    for (let i = 1; i < maxCols; i++) {
      const dateStr = dateRow[i]?.trim();
      if (!dateStr) continue;

      const parsedDate = parseSheetDate(dateStr);
      if (!parsedDate) continue;

      eventsByCol.set(i, {
        name: nameRow[i]?.trim() || `Événement du ${dateStr}`,
        date: parsedDate,
        time: timeRow[i]?.trim() || null,
        location: locationRow[i]?.trim() || null,
        address: addressRow[i]?.trim() || null,
      });
    }

    const responses: ParsedSheetResponse[] = [];
    for (let r = 5; r < lines.length; r++) {
      const cells = parseCSVLine(lines[r]);
      const name = cells[0]?.trim();
      if (!name) continue;

      // Skip summary rows (e.g. "15 Oui", "7 Non", percentages)
      if (/^\d+/.test(name) || /%/.test(name)) continue;

      const columns = new Map<number, string>();
      for (let i = 1; i < cells.length; i++) {
        const cell = cells[i]?.trim().toLowerCase();
        if (!cell) continue;
        if (cell === "oui") columns.set(i, "oui");
        else if (cell === "non") columns.set(i, "non");
        else if (cell.startsWith("peut")) columns.set(i, "peut-etre");
      }
      responses.push({ name, columns });
    }

    return { eventsByCol, responses };
  } catch {
    return { eventsByCol: new Map(), responses: [] };
  }
}

async function importFromGoogleSheet(): Promise<number> {
  const { eventsByCol, responses } = await parseGoogleSheet();
  if (eventsByCol.size === 0) return 0;

  // Insert events (one by one to avoid duplicates)
  let imported = 0;
  for (const e of eventsByCol.values()) {
    const existing = await env.DB.prepare(
      "SELECT id FROM planning_events WHERE name = ? AND date = ?"
    )
      .bind(e.name, e.date)
      .first<{ id: number }>();
    if (!existing) {
      await env.DB.prepare(
        "INSERT INTO planning_events (name, date, time, location, address) VALUES (?, ?, ?, ?, ?)"
      )
        .bind(e.name, e.date, e.time, e.location, e.address)
        .run();
      imported++;
    }
  }

  // Get all event IDs for mapping
  const allEvents = await env.DB.prepare(
    "SELECT id, name, date FROM planning_events"
  ).all<{ id: number; name: string; date: string }>();
  const eventMap = new Map<string, number>();
  for (const ev of allEvents.results || []) {
    eventMap.set(`${ev.name}|${ev.date}`, ev.id);
  }

  // Get musician profiles for name matching
  const profiles = await env.DB.prepare(
    `SELECT mp.user_id, mp.first_name, mp.last_name
     FROM musician_profiles mp
     JOIN users u ON u.id = mp.user_id
     WHERE u.role = 'MUSICIAN' AND u.is_active = 1`
  ).all<{ user_id: number; first_name: string | null; last_name: string | null }>();

  const profileList = profiles.results || [];

  // Match musicians and insert availability
  for (const resp of responses) {
    const nameNormalized = normalizeName(resp.name);
    let matchedUserId: number | null = null;

    for (const profile of profileList) {
      const fullName = normalizeName(
        `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
      );
      if (fullName && nameNormalized.includes(fullName)) {
        matchedUserId = profile.user_id;
        break;
      }
    }

    if (!matchedUserId) continue;

    for (const [colIdx, status] of resp.columns) {
      const sheetEvent = eventsByCol.get(colIdx);
      if (!sheetEvent) continue;

      const eventId = eventMap.get(`${sheetEvent.name}|${sheetEvent.date}`);
      if (!eventId) continue;

      await env.DB.prepare(
        `INSERT INTO planning_availability (planning_event_id, user_id, status)
         VALUES (?, ?, ?)
         ON CONFLICT(planning_event_id, user_id) DO UPDATE SET status = ?, updated_at = datetime('now')`
      )
        .bind(eventId, matchedUserId, status, status)
        .run();
    }
  }

  return imported;
}
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

      // For fresh profiles (never saved by musician), don't pre-select boolean choices
      const isFreshProfile = !profile.first_name;

      return new Response(
        JSON.stringify({
          ...profile,
          is_conservatory_student: isFreshProfile ? null : profile.is_conservatory_student,
          image_consent: isFreshProfile ? null : profile.image_consent,
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
        // Count public ideas from other users that haven't been read
        const result = await env.DB.prepare(
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
          .first<{ count: number }>();

        return new Response(JSON.stringify({ count: result?.count || 0 }), {
          headers: { "Content-Type": "application/json" },
        });
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
    const profile = await env.DB.prepare(
      "SELECT first_name, last_name FROM musician_profiles WHERE user_id = ?"
    )
      .bind(user.id)
      .first<{ first_name: string | null; last_name: string | null }>();

    const sheetUrl =
      "https://docs.google.com/spreadsheets/d/17UAV3DKOReGBluVfPCSybkAj1OxObkC9fUiSsljZOac/export?format=csv";
    const response = await fetch(sheetUrl, { cf: { cacheTtl: 300 } });

    if (!response.ok) {
      return new Response(JSON.stringify({ urgent: false, nextEvent: null }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const csvText = await response.text();
    const lines = csvText.split("\n");

    if (lines.length < 3) {
      return new Response(JSON.stringify({ urgent: false, nextEvent: null }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headerRow = parseLine(lines[0]);
    const dateRow = parseLine(lines[1]);
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const months: Record<string, number> = {
      janvier: 0,
      fevrier: 1,
      mars: 2,
      avril: 3,
      mai: 4,
      juin: 5,
      juillet: 6,
      aout: 7,
      septembre: 8,
      octobre: 9,
      novembre: 10,
      decembre: 11,
      février: 1,
      août: 7,
    };

    interface SheetEvent {
      title: string;
      date: string;
      eventDate: Date;
    }

    const events: SheetEvent[] = [];
    for (let i = 1; i < dateRow.length; i++) {
      const dateStr = dateRow[i];
      if (!dateStr) continue;

      const dateMatch = dateStr.match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i);
      if (!dateMatch) continue;

      const day = parseInt(dateMatch[1]);
      const month = months[dateMatch[2].toLowerCase()];
      const year = parseInt(dateMatch[3]);

      if (month === undefined) continue;

      const eventDate = new Date(year, month, day);

      if (eventDate >= now) {
        const title = headerRow[i]?.trim() || `Événement du ${dateStr}`;
        events.push({
          title,
          date: eventDate.toISOString().split("T")[0],
          eventDate,
        });
      }
    }

    events.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
    const nextEvent = events[0] || null;

    let hasUrgentEvent = false;

    if (profile?.first_name && profile?.last_name) {
      let musicianRow: string[] | null = null;
      for (const line of lines) {
        const cells = parseLine(line);
        if (
          cells[0]?.toLowerCase().includes(profile.first_name.toLowerCase()) &&
          cells[0]?.toLowerCase().includes(profile.last_name.toLowerCase())
        ) {
          musicianRow = cells;
          break;
        }
      }

      if (musicianRow) {
        for (let i = 1; i < dateRow.length && i < musicianRow.length; i++) {
          const dateStr = dateRow[i];
          const response = musicianRow[i]?.toLowerCase().trim();

          if (!dateStr) continue;

          const dateMatch = dateStr.match(/(\d{1,2})\s+([a-zéû]+)\s+(\d{4})/i);
          if (!dateMatch) continue;

          const day = parseInt(dateMatch[1]);
          const month = months[dateMatch[2].toLowerCase()];
          const year = parseInt(dateMatch[3]);

          if (month === undefined) continue;

          const eventDate = new Date(year, month, day);

          if (eventDate >= now && eventDate <= thirtyDaysLater) {
            if (!response || response === "" || response.includes("peut")) {
              hasUrgentEvent = true;
              break;
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        urgent: hasUrgentEvent,
        nextEvent: nextEvent
          ? { title: nextEvent.title, date: nextEvent.date }
          : null,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    logger.error("Planning check API error:", error);
    return new Response(JSON.stringify({ urgent: false, nextEvent: null }), {
      headers: { "Content-Type": "application/json" },
    });
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

export async function handleMusicianAvailabilityApi(request: Request): Promise<Response> {
  const user = await verifySession(request, "musician");
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (request.method === "GET") {
      // Auto-import from Google Sheets if no events exist
      const countRes = await env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM planning_events"
      ).first<{ cnt: number }>();
      if (!countRes || countRes.cnt === 0) {
        await importFromGoogleSheet();
      }

      const events = await env.DB.prepare(
        "SELECT * FROM planning_events ORDER BY date ASC, sort_order ASC"
      ).all<PlanningEvent>();

      const musicians = await env.DB.prepare(
        `
        SELECT u.id as user_id, mp.first_name, mp.last_name,
          COALESCE(hi.instrument_name, '') as instrument
        FROM users u
        JOIN musician_profiles mp ON mp.user_id = u.id
        LEFT JOIN (
          SELECT user_id, GROUP_CONCAT(instrument_name, ', ') as instrument_name
          FROM harmonie_instruments
          GROUP BY user_id
        ) hi ON hi.user_id = u.id
        WHERE u.role = 'MUSICIAN' AND u.is_active = 1
        ORDER BY mp.last_name ASC, mp.first_name ASC
        `
      ).all<{
        user_id: number;
        first_name: string | null;
        last_name: string | null;
        instrument: string;
      }>();

      const availabilityRecords = await env.DB.prepare(
        "SELECT * FROM planning_availability"
      ).all<PlanningAvailability>();

      // Build availabilities map: userId → { eventId → status }
      const availMap = new Map<number, Record<string, string>>();
      for (const record of availabilityRecords.results || []) {
        let map = availMap.get(record.user_id);
        if (!map) {
          map = {};
          availMap.set(record.user_id, map);
        }
        map[String(record.planning_event_id)] = record.status;
      }

      const rows = (musicians.results || []).map((m) => ({
        userId: m.user_id,
        firstName: m.first_name || "",
        lastName: m.last_name || "",
        instrument: m.instrument,
        availabilities: availMap.get(m.user_id) || {},
      }));

      return new Response(
        JSON.stringify({
          events: events.results || [],
          rows,
          currentUserId: user.id,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (request.method === "PUT") {
      const data = (await request.json()) as {
        eventId?: number;
        status?: "oui" | "non" | null;
      };

      if (data.eventId === undefined || data.eventId === null) {
        return new Response(JSON.stringify({ error: "eventId est requis" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const validStatuses = ["oui", "non"];
      if (data.status !== null && !validStatuses.includes(data.status as string)) {
        return new Response(
          JSON.stringify({ error: "Status invalide. Utilisez oui ou non" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      if (data.status === null) {
        await env.DB.prepare(
          "DELETE FROM planning_availability WHERE planning_event_id = ? AND user_id = ?"
        )
          .bind(data.eventId, user.id)
          .run();
      } else {
        await env.DB.prepare(
          `INSERT INTO planning_availability (planning_event_id, user_id, status)
           VALUES (?, ?, ?)
           ON CONFLICT(planning_event_id, user_id) DO UPDATE SET status = ?, updated_at = datetime('now')`
        )
          .bind(data.eventId, user.id, data.status, data.status)
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
    logger.error("Musician availability API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
