// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleAdminPresenceApi } from "../admin/presence";
import { verifySession } from "../auth";
import { createD1Database } from "./d1-adapter";

vi.mock("../auth", () => ({
  verifySession: vi.fn(),
}));

const admin = {
  id: 1,
  email: "admin@example.fr",
  role: "ADMIN" as const,
  kind: "member" as const,
  is_active: 1,
  last_login: null,
  created_at: "2026-01-01",
  sessionId: "session-admin",
  acting_user_id: null,
};
const originalDb = env.DB;
let database: DatabaseSync;

describe("handleAdminPresenceApi", () => {
  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        role TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'member',
        is_active INTEGER NOT NULL
      );
      CREATE TABLE events (
        id INTEGER PRIMARY KEY,
        title TEXT NOT NULL,
        date TEXT NOT NULL,
        presence_required INTEGER NOT NULL DEFAULT 1,
        response_deadline TEXT
      );
      CREATE TABLE musician_profiles (
        user_id INTEGER PRIMARY KEY,
        first_name TEXT,
        last_name TEXT
      );
      CREATE TABLE harmonie_instruments (
        id INTEGER PRIMARY KEY,
        user_id INTEGER NOT NULL,
        instrument_name TEXT NOT NULL,
        is_primary INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE event_presences (
        id INTEGER PRIMARY KEY,
        event_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        comment TEXT,
        updated_by INTEGER,
        status_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(event_id, user_id)
      );
      INSERT INTO users (id, role, is_active) VALUES (1, 'ADMIN', 1), (2, 'MUSICIAN', 1);
      INSERT INTO events (id, title, date, presence_required) VALUES (42, 'Concert', '2099-01-01', 1);
      INSERT INTO musician_profiles (user_id, first_name, last_name) VALUES (2, 'Musicien', 'Test');
    `);
    Object.assign(env, { DB: createD1Database(database) });
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb });
  });

  it("enregistre l'identifiant de l'administrateur dans updated_by", async () => {
    vi.mocked(verifySession).mockResolvedValue(admin);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: 42, userId: 2, status: "present" }),
      })
    );

    expect(response.status).toBe(200);
    expect(
      database.prepare("SELECT user_id, updated_by FROM event_presences WHERE event_id = 42").get()
    ).toEqual({ user_id: 2, updated_by: 1 });
  });

  it("renvoie 401 JSON quand la session n'est pas administrateur", async () => {
    vi.mocked(verifySession).mockResolvedValue(null);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1")
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Non autorisé" });
  });
});
