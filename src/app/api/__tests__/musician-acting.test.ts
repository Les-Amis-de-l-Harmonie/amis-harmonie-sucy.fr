// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleMusicianActingApi } from "../musician-acting";
import { resolveMusicianIdentity } from "../auth";
import { createD1Database } from "./d1-adapter";

vi.mock("../auth", () => ({
  resolveMusicianIdentity: vi.fn(),
}));

const actor = {
  id: 7,
  email: "parent@example.fr",
  role: "MUSICIAN" as const,
  kind: "guardian" as const,
  is_active: 1,
  last_login: null,
  created_at: "2026-01-01",
  sessionId: "session-parent",
  acting_user_id: null,
};
const profiles = [
  {
    userId: 7,
    isSelf: true,
    kind: "guardian" as const,
    firstName: "Parent",
    lastName: "Test",
    avatar: null,
  },
  {
    userId: 8,
    isSelf: false,
    kind: "managed" as const,
    firstName: "Enfant",
    lastName: "Test",
    avatar: null,
  },
];

const originalDb = env.DB;
let database: DatabaseSync;

describe("POST /api/musician/acting", () => {
  beforeEach(() => {
    database = new DatabaseSync(":memory:");
    database.exec(`
      CREATE TABLE sessions (session_id TEXT PRIMARY KEY, user_id INTEGER, acting_user_id INTEGER);
      INSERT INTO sessions (session_id, user_id) VALUES ('session-parent', 7), ('autre-session', 70);
    `);
    Object.assign(env, { DB: createD1Database(database) });
    vi.mocked(resolveMusicianIdentity).mockResolvedValue({
      actor,
      effective: actor,
      delegated: true,
      profiles,
    });
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb });
  });

  it("enregistre le profil lié dans la seule session courante", async () => {
    const response = await handleMusicianActingApi(
      new Request("https://test.local/api/musician/acting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 8 }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(
      database
        .prepare("SELECT acting_user_id FROM sessions WHERE session_id = 'session-parent'")
        .get()
    ).toEqual({
      acting_user_id: 8,
    });
    expect(
      database
        .prepare("SELECT acting_user_id FROM sessions WHERE session_id = 'autre-session'")
        .get()
    ).toEqual({
      acting_user_id: null,
    });
  });

  it("enregistre Moi en utilisant l'identifiant de l'acteur", async () => {
    const response = await handleMusicianActingApi(
      new Request("https://test.local/api/musician/acting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: null }),
      })
    );

    expect(response.status).toBe(200);
    expect(
      database
        .prepare("SELECT acting_user_id FROM sessions WHERE session_id = 'session-parent'")
        .get()
    ).toEqual({
      acting_user_id: 7,
    });
  });

  it("refuse un profil qui n'est pas lié à la session", async () => {
    const response = await handleMusicianActingApi(
      new Request("https://test.local/api/musician/acting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: 999 }),
      })
    );

    expect(response.status).toBe(403);
    expect(
      database
        .prepare("SELECT acting_user_id FROM sessions WHERE session_id = 'session-parent'")
        .get()
    ).toEqual({
      acting_user_id: null,
    });
  });

  it("refuse les autres méthodes et les corps mal formés", async () => {
    const getResponse = await handleMusicianActingApi(
      new Request("https://test.local/api/musician/acting")
    );
    const invalidResponse = await handleMusicianActingApi(
      new Request("https://test.local/api/musician/acting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "8" }),
      })
    );

    expect(getResponse.status).toBe(405);
    expect(invalidResponse.status).toBe(400);
  });
});
