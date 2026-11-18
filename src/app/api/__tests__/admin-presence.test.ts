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
        response_deadline TEXT,
        parental_authorization_required INTEGER NOT NULL DEFAULT 0,
        authorization_details TEXT
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
      CREATE TABLE guardian_links (
        id INTEGER PRIMARY KEY,
        guardian_user_id INTEGER NOT NULL,
        child_user_id INTEGER NOT NULL,
        relation TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE event_authorizations (
        id INTEGER PRIMARY KEY,
        event_id INTEGER NOT NULL,
        child_user_id INTEGER NOT NULL,
        guardian_user_id INTEGER,
        recorded_by INTEGER,
        details_snapshot TEXT,
        authorized_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(event_id, child_user_id)
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

  it("joint l'auteur d'une réponse parentale et sa relation encore active", async () => {
    database.exec(`
      INSERT INTO users (id, role, kind, is_active) VALUES (3, 'MUSICIAN', 'guardian', 1);
      INSERT INTO musician_profiles (user_id, first_name, last_name)
        VALUES (3, 'Aurélie', 'Parent');
      INSERT INTO guardian_links (guardian_user_id, child_user_id, relation)
        VALUES (3, 2, 'mère');
      INSERT INTO event_presences (event_id, user_id, status, updated_by)
        VALUES (42, 2, 'present', 3);
    `);
    vi.mocked(verifySession).mockResolvedValue(admin);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1")
    );
    const body = (await response.json()) as {
      members: Array<{
        userId: number;
        answers: Record<
          string,
          {
            answeredBy: {
              name: string | null;
              relation: string | null;
              isAdmin: boolean;
              kind: string;
            } | null;
            authorization?: {
              authorizedBy: {
                name: string | null;
                relation: string | null;
                kind: string;
                paper: boolean;
              } | null;
            };
          }
        >;
      }>;
    };

    expect(response.status).toBe(200);
    expect(body.members.find((member) => member.userId === 2)?.answers["42"]?.answeredBy).toEqual({
      name: "Aurélie Parent",
      relation: "mère",
      isAdmin: false,
      kind: "parent",
    });
    database.exec(`
      UPDATE events SET parental_authorization_required = 1, authorization_details = 'Horaires actuels'
        WHERE id = 42;
      INSERT INTO event_authorizations (
        event_id, child_user_id, guardian_user_id, details_snapshot, authorized_at
      ) VALUES (42, 2, 3, 'Horaires actuels', '2026-11-18 10:00:00');
    `);
    const initialPaper = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1")
    );
    expect(initialPaper.status).toBe(200);
    database.prepare("UPDATE event_authorizations SET recorded_by = 1 WHERE event_id = 42").run();
    const paperResponse = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1")
    );
    const paperBody = (await paperResponse.json()) as {
      members: Array<{
        userId: number;
        answers: Record<string, { authorization?: { authorizedBy: unknown } }>;
      }>;
    };
    expect(
      paperBody.members.find((member) => member.userId === 2)?.answers["42"]?.authorization
        ?.authorizedBy
    ).toEqual({ name: "Aurélie Parent", relation: "mère", kind: "parent", paper: true });
  });

  it("utilise le nom de repli pour un administrateur sans profil et un compte supprimé", async () => {
    database.exec(`
      INSERT INTO event_presences (
        event_id, user_id, status, updated_by, status_changed_at, updated_at
      ) VALUES (42, 2, 'present', 1, '2026-09-01 10:00:00', '2026-09-02 11:00:00');
    `);
    vi.mocked(verifySession).mockResolvedValue(admin);

    const adminResponse = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1")
    );
    const adminBody = (await adminResponse.json()) as {
      members: Array<{
        userId: number;
        answers: Record<
          string,
          { answeredBy: { name: string | null; kind: string } | null; answeredAt: string | null }
        >;
      }>;
    };
    expect(adminBody.members.find((member) => member.userId === 2)?.answers["42"]?.answeredBy).toEqual({
      name: null,
      relation: null,
      isAdmin: true,
      kind: "noProfile",
    });
    expect(adminBody.members.find((member) => member.userId === 2)?.answers["42"]?.answeredAt).toBe(
      database
        .prepare("SELECT updated_at FROM event_presences WHERE event_id = 42")
        .get()
        ?.updated_at
    );

    database.prepare("UPDATE event_presences SET updated_by = 999 WHERE event_id = 42").run();
    const deletedResponse = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1")
    );
    const deletedBody = (await deletedResponse.json()) as {
      members: Array<{
        userId: number;
        answers: Record<string, { answeredBy: { name: string | null; kind: string } | null }>;
      }>;
    };
    expect(
      deletedBody.members.find((member) => member.userId === 2)?.answers["42"]?.answeredBy
    ).toEqual({
      name: null,
      relation: null,
      isAdmin: false,
      kind: "deleted",
    });
  });

  it("ajoute l'autorisation à la grille uniquement pour les musiciens reliés", async () => {
    database.exec(`
      UPDATE events SET parental_authorization_required = 1, authorization_details = 'Horaires actuels'
        WHERE id = 42;
      INSERT INTO users (id, role, kind, is_active) VALUES
        (3, 'MUSICIAN', 'guardian', 1), (4, 'MUSICIAN', 'member', 1),
        (5, 'MUSICIAN', 'managed', 1);
      INSERT INTO musician_profiles (user_id, first_name, last_name) VALUES
        (3, 'Aurélie', 'Parent'), (4, 'Tom', 'Sans lien'), (5, 'Lila', 'Sans réponse');
      INSERT INTO guardian_links (guardian_user_id, child_user_id, relation)
        VALUES (3, 2, 'mère'), (3, 5, 'mère');
      INSERT INTO event_authorizations (
        event_id, child_user_id, guardian_user_id, details_snapshot, authorized_at
      ) VALUES (42, 2, 3, 'Anciennes consignes', '2026-11-18 10:00:00');
    `);
    vi.mocked(verifySession).mockResolvedValue(admin);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1")
    );
    const body = (await response.json()) as {
      events: Array<{
        parentalAuthorizationRequired: boolean;
        authorizationDetails: string | null;
      }>;
      members: Array<{
        userId: number;
        answers: Record<
          string,
          {
            authorization?: {
              status: string;
              authorizedBy: {
                name: string | null;
                relation: string | null;
                kind: string;
                paper: boolean;
              } | null;
              authorizedAt: string | null;
              outdated: boolean;
            };
          }
        >;
      }>;
    };

    expect(body.events[0]).toMatchObject({
      parentalAuthorizationRequired: true,
      authorizationDetails: "Horaires actuels",
    });
    expect(body.members.find((member) => member.userId === 2)?.answers["42"]?.authorization).toEqual({
      status: "authorized",
      authorizedBy: { name: "Aurélie Parent", relation: "mère", kind: "parent", paper: false },
      authorizedAt: "2026-11-18 10:00:00",
      outdated: true,
    });
    expect(body.members.find((member) => member.userId === 4)?.answers["42"]).not.toHaveProperty(
      "authorization"
    );
    expect(body.members.find((member) => member.userId === 5)?.answers["42"]?.authorization).toEqual({
      status: "missing",
      authorizedBy: null,
      authorizedAt: null,
      outdated: false,
    });
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
