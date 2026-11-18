// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleGuardiansApi } from "../guardians";
import { handleUsersApi } from "../users";
import { createD1Database } from "@/app/api/__tests__/d1-adapter";

vi.mock("@/lib/cache", () => ({ invalidateCache: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

const originalDb = env.DB;
let database: DatabaseSync;

function createDatabase(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const migrations = readdirSync("migrations")
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) {
    db.exec(readFileSync(`migrations/${migration}`, "utf8"));
  }

  const addUser = (email: string, role: string, kind: string, active = 1): number => {
    const result = db
      .prepare("INSERT INTO users (email, role, kind, is_active) VALUES (?, ?, ?, ?)")
      .run(email, role, kind, active);
    const id = Number(result.lastInsertRowid);
    db.prepare(
      "INSERT INTO musician_profiles (user_id, first_name, last_name, phone) VALUES (?, ?, ?, ?)"
    ).run(id, `Prénom${id}`, `Nom${id}`, null);
    return id;
  };

  const superAdminId = addUser("super@test.fr", "SUPER_ADMIN", "member");
  const adminId = addUser("admin@test.fr", "ADMIN", "member");
  const childId = addUser("enfant@test.fr", "MUSICIAN", "member");
  addUser("parent@test.fr", "MUSICIAN", "member");
  addUser("inactif-enfant@test.fr", "MUSICIAN", "member", 0);
  addUser("inactif-parent@test.fr", "MUSICIAN", "member", 0);
  addUser("responsable@test.fr", "MUSICIAN", "guardian");
  addUser("sans-email+test@interne.amis-harmonie-sucy.fr", "MUSICIAN", "managed");
  addUser("admin-enfant@test.fr", "ADMIN", "member");

  db.prepare("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)").run(
    "super-session",
    superAdminId,
    "2099-01-01T00:00:00.000Z"
  );
  db.prepare("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)").run(
    "admin-session",
    adminId,
    "2099-01-01T00:00:00.000Z"
  );
  db.prepare("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)").run(
    "child-session-one",
    childId,
    "2099-01-01T00:00:00.000Z"
  );
  db.prepare("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)").run(
    "child-session-two",
    childId,
    "2099-01-01T00:00:00.000Z"
  );
  return db;
}

function request(
  path: string,
  method = "GET",
  body?: unknown,
  session: "super" | "admin" | null = "super"
): Request {
  const headers = new Headers();
  if (session === "super") headers.set("Cookie", "admin_session=super-session");
  if (session === "admin") headers.set("Cookie", "admin_session=admin-session");
  if (body !== undefined) headers.set("Content-Type", "application/json");
  return new Request(`https://test.local/api/admin/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function send(
  path: string,
  method = "GET",
  body?: unknown,
  session: "super" | "admin" | null = "super"
) {
  return handleGuardiansApi(request(`guardians${path ? `?${path}` : ""}`, method, body, session));
}

function row<T>(sql: string, ...values: Array<string | number>): T | undefined {
  return database.prepare(sql).get(...values) as T | undefined;
}

beforeEach(() => {
  database = createDatabase();
  Object.assign(env, { DB: createD1Database(database) });
});

afterEach(() => {
  database.close();
  Object.assign(env, { DB: originalDb });
});

describe("API des responsables légaux", () => {
  it("refuse une requête sans session avec 401 JSON", async () => {
    const response = await send("", "GET", undefined, null);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: expect.any(String) });
  });

  it.each(["create-guardian", "handover", "give-access"])(
    "réserve l'action %s aux super-administrateurs",
    async (action) => {
      const response = await send(`action=${action}`, "POST", {}, "admin");
      expect(response.status).toBe(403);
    }
  );

  it("renvoie les liens d'un compte et masque l'adresse d'un enfant géré", async () => {
    database
      .prepare(
        "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation, created_by) VALUES (?, ?, ?, ?)"
      )
      .run(4, 8, "parent", 1);
    const response = await send("userId=4");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      guardians: [],
      children: [
        {
          linkId: 1,
          userId: 8,
          email: null,
          kind: "managed",
          relation: "parent",
          isActive: true,
        },
      ],
    });
  });

  it("refuse les identifiants non entiers et le lien vers un compte absent", async () => {
    const invalid = await send("", "POST", { childUserId: "3x", guardianUserId: 4 });
    expect(invalid.status).toBe(400);
    const absent = await send("", "POST", { childUserId: 999, guardianUserId: 4 });
    expect(absent.status).toBe(404);
  });

  it("refuse l'auto-lien, les doublons et les liens inverses", async () => {
    const self = await send("", "POST", { childUserId: 3, guardianUserId: 3 });
    expect(self.status).toBe(400);
    database
      .prepare(
        "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation, created_by) VALUES (?, ?, ?, ?)"
      )
      .run(4, 3, "parent", 1);
    const duplicate = await send("", "POST", { childUserId: 3, guardianUserId: 4 });
    expect(duplicate.status).toBe(409);
    database.prepare("DELETE FROM guardian_links").run();
    database
      .prepare(
        "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation, created_by) VALUES (?, ?, ?, ?)"
      )
      .run(3, 4, "enfant", 1);
    const reverse = await send("", "POST", { childUserId: 3, guardianUserId: 4 });
    expect(reverse.status).toBe(409);
  });

  it("refuse les comptes parent, administrateur, géré et inactifs aux mauvais rôles", async () => {
    const guardianAsChild = await send("", "POST", { childUserId: 7, guardianUserId: 4 });
    const adminAsChild = await send("", "POST", { childUserId: 9, guardianUserId: 4 });
    const managedAsGuardian = await send("", "POST", { childUserId: 3, guardianUserId: 8 });
    const adminAsGuardian = await send("", "POST", { childUserId: 3, guardianUserId: 1 });
    const inactiveChild = await send("", "POST", { childUserId: 5, guardianUserId: 4 });
    const inactiveGuardian = await send("", "POST", { childUserId: 3, guardianUserId: 6 });
    expect(guardianAsChild.status).toBe(400);
    expect(adminAsChild.status).toBe(400);
    expect(managedAsGuardian.status).toBe(400);
    expect(adminAsGuardian.status).toBe(400);
    expect(inactiveChild.status).toBe(409);
    expect(inactiveGuardian.status).toBe(409);
  });

  it("refuse un lien de parenté de plus de 50 caractères", async () => {
    const response = await send("", "POST", {
      childUserId: 3,
      guardianUserId: 4,
      relation: "x".repeat(51),
    });
    expect(response.status).toBe(400);
  });

  it("lie un compte existant et enregistre l'administrateur créateur", async () => {
    const response = await send(
      "",
      "POST",
      {
        childUserId: 3,
        guardianUserId: 4,
        relation: "Mère",
      },
      "admin"
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(
      row<{ created_by: number }>("SELECT created_by FROM guardian_links WHERE child_user_id = 3")
    ).toEqual({ created_by: 2 });
  });

  it("crée le responsable et son profil, ou renvoie l'id du compte existant", async () => {
    const response = await send("action=create-guardian", "POST", {
      childUserId: 3,
      firstName: "  Alice ",
      lastName: "Parent",
      email: "  ALICE@EXAMPLE.FR ",
      phone: "  0600000000 ",
      relation: "Mère",
    });
    expect(response.status).toBe(200);
    const created = row<{ id: number; kind: string; role: string }>(
      "SELECT id, kind, role FROM users WHERE email = 'alice@example.fr'"
    );
    expect(created).toMatchObject({ kind: "guardian", role: "MUSICIAN" });
    expect(
      row<{ first_name: string; phone: string }>(
        "SELECT first_name, phone FROM musician_profiles WHERE user_id = ?",
        created?.id ?? 0
      )
    ).toEqual({ first_name: "Alice", phone: "0600000000" });

    const duplicate = await send("action=create-guardian", "POST", {
      childUserId: 3,
      firstName: "Alice",
      lastName: "Parent",
      email: "alice@example.fr",
      relation: "Mère",
    });
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ existingUserId: created?.id });
  });

  it("refuse les domaines réservés dans la création d'un responsable", async () => {
    const response = await send("action=create-guardian", "POST", {
      childUserId: 3,
      firstName: "A",
      lastName: "B",
      email: "parent@interne.amis-harmonie-sucy.fr",
      relation: "Parent",
    });
    expect(response.status).toBe(400);
  });

  it("transfère l'adresse, crée le responsable et supprime uniquement les sessions de l'enfant", async () => {
    const response = await send("action=handover", "POST", {
      childUserId: 3,
      firstName: "Parent",
      lastName: "Enfant",
      relation: "Parent",
    });
    expect(response.status).toBe(200);
    const result = (await response.json()) as { guardianUserId: number };
    expect(
      row<{ kind: string; email: string }>("SELECT kind, email FROM users WHERE id = 3")
    ).toMatchObject({ kind: "managed" });
    expect(
      row<{ kind: string; email: string }>(
        "SELECT kind, email FROM users WHERE id = ?",
        result.guardianUserId
      )
    ).toEqual({ kind: "guardian", email: "enfant@test.fr" });
    expect(
      row<{ count: number }>("SELECT count(*) AS count FROM guardian_links WHERE child_user_id = 3")
    ).toEqual({ count: 1 });
    expect(
      row<{ count: number }>("SELECT count(*) AS count FROM sessions WHERE user_id = 3")
    ).toEqual({ count: 0 });
    expect(
      row<{ count: number }>("SELECT count(*) AS count FROM sessions WHERE user_id = 1")
    ).toEqual({ count: 1 });
    expect(
      row<{ count: number }>("SELECT count(*) AS count FROM users WHERE email = 'enfant@test.fr'")
    ).toEqual({ count: 1 });
    expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  });

  it("transfère l'adresse vers un responsable existant", async () => {
    const response = await send("action=handover", "POST", {
      childUserId: 3,
      guardianUserId: 4,
      relation: "Parent",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      guardianUserId: 4,
      previousEmail: "enfant@test.fr",
    });
    expect(
      row<{ email: string; kind: string }>("SELECT email, kind FROM users WHERE id = 3")
    )?.toMatchObject({ kind: "managed" });
    expect(
      row<{ count: number }>(
        "SELECT count(*) AS count FROM guardian_links WHERE guardian_user_id = 4 AND child_user_id = 3"
      )
    ).toEqual({ count: 1 });
  });

  it("refuse de transférer un compte déjà géré et respecte l'unicité de l'adresse", async () => {
    const alreadyManaged = await send("action=handover", "POST", {
      childUserId: 8,
      firstName: "A",
      lastName: "B",
      relation: "Parent",
    });
    expect(alreadyManaged.status).toBe(409);
    expect(() =>
      database
        .prepare("INSERT INTO users (email, role) VALUES (?, 'MUSICIAN')")
        .run("enfant@test.fr")
    ).toThrow();
  });

  it("donne accès à un compte géré et refuse une adresse réservée ou déjà utilisée", async () => {
    const reserved = await send("action=give-access", "POST", {
      childUserId: 8,
      email: "sans-email+autre@interne.amis-harmonie-sucy.fr",
    });
    expect(reserved.status).toBe(400);
    const duplicate = await send("action=give-access", "POST", {
      childUserId: 8,
      email: "parent@test.fr",
    });
    expect(duplicate.status).toBe(409);
    const success = await send("action=give-access", "POST", {
      childUserId: 8,
      email: "  NOUVEAU@EXAMPLE.FR ",
    });
    expect(success.status).toBe(200);
    expect(
      row<{ email: string; kind: string }>("SELECT email, kind FROM users WHERE id = 8")
    ).toEqual({ email: "nouveau@example.fr", kind: "member" });
  });

  it("supprime un lien et renvoie 404 si le lien n'existe pas", async () => {
    database
      .prepare(
        "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (?, ?, ?)"
      )
      .run(4, 3, "Parent");
    const deleted = await send("id=1", "DELETE", undefined, "admin");
    expect(deleted.status).toBe(200);
    const missing = await send("id=1", "DELETE");
    expect(missing.status).toBe(404);
  });

  it("renvoie 405 pour une méthode non gérée", async () => {
    expect((await send("", "PATCH")).status).toBe(405);
    expect((await send("action=create-guardian", "PATCH", {}, "admin")).status).toBe(405);
  });

  it("renvoie 400 pour un corps JSON invalide", async () => {
    const response = await handleGuardiansApi(
      new Request("https://test.local/api/admin/guardians", {
        method: "POST",
        headers: {
          Cookie: "admin_session=super-session",
          "Content-Type": "application/json",
        },
        body: "{",
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Le corps de la requête est invalide." });
  });
});

describe("protection des comptes dans l'API utilisateurs", () => {
  it("refuse le domaine réservé en création et en modification", async () => {
    const created = await handleUsersApi(
      request("users", "POST", { email: "no@interne.amis-harmonie-sucy.fr" })
    );
    expect(created.status).toBe(400);
    const updated = await handleUsersApi(
      request("users?id=3", "PUT", { email: "no@interne.amis-harmonie-sucy.fr" })
    );
    expect(updated.status).toBe(400);
  });

  it("ne renvoie jamais l'adresse interne des comptes gérés", async () => {
    database
      .prepare(
        "INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (?, ?, ?)"
      )
      .run(4, 8, "Parent");
    const response = await handleUsersApi(request("users?id=8"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      email: null,
      kind: "managed",
      guardian_names: "Prénom4 Nom4",
      children_names: null,
    });
  });

  it("n'accepte pas de changer le kind en PUT", async () => {
    const changed = await handleUsersApi(
      request("users?id=3", "PUT", {
        email: "enfant-modifie@test.fr",
        role: "MUSICIAN",
        kind: "guardian",
      })
    );
    expect(changed.status).toBe(200);
    expect(row<{ kind: string }>("SELECT kind FROM users WHERE id = 3")).toEqual({
      kind: "member",
    });
  });

  it("empêche un ADMIN de modifier son rôle ou son état actif en mettant à jour son profil", async () => {
    const response = await handleUsersApi(
      request(
        "users?id=2",
        "PUT",
        {
          email: "admin-modifie@test.fr",
          role: "SUPER_ADMIN",
          is_active: 0,
          first_name: "Administrateur modifié",
        },
        "admin"
      )
    );

    expect(response.status).toBe(200);
    expect(
      row<{ role: string; is_active: number }>("SELECT role, is_active FROM users WHERE id = 2")
    ).toEqual({ role: "ADMIN", is_active: 1 });
    expect(
      row<{ first_name: string }>("SELECT first_name FROM musician_profiles WHERE user_id = 2")
    ).toEqual({ first_name: "Administrateur modifié" });
  });

  it("met à jour le profil d'un compte géré sans e-mail et conserve son adresse et son kind", async () => {
    const response = await handleUsersApi(
      request("users?id=8", "PUT", {
        first_name: "Lila",
        last_name: "Gérée",
        phone: "0600000000",
        role: "SUPER_ADMIN",
        is_active: 0,
        adhesion_2026_2027: 1,
        image_consent: 1,
        kind: "member",
        instruments: [{ instrument_name: "Clarinette" }],
      })
    );
    expect(response.status).toBe(200);
    expect(
      row<{ email: string; kind: string }>("SELECT email, kind FROM users WHERE id = 8")
    ).toEqual({ kind: "managed", email: "sans-email+test@interne.amis-harmonie-sucy.fr" });
    expect(
      row<{
        first_name: string;
        last_name: string;
        phone: string;
        adhesion_2026_2027: number;
        image_consent: number;
      }>(
        "SELECT first_name, last_name, phone, adhesion_2026_2027, image_consent FROM musician_profiles WHERE user_id = 8"
      )
    ).toEqual({
      first_name: "Lila",
      last_name: "Gérée",
      phone: "0600000000",
      adhesion_2026_2027: 1,
      image_consent: 1,
    });
    expect(row<{ is_active: number }>("SELECT is_active FROM users WHERE id = 8")).toEqual({
      is_active: 0,
    });
    expect(row<{ role: string }>("SELECT role FROM users WHERE id = 8")).toEqual({
      role: "MUSICIAN",
    });
    expect(
      row<{ user_id: number; instrument_name: string }>(
        "SELECT user_id, instrument_name FROM musician_instruments WHERE user_id = 8"
      )
    ).toEqual({ user_id: 8, instrument_name: "Clarinette" });
  });

  it("force le rôle MUSICIAN lors de la modification d'un compte responsable", async () => {
    const response = await handleUsersApi(
      request("users?id=7", "PUT", {
        email: "responsable@test.fr",
        role: "SUPER_ADMIN",
        is_active: 1,
      })
    );
    expect(response.status).toBe(200);
    expect(
      row<{ kind: string; role: string }>("SELECT kind, role FROM users WHERE id = 7")
    ).toEqual({
      kind: "guardian",
      role: "MUSICIAN",
    });
  });

  it("ignore un e-mail arbitraire soumis pour un compte géré", async () => {
    const response = await handleUsersApi(
      request("users?id=8", "PUT", {
        email: "super@test.fr",
        first_name: "Lila modifiée",
        role: "MUSICIAN",
        is_active: 1,
      })
    );
    expect(response.status).toBe(200);
    expect(
      row<{ email: string; kind: string }>("SELECT email, kind FROM users WHERE id = 8")
    ).toEqual({ kind: "managed", email: "sans-email+test@interne.amis-harmonie-sucy.fr" });
    expect(
      row<{ first_name: string }>("SELECT first_name FROM musician_profiles WHERE user_id = 8")
    ).toEqual({ first_name: "Lila modifiée" });
  });
});
