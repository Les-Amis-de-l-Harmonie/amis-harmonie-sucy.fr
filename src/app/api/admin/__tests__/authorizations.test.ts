// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleAdminAuthorizationsApi } from "../authorizations";
import { createD1Database } from "@/app/api/__tests__/d1-adapter";

vi.mock("@/lib/cache", () => ({ invalidateCache: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const originalDb = env.DB;
let database: DatabaseSync;
let ids: { admin: number; superAdmin: number; child: number; guardian: number; otherGuardian: number };

function addUser(email: string, role: string, kind = "member"): number {
  const user = database
    .prepare("INSERT INTO users (email, role, kind, is_active) VALUES (?, ?, ?, 1)")
    .run(email, role, kind);
  const id = Number(user.lastInsertRowid);
  database
    .prepare("INSERT INTO musician_profiles (user_id, first_name, last_name) VALUES (?, ?, ?)")
    .run(id, `Prénom${id}`, `Nom${id}`);
  return id;
}

function request(body: unknown, session: "admin" | "super" | null = "admin"): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (session === "admin") headers.set("Cookie", "admin_session=admin-session");
  if (session === "super") headers.set("Cookie", "admin_session=super-session");
  return new Request("https://test.local/api/admin/authorizations", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function send(body: unknown, session: "admin" | "super" | null = "admin") {
  return handleAdminAuthorizationsApi(request(body, session));
}

beforeEach(() => {
  database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  const migrations = readdirSync("migrations")
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) database.exec(readFileSync(`migrations/${migration}`, "utf8"));
  Object.assign(env, { DB: createD1Database(database) });

  const superAdmin = addUser("super@example.test", "SUPER_ADMIN");
  const admin = addUser("admin@example.test", "ADMIN");
  const child = addUser("child@example.test", "MUSICIAN", "managed");
  const guardian = addUser("guardian@example.test", "MUSICIAN", "guardian");
  const otherGuardian = addUser("other@example.test", "MUSICIAN", "guardian");
  ids = { superAdmin, admin, child, guardian, otherGuardian };

  database.prepare("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)").run(
    "super-session",
    superAdmin,
    "2099-01-01T00:00:00.000Z"
  );
  database.prepare("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)").run(
    "admin-session",
    admin,
    "2099-01-01T00:00:00.000Z"
  );
  database.prepare(
    `INSERT INTO events (title, date, parental_authorization_required, authorization_details)
     VALUES ('Sortie', '2099-07-01', 1, 'Départ à 8 h')`
  ).run();
  database
    .prepare("INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (?, ?, ?)")
    .run(guardian, child, "mère");
});

afterEach(() => {
  database.close();
  Object.assign(env, { DB: originalDb });
});

describe("API admin des autorisations parentales", () => {
  it("exige une session administrateur et renvoie 405 hors POST", async () => {
    const unauthorized = await send({}, null);
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.headers.get("Content-Type")).toContain("application/json");
    expect(await unauthorized.json()).toEqual({ error: "Non autorisé" });
    const response = await handleAdminAuthorizationsApi(
      new Request("https://test.local/api/admin/authorizations", {
        method: "GET",
        headers: { Cookie: "admin_session=admin-session" },
      })
    );
    expect(response.status).toBe(405);
  });

  it("saisit une autorisation papier, conserve le signataire optionnel et la retire", async () => {
    const eventId = Number(database.prepare("SELECT id FROM events").get()?.id);
    const recorded = await send({
      eventId,
      childUserId: ids.child,
      authorize: true,
      guardianUserId: ids.guardian,
    });

    expect(recorded.status).toBe(200);
    expect(await recorded.json()).toEqual({ success: true });
    expect(
      database
        .prepare(
          `SELECT event_id, child_user_id, guardian_user_id, recorded_by, details_snapshot
           FROM event_authorizations`
        )
        .get()
    ).toEqual({
      event_id: eventId,
      child_user_id: ids.child,
      guardian_user_id: ids.guardian,
      recorded_by: ids.admin,
      details_snapshot: "Départ à 8 h",
    });

    const revoked = await send({ eventId, childUserId: ids.child, authorize: false });
    expect(revoked.status).toBe(200);
    expect(database.prepare("SELECT count(*) AS count FROM event_authorizations").get()).toEqual({
      count: 0,
    });
  });

  it("permet une saisie sans responsable désigné et refuse un responsable non relié", async () => {
    const eventId = Number(database.prepare("SELECT id FROM events").get()?.id);
    const unlinked = await send({
      eventId,
      childUserId: ids.child,
      authorize: true,
      guardianUserId: ids.otherGuardian,
    });
    expect(unlinked.status).toBe(400);

    const paper = await send({ eventId, childUserId: ids.child, authorize: true });
    expect(paper.status).toBe(200);
    expect(
      database
        .prepare("SELECT guardian_user_id, recorded_by FROM event_authorizations")
        .get()
    ).toEqual({ guardian_user_id: null, recorded_by: ids.admin });
  });
});
