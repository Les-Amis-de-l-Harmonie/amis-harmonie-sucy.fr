// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import {
  handleMagicLinkRequest,
  handleMagicLinkVerify,
  resolveMusicianIdentity,
  verifySession,
} from "../auth";

interface SqliteStatement {
  bind(...values: Array<string | number | null>): SqliteStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

function createD1Database(database: DatabaseSync): { prepare: (sql: string) => SqliteStatement } {
  return {
    prepare(sql: string): SqliteStatement {
      let values: Array<string | number | null> = [];
      const statement: SqliteStatement = {
        bind(...boundValues) {
          values = boundValues;
          return statement;
        },
        async first<T>() {
          return (database.prepare(sql).get(...values) as T | undefined) ?? null;
        },
        async all<T>() {
          return { results: database.prepare(sql).all(...values) as T[] };
        },
        async run() {
          return database.prepare(sql).run(...values);
        },
      };
      return statement;
    },
  };
}

function createDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'member',
      is_active INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      last_login TEXT
    );
    CREATE TABLE sessions (
      session_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      acting_user_id INTEGER,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE guardian_links (
      id INTEGER PRIMARY KEY,
      guardian_user_id INTEGER NOT NULL,
      child_user_id INTEGER NOT NULL,
      relation TEXT
    );
    CREATE TABLE musician_profiles (
      user_id INTEGER PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      avatar TEXT
    );
    CREATE TABLE auth_tokens (
      id INTEGER PRIMARY KEY,
      token TEXT NOT NULL,
      email TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    INSERT INTO users VALUES
      (7, 'membre@example.fr', 'MUSICIAN', 'member', 1, '2026-01-01', NULL),
      (8, 'zoe@example.fr', 'MUSICIAN', 'member', 1, '2026-01-01', NULL),
      (9, 'alice@example.fr', 'MUSICIAN', 'managed', 1, '2026-01-01', NULL),
      (10, 'inactif@example.fr', 'MUSICIAN', 'member', 0, '2026-01-01', NULL),
      (12, 'responsable-enfant@example.fr', 'MUSICIAN', 'guardian', 1, '2026-01-01', NULL),
      (14, 'enfant-autrui@example.fr', 'MUSICIAN', 'member', 1, '2026-01-01', NULL),
      (15, 'camille@example.fr', 'MUSICIAN', 'member', 1, '2026-01-01', NULL),
      (16, 'benoit@example.fr', 'MUSICIAN', 'member', 1, '2026-01-01', NULL),
      (17, 'transitif@example.fr', 'MUSICIAN', 'member', 1, '2026-01-01', NULL),
      (18, 'sans-email+test@interne.amis-harmonie-sucy.fr', 'MUSICIAN', 'managed', 1, '2026-01-01', NULL),
      (20, 'parent@example.fr', 'MUSICIAN', 'guardian', 1, '2026-01-01', NULL),
      (21, 'parent-vide@example.fr', 'MUSICIAN', 'guardian', 1, '2026-01-01', NULL);
    INSERT INTO sessions VALUES
      ('session-membre', 7, NULL, '2099-01-01T00:00:00.000Z'),
      ('session-parent', 20, NULL, '2099-01-01T00:00:00.000Z'),
      ('session-parent-vide', 21, NULL, '2099-01-01T00:00:00.000Z'),
      ('session-managed', 18, NULL, '2099-01-01T00:00:00.000Z');
    INSERT INTO guardian_links (guardian_user_id, child_user_id) VALUES
      (7, 8), (7, 9), (7, 10), (7, 12), (20, 14), (20, 15), (20, 16), (15, 17);
    INSERT INTO musician_profiles (user_id, first_name, last_name, avatar) VALUES
      (7, 'Membre', 'Test', NULL),
      (8, 'Zoé', 'Enfant', '/zoe.webp'),
      (9, 'Alice', 'Gérée', NULL),
      (10, 'Inactif', 'Enfant', NULL),
      (12, 'Responsable', 'Exclu', NULL),
      (14, 'Autre', 'Enfant', NULL),
      (15, 'Camille', 'Enfant', NULL),
      (16, 'Benoît', 'Enfant', '/benoit.webp'),
      (17, 'Transitif', 'Enfant', NULL),
      (18, 'Enfant', 'Géré', NULL),
      (20, 'Parent', 'Test', '/parent.webp'),
      (21, 'Parent', 'Vide', NULL);
  `);
  return database;
}

const originalDb = env.DB;
let database: DatabaseSync;

function requestFor(sessionId: string): Request {
  return new Request("https://test.local/", {
    headers: { Cookie: `musician_session=${sessionId}` },
  });
}

describe("resolveMusicianIdentity", () => {
  beforeEach(() => {
    database = createDatabase();
    Object.assign(env, { DB: createD1Database(database) });
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb });
  });

  it("conserve l'espace du membre et liste ses enfants directs actifs dans l'ordre", async () => {
    const identity = await resolveMusicianIdentity(requestFor("session-membre"));

    expect(identity?.effective.id).toBe(7);
    expect(identity?.delegated).toBe(false);
    expect(identity?.profiles.map((profile) => [profile.userId, profile.firstName])).toEqual([
      [7, "Membre"],
      [9, "Alice"],
      [8, "Zoé"],
    ]);
  });

  it("résout un enfant lié choisi dans la session", async () => {
    database
      .prepare("UPDATE sessions SET acting_user_id = 8 WHERE session_id = ?")
      .run("session-membre");

    const identity = await resolveMusicianIdentity(requestFor("session-membre"));

    expect(identity?.actor.id).toBe(7);
    expect(identity?.effective.id).toBe(8);
    expect(identity?.delegated).toBe(true);
  });

  it.each([
    ["un enfant inactif", 10],
    ["un enfant lié à un autre parent", 14],
    ["un compte responsable exclu", 12],
    ["un enfant seulement lié transitivement", 17],
  ])("réinitialise la cible périmée (%s)", async (_description, childId) => {
    database
      .prepare("UPDATE sessions SET acting_user_id = ? WHERE session_id = ?")
      .run(childId, "session-membre");

    const identity = await resolveMusicianIdentity(requestFor("session-membre"));

    expect(identity?.effective.id).toBe(7);
    expect(identity?.delegated).toBe(false);
    expect(
      database
        .prepare("SELECT acting_user_id FROM sessions WHERE session_id = ?")
        .get("session-membre")
    ).toEqual({ acting_user_id: null });
  });

  it("dérive le premier enfant du responsable sans enregistrer la sélection", async () => {
    const identity = await resolveMusicianIdentity(requestFor("session-parent"));

    expect(identity?.effective.id).toBe(14);
    expect(identity?.delegated).toBe(true);
    expect(identity?.profiles.map((profile) => profile.userId)).toEqual([20, 14, 16, 15]);
    expect(
      database
        .prepare("SELECT acting_user_id FROM sessions WHERE session_id = ?")
        .get("session-parent")
    ).toEqual({ acting_user_id: null });
  });

  it("ne traverse pas les liens d'un enfant pour construire le profil du responsable", async () => {
    database
      .prepare("UPDATE sessions SET acting_user_id = 17 WHERE session_id = 'session-parent'")
      .run();

    const identity = await resolveMusicianIdentity(requestFor("session-parent"));

    expect(identity?.effective.id).toBe(14);
    expect(identity?.profiles.some((profile) => profile.userId === 17)).toBe(false);
    expect(
      database
        .prepare("SELECT acting_user_id FROM sessions WHERE session_id = 'session-parent'")
        .get()
    ).toEqual({ acting_user_id: null });
  });

  it("permet au responsable de choisir explicitement son espace Moi", async () => {
    database
      .prepare("UPDATE sessions SET acting_user_id = 20 WHERE session_id = 'session-parent'")
      .run();

    const identity = await resolveMusicianIdentity(requestFor("session-parent"));

    expect(identity?.effective.id).toBe(20);
    expect(identity?.effective.kind).toBe("guardian");
    expect(identity?.delegated).toBe(false);
  });

  it("garde le responsable sans enfant sur son espace Moi", async () => {
    const identity = await resolveMusicianIdentity(requestFor("session-parent-vide"));

    expect(identity?.effective.id).toBe(21);
    expect(identity?.profiles).toHaveLength(1);
    expect(identity?.profiles[0]).toEqual(
      expect.objectContaining({ userId: 21, isSelf: true, kind: "guardian" })
    );
  });

  it("refuse un compte géré et supprime sa session", async () => {
    await expect(verifySession(requestFor("session-managed"), "musician")).resolves.toBeNull();
    expect(
      database
        .prepare("SELECT session_id FROM sessions WHERE session_id = ?")
        .get("session-managed")
    ).toBe(undefined);
  });

  it("répond de façon neutre au lien magique d'un compte géré sans créer de jeton", async () => {
    const response = await handleMagicLinkRequest(
      new Request("https://test.local/api/auth/musician-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ email: "sans-email+test@interne.amis-harmonie-sucy.fr" }),
      }),
      "musician"
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      message: "Si cet email est enregistré, un lien de connexion a été envoyé.",
    });
    expect(database.prepare("SELECT COUNT(*) AS count FROM auth_tokens").get()).toEqual({
      count: 0,
    });
  });

  it("refuse aussi un jeton existant visant un compte géré", async () => {
    database
      .prepare("INSERT INTO auth_tokens (token, email, expires_at) VALUES (?, ?, ?)")
      .run(
        "jeton-gere",
        "sans-email+test@interne.amis-harmonie-sucy.fr",
        "2099-01-01T00:00:00.000Z"
      );

    const response = await handleMagicLinkVerify(
      new Request("https://test.local/musician/verify?token=jeton-gere", { method: "POST" }),
      "musician"
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("error=account_inactive");
    expect(
      database.prepare("SELECT COUNT(*) AS count FROM sessions WHERE user_id = 18").get()
    ).toEqual({
      count: 1,
    });
  });

  it("réserve l'écriture de acting_user_id à l'authentification et à la bascule", () => {
    const apiRoot = join(process.cwd(), "src/app/api");
    const sourceFiles: string[] = [];
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "__tests__") visit(path);
        } else if (entry.name.endsWith(".ts")) {
          sourceFiles.push(path);
        }
      }
    };
    visit(apiRoot);
    const matches = sourceFiles
      .filter((path) => readFileSync(path, "utf8").includes("acting_user_id"))
      .map((path) => relative(process.cwd(), path))
      .sort();

    expect(matches).toEqual(["src/app/api/auth.ts", "src/app/api/musician-acting.ts"]);
  });

  it("n'utilise plus verifySession directement dans les handlers musiciens", () => {
    const musicianModules = readdirSync(apiRootPath())
      .filter((name) => /^musician.*\.ts$/.test(name))
      .sort();
    expect(musicianModules).toContain("musician-authorizations.ts");
    const offenders = musicianModules.filter((name) =>
      readFileSync(join(apiRootPath(), name), "utf8").includes("verifySession(")
    );
    expect(offenders).toEqual([]);
  });
});

function apiRootPath(): string {
  return join(process.cwd(), "src/app/api");
}
