import { env } from "cloudflare:workers";
import { verifySession } from "@/app/api/auth";
import { isAdmin, isSuperAdmin } from "@/db/types";
import { checkAdminAuth } from "@/app/api/admin-crud";

import { logger } from "@/lib/logger";
interface UserInstrument {
  instrument_name: string;
  start_date?: string | null;
  level?: string | null;
}

interface UserIdRow {
  id: number;
}

interface UserInstrumentRow {
  user_id: number;
  instrument_name: string;
  start_date: string | null;
  level: string | null;
}

interface HarmonieInstrumentRow {
  user_id: number;
  instrument_name: string;
}

export interface UserWithProfile {
  id: number;
  email: string;
  role: string;
  is_active?: number;
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
  image_consent?: number;
  adhesion_2026_2027?: number;
  instruments?: UserInstrument[];
  harmonieInstruments?: string[];
}

export async function handleUsersApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (request.method !== "GET") {
    const user = await verifySession(request, "admin");
    if (!user || !isAdmin(user.role)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST" && !isSuperAdmin(user.role)) {
      return new Response(JSON.stringify({ error: "Super admin required" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if ((request.method === "PUT" || request.method === "DELETE") && !isSuperAdmin(user.role)) {
      if (!id || parseInt(id, 10) !== user.id) {
        return new Response(
          JSON.stringify({ error: "Vous ne pouvez modifier que votre propre profil" }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }
  } else {
    const authError = await checkAdminAuth(request);
    if (authError) return authError;
  }

  try {
    if (request.method === "GET") {
      if (id) {
        const user = await env.DB.prepare(
          `
          SELECT u.*, p.first_name, p.last_name, p.avatar, p.date_of_birth, p.phone,
                 p.address_line1, p.address_line2, p.postal_code, p.city,
                 p.harmonie_start_date, p.is_conservatory_student, p.music_theory_level,
                 p.emergency_contact_last_name, p.emergency_contact_first_name,
                 p.emergency_contact_email, p.emergency_contact_phone, p.image_consent, p.adhesion_2026_2027
          FROM users u
          LEFT JOIN musician_profiles p ON u.id = p.user_id
          WHERE u.id = ?
        `
        )
          .bind(id)
          .first<UserWithProfile>();

        const instruments = await env.DB.prepare(
          "SELECT instrument_name, start_date, level FROM musician_instruments WHERE user_id = ? ORDER BY sort_order ASC"
        )
          .bind(id)
          .all<UserInstrument>();

        const harmonieInstruments = await env.DB.prepare(
          "SELECT instrument_name FROM harmonie_instruments WHERE user_id = ? ORDER BY instrument_name ASC"
        )
          .bind(id)
          .all<Pick<HarmonieInstrumentRow, "instrument_name">>();

        return new Response(
          JSON.stringify({
            ...user,
            instruments: instruments.results || [],
            harmonieInstruments: (harmonieInstruments.results || []).map((i) => i.instrument_name),
          }),
          {
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      const users = await env.DB.prepare(
        `
        SELECT u.*, p.first_name, p.last_name, p.avatar, p.date_of_birth, p.phone,
               p.address_line1, p.address_line2, p.postal_code, p.city,
               p.harmonie_start_date, p.is_conservatory_student, p.music_theory_level,
               p.emergency_contact_last_name, p.emergency_contact_first_name,
               p.emergency_contact_email, p.emergency_contact_phone, p.image_consent, p.adhesion_2026_2027
        FROM users u
        LEFT JOIN musician_profiles p ON u.id = p.user_id
        ORDER BY u.created_at DESC
      `
      ).all<UserWithProfile>();

      const allInstruments = await env.DB.prepare(
        "SELECT user_id, instrument_name, start_date, level FROM musician_instruments ORDER BY sort_order ASC"
      ).all<UserInstrumentRow>();
      const allHarmonieInstruments = await env.DB.prepare(
        "SELECT user_id, instrument_name FROM harmonie_instruments ORDER BY instrument_name ASC"
      ).all<HarmonieInstrumentRow>();

      const instrumentsByUser = new Map<
        number,
        { instrument_name: string; start_date?: string | null; level?: string | null }[]
      >();
      for (const row of allInstruments.results || []) {
        const uid = row.user_id;
        if (!instrumentsByUser.has(uid)) instrumentsByUser.set(uid, []);
        instrumentsByUser.get(uid)!.push({
          instrument_name: row.instrument_name,
          start_date: row.start_date,
          level: row.level,
        });
      }

      const harmonieByUser = new Map<number, string[]>();
      for (const row of allHarmonieInstruments.results || []) {
        const uid = row.user_id;
        if (!harmonieByUser.has(uid)) harmonieByUser.set(uid, []);
        harmonieByUser.get(uid)!.push(row.instrument_name);
      }

      const usersWithInstruments = (users.results || []).map((u) => {
        return {
          ...u,
          instruments: instrumentsByUser.get(u.id as number) || [],
          harmonieInstruments: harmonieByUser.get(u.id as number) || [],
        };
      });

      return new Response(JSON.stringify(usersWithInstruments), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (request.method === "POST") {
      const data = (await request.json()) as UserWithProfile;

      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?")
        .bind(data.email.toLowerCase().trim())
        .first<UserIdRow>();
      if (existing) {
        return new Response(
          JSON.stringify({ error: "Un utilisateur avec cet email existe déjà" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const statements = [
        env.DB.prepare("INSERT INTO users (email, role, is_active) VALUES (?, ?, ?)").bind(
          data.email.toLowerCase().trim(),
          data.role || "MUSICIAN",
          data.is_active !== 0 ? 1 : 0
        ),
        env.DB.prepare(
          `
          INSERT INTO musician_profiles (user_id, first_name, last_name, avatar, date_of_birth, phone,
            address_line1, address_line2, postal_code, city,
            harmonie_start_date, is_conservatory_student, music_theory_level,
            emergency_contact_last_name, emergency_contact_first_name, emergency_contact_email, emergency_contact_phone, image_consent, adhesion_2026_2027)
          VALUES ((SELECT last_insert_rowid()), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        ).bind(
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
          data.image_consent == null ? null : data.image_consent ? 1 : 0,
          data.adhesion_2026_2027 ? 1 : 0
        ),
      ];

      if (data.instruments) {
        for (let i = 0; i < data.instruments.length; i++) {
          const inst = data.instruments[i];
          if (inst.instrument_name?.trim()) {
            statements.push(
              env.DB.prepare(
                `
                INSERT INTO musician_instruments (user_id, instrument_name, start_date, level, sort_order)
                VALUES ((SELECT last_insert_rowid()), ?, ?, ?, ?)
              `
              ).bind(inst.instrument_name.trim(), inst.start_date || null, inst.level || null, i)
            );
          }
        }
      }

      const results = await env.DB.batch(statements);
      const userId = results[0].meta.last_row_id;

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
      const data = (await request.json()) as UserWithProfile;

      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ? AND id != ?")
        .bind(data.email.toLowerCase().trim(), id)
        .first<UserIdRow>();
      if (existing) {
        return new Response(
          JSON.stringify({ error: "Un autre utilisateur avec cet email existe déjà" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      await env.DB.prepare("UPDATE users SET email = ?, role = ?, is_active = ? WHERE id = ?")
        .bind(data.email.toLowerCase().trim(), data.role, data.is_active !== 0 ? 1 : 0, id)
        .run();

      const existingProfile = await env.DB.prepare(
        "SELECT id FROM musician_profiles WHERE user_id = ?"
      )
        .bind(id)
        .first<UserIdRow>();
      if (existingProfile) {
        await env.DB.prepare(
          `
          UPDATE musician_profiles
          SET first_name = ?, last_name = ?, avatar = ?, date_of_birth = ?, phone = ?,
              address_line1 = ?, address_line2 = ?, postal_code = ?, city = ?,
              harmonie_start_date = ?, is_conservatory_student = ?, music_theory_level = ?,
              emergency_contact_last_name = ?, emergency_contact_first_name = ?,
              emergency_contact_email = ?, emergency_contact_phone = ?, image_consent = ?, adhesion_2026_2027 = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `
        )
          .bind(
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
            data.image_consent == null ? null : data.image_consent ? 1 : 0,
            data.adhesion_2026_2027 ? 1 : 0,
            id
          )
          .run();
      } else {
        await env.DB.prepare(
          `
          INSERT INTO musician_profiles (user_id, first_name, last_name, avatar, date_of_birth, phone,
            address_line1, address_line2, postal_code, city,
            harmonie_start_date, is_conservatory_student, music_theory_level,
            emergency_contact_last_name, emergency_contact_first_name, emergency_contact_email, emergency_contact_phone, image_consent, adhesion_2026_2027)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
        )
          .bind(
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
            data.emergency_contact_phone || null,
            data.image_consent == null ? null : data.image_consent ? 1 : 0,
            data.adhesion_2026_2027 ? 1 : 0
          )
          .run();
      }

      await env.DB.prepare("DELETE FROM musician_instruments WHERE user_id = ?").bind(id).run();
      if (data.instruments) {
        for (let i = 0; i < data.instruments.length; i++) {
          const inst = data.instruments[i];
          if (inst.instrument_name?.trim()) {
            await env.DB.prepare(
              `
              INSERT INTO musician_instruments (user_id, instrument_name, start_date, level, sort_order)
              VALUES (?, ?, ?, ?, ?)
            `
            )
              .bind(id, inst.instrument_name.trim(), inst.start_date || null, inst.level || null, i)
              .run();
          }
        }
      }

      await env.DB.prepare("DELETE FROM harmonie_instruments WHERE user_id = ?").bind(id).run();
      if (data.harmonieInstruments && data.harmonieInstruments.length > 0) {
        for (const instrumentName of data.harmonieInstruments) {
          if (instrumentName?.trim()) {
            await env.DB.prepare(
              "INSERT INTO harmonie_instruments (user_id, instrument_name) VALUES (?, ?)"
            )
              .bind(id, instrumentName.trim())
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
    logger.error("Users API error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
