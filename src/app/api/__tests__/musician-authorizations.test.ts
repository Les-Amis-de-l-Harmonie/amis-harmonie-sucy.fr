// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleMusicianAuthorizationsApi } from "../musician-authorizations";
import { handleMusicianPresenceApi } from "../musician-presence";
import { resolveMusicianIdentity } from "../auth";
import { createD1Database } from "./d1-adapter";

vi.mock("../auth", () => ({ resolveMusicianIdentity: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const originalDb = env.DB;
let database: DatabaseSync;
let parent: ReturnType<typeof musician>;
let child: ReturnType<typeof musician>;
let otherChild: ReturnType<typeof musician>;
let eventId: number;

function musician(
  id: number,
  kind: "member" | "guardian" | "managed",
  email: string,
  firstName: string
) {
  return {
    id,
    email,
    role: "MUSICIAN" as const,
    kind,
    is_active: 1,
    last_login: null,
    created_at: "2026-01-01",
    sessionId: "parent-session",
    acting_user_id: null,
    firstName,
  };
}

function useIdentity(delegated = true, effective = child, actor = parent) {
  vi.mocked(resolveMusicianIdentity).mockResolvedValue({
    actor,
    effective,
    delegated,
    profiles: [],
  });
}

function request(body: unknown): Request {
  return new Request("https://test.local/api/musician/authorizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  database = new DatabaseSync(":memory:");
  database.exec("PRAGMA foreign_keys = ON");
  const migrations = readdirSync("migrations")
    .filter((name) => /^\d{4}_.+\.sql$/.test(name))
    .sort();
  for (const migration of migrations) database.exec(readFileSync(`migrations/${migration}`, "utf8"));
  Object.assign(env, { DB: createD1Database(database) });

  const addUser = (email: string, kind: string, firstName: string): number => {
    const result = database
      .prepare("INSERT INTO users (email, role, kind, is_active) VALUES (?, 'MUSICIAN', ?, 1)")
      .run(email, kind);
    const id = Number(result.lastInsertRowid);
    database
      .prepare("INSERT INTO musician_profiles (user_id, first_name, last_name) VALUES (?, ?, ?)")
      .run(id, firstName, "Test");
    return id;
  };
  const parentId = addUser("parent@example.test", "guardian", "Aurélie");
  const secondParentId = addUser("second@example.test", "guardian", "Mario");
  const childId = addUser("child@example.test", "managed", "Léa");
  const otherChildId = addUser("other-child@example.test", "member", "Théo");
  parent = musician(parentId, "guardian", "parent@example.test", "Aurélie");
  child = musician(childId, "managed", "child@example.test", "Léa");
  otherChild = musician(otherChildId, "member", "other-child@example.test", "Théo");
  database
    .prepare("INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (?, ?, ?)")
    .run(parentId, childId, "mère");
  database
    .prepare("INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (?, ?, ?)")
    .run(secondParentId, childId, "père");
  database
    .prepare("INSERT INTO guardian_links (guardian_user_id, child_user_id, relation) VALUES (?, ?, ?)")
    .run(parentId, otherChildId, "mère");
  const event = database
    .prepare(
      `INSERT INTO events (
         title, date, presence_required, parental_authorization_required, authorization_details
       ) VALUES ('Sortie', '2099-07-01', 1, 1, 'Départ à 8 h')`
    )
    .run();
  eventId = Number(event.lastInsertRowid);
});

afterEach(() => {
  database.close();
  Object.assign(env, { DB: originalDb });
});

describe("autorisations parentales du portail", () => {
  it("retourne l'état manquant, enregistre, détecte les détails modifiés et permet le retrait", async () => {
    useIdentity();
    const getResponse = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const initial = (await getResponse.json()) as {
      events: Array<{ authorization: Record<string, unknown> | null }>;
    };
    expect(initial.events[0]?.authorization).toMatchObject({
      details: "Départ à 8 h",
      status: "missing",
      authorizedBy: null,
      authorizedAt: null,
      outdated: false,
      canAuthorize: true,
    });

    const recorded = await handleMusicianAuthorizationsApi(
      request({ eventId, authorize: true, childUserId: otherChild.id })
    );
    expect(recorded.status).toBe(200);
    const recordBody = (await recorded.json()) as {
      success: boolean;
      authorization: Record<string, unknown>;
    };
    expect(recordBody.success).toBe(true);
    expect(recordBody.authorization).toMatchObject({
      status: "authorized",
      authorizedBy: {
        name: "Aurélie",
        relation: "mère",
        byYou: true,
        byAssociation: false,
        paper: false,
      },
      outdated: false,
    });
    expect(
      database
        .prepare("SELECT child_user_id, guardian_user_id, recorded_by, details_snapshot FROM event_authorizations")
        .get()
    ).toEqual({
      child_user_id: child.id,
      guardian_user_id: parent.id,
      recorded_by: null,
      details_snapshot: "Départ à 8 h",
    });
    database
      .prepare("UPDATE event_authorizations SET recorded_by = 999 WHERE event_id = ?")
      .run(eventId);
    const paperResponse = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const paperBody = (await paperResponse.json()) as {
      events: Array<{
        authorization: {
          authorizedBy: {
            name: string | null;
            relation: string | null;
            byYou: boolean;
            byAssociation: boolean;
            paper: boolean;
          } | null;
        };
      }>;
    };
    expect(paperBody.events[0]?.authorization.authorizedBy).toEqual({
      name: "Aurélie",
      relation: "mère",
      byYou: true,
      byAssociation: false,
      paper: true,
    });
    expect(
      database.prepare("SELECT count(*) AS count FROM event_authorizations WHERE child_user_id = ?").get(otherChild.id)
    ).toEqual({ count: 0 });

    database
      .prepare("UPDATE events SET authorization_details = 'Départ à 9 h' WHERE id = ?")
      .run(eventId);
    const changedDetails = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const changedBody = (await changedDetails.json()) as {
      events: Array<{ authorization: { outdated: boolean; details: string | null } | null }>;
    };
    expect(changedBody.events[0]?.authorization).toMatchObject({
      details: "Départ à 9 h",
      outdated: true,
    });

    const revoked = await handleMusicianAuthorizationsApi(request({ eventId, authorize: false }));
    expect(revoked.status).toBe(200);
    expect(await revoked.json()).toMatchObject({
      success: true,
      authorization: { status: "missing", authorizedBy: null, outdated: false },
    });
  });

  it("refuse l'adolescent hors délégation et une prestation passée", async () => {
    useIdentity(false, child, child);
    const adolescent = await handleMusicianAuthorizationsApi(request({ eventId, authorize: true }));
    expect(adolescent.status).toBe(403);

    useIdentity(true, child, otherChild);
    const unlinkedActor = await handleMusicianAuthorizationsApi(
      request({ eventId, authorize: true })
    );
    expect(unlinkedActor.status).toBe(403);

    useIdentity();
    database.prepare("UPDATE events SET date = '2000-01-01' WHERE id = ?").run(eventId);
    const past = await handleMusicianAuthorizationsApi(request({ eventId, authorize: true }));
    expect(past.status).toBe(403);
  });

  it("la réponse de l'adolescent est visible sans lui donner le droit de modifier", async () => {
    database
      .prepare(
        `INSERT INTO event_authorizations (
           event_id, child_user_id, guardian_user_id, details_snapshot
         ) VALUES (?, ?, ?, 'Départ à 8 h')`
      )
      .run(eventId, child.id, parent.id);
    useIdentity(false, child, child);

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const body = (await response.json()) as {
      events: Array<{ authorization: { canAuthorize: boolean; status: string } | null }>;
    };

    expect(body.events[0]?.authorization).toMatchObject({
      canAuthorize: false,
      status: "authorized",
    });
  });
});
