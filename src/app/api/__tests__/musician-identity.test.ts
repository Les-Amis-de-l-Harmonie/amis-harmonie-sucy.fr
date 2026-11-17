// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { env } from "cloudflare:workers";
import { resolveMusicianIdentity } from "../auth";

interface SqliteStatement {
  bind(...values: Array<string | number | null>): SqliteStatement;
  first<T>(): Promise<T | null>;
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
          const result = database.prepare(sql).get(...values);
          return (result as T | undefined) ?? null;
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
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      is_active INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      last_login TEXT
    );
    CREATE TABLE sessions (
      session_id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expires_at TEXT NOT NULL
    );
    INSERT INTO users (id, email, role, is_active, created_at, last_login)
    VALUES (7, 'musicien@example.fr', 'MUSICIAN', 1, '2026-01-01', NULL);
    INSERT INTO sessions (session_id, user_id, expires_at)
    VALUES ('session-valide', 7, '2099-01-01T00:00:00.000Z');
  `);
  return database;
}

const originalDb = env.DB;
let database: DatabaseSync;

describe("resolveMusicianIdentity", () => {
  beforeEach(() => {
    database = createDatabase();
    Object.assign(env, { DB: createD1Database(database) });
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb });
  });

  it("retourne null sans session", async () => {
    await expect(resolveMusicianIdentity(new Request("https://test.local/"))).resolves.toBeNull();
  });

  it("retourne null avec une session inconnue", async () => {
    const request = new Request("https://test.local/", {
      headers: { Cookie: "musician_session=session-inconnue" },
    });

    await expect(resolveMusicianIdentity(request)).resolves.toBeNull();
  });

  it("utilise la même identité pour l'acteur et la cible effective", async () => {
    const request = new Request("https://test.local/", {
      headers: { Cookie: "musician_session=session-valide" },
    });

    const identity = await resolveMusicianIdentity(request);

    expect(identity).not.toBeNull();
    expect(identity?.actor.id).toBe(7);
    expect(identity?.actor).toBe(identity?.effective);
  });

  it("n'appelle plus directement verifySession dans les handlers musiciens", () => {
    const musicianApi = readFileSync(new URL("../musician.ts", import.meta.url), "utf8");
    const presenceApi = readFileSync(new URL("../musician-presence.ts", import.meta.url), "utf8");

    expect(musicianApi).not.toContain("verifySession(");
    expect(presenceApi).not.toContain("verifySession(");
  });
});
