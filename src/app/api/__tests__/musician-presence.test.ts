import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleMusicianPresenceApi } from "../musician-presence";
import { verifySession } from "../auth";
import { invalidateCache } from "@/lib/cache";
import { PRESENCE_MEMBER_QUERY } from "@/lib/presence";

vi.mock("../auth", () => ({
  verifySession: vi.fn(),
}));

vi.mock("@/lib/cache", () => ({
  invalidateCache: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

interface FakeCall {
  sql: string;
  binds: unknown[];
}

interface FakeStatement {
  bind(...values: unknown[]): FakeStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { last_row_id: number } }>;
}

interface FakePresence {
  status: "present" | "absent";
  comment: string | null;
  updated_at: string;
  status_changed_at: string;
}

interface FakeDb {
  prepare(sql: string): FakeStatement;
  calls: FakeCall[];
  ownPresence: FakePresence;
  event: {
    id: number;
    title: string;
    date: string;
    time: string | null;
    location: string | null;
    address: string | null;
    response_deadline: string | null;
  };
  pastEvent: boolean;
  callerEligible: boolean;
}

const caller = {
  id: 7,
  email: "musicien@example.fr",
  role: "MUSICIAN" as const,
  is_active: 1,
  created_at: "2026-01-01",
  last_login: null,
  sessionId: "session-id",
};

function createFakeDb(): FakeDb {
  const db: FakeDb = {
    calls: [],
    ownPresence: {
      status: "present",
      comment: "MON_PROPRE_COMMENTAIRE",
      updated_at: "2026-08-20 12:00:00",
      status_changed_at: "2026-08-20 12:00:00",
    },
    event: {
      id: 12,
      title: "Concert de rentrée",
      date: "2099-01-15",
      time: "20:30",
      location: "Salle des fêtes",
      address: "1 rue de Sucy",
      response_deadline: "2099-01-01",
    },
    pastEvent: false,
    callerEligible: true,
    prepare(sql: string): FakeStatement {
      const call: FakeCall = { sql, binds: [] };
      db.calls.push(call);
      const statement: FakeStatement = {
        bind(...values: unknown[]): FakeStatement {
          call.binds = values;
          return statement;
        },
        async first<T>(): Promise<T | null> {
          if (sql.includes("FROM events")) {
            return (db.pastEvent ? null : db.event) as T;
          }
          if (sql.includes("FROM event_presences WHERE")) {
            return db.ownPresence as T;
          }
          return null;
        },
        async all<T>(): Promise<{ results: T[] }> {
          if (sql.includes("FROM events")) {
            return (db.pastEvent ? { results: [] } : { results: [db.event] }) as {
              results: T[];
            };
          }
          if (sql.includes("FROM users u")) {
            const results = [
              {
                userId: 7,
                firstName: "Paul",
                lastName: "Musicien",
                instrument: null,
                status: db.ownPresence.status,
                statusChangedAt: db.ownPresence.status_changed_at,
              },
              {
                userId: 8,
                firstName: "Autre",
                lastName: "Musicien",
                instrument: null,
                status: "absent" as const,
                statusChangedAt: "2026-08-20 12:00:00",
              },
            ].filter((member) => db.callerEligible || member.userId !== 7);
            return { results } as { results: T[] };
          }
          return { results: [] };
        },
        async run(): Promise<{ meta: { last_row_id: number } }> {
          if (sql.includes("INSERT INTO event_presences")) {
            const status = call.binds[2];
            const comment = call.binds[3];
            if (status !== db.ownPresence.status) {
              db.ownPresence.status_changed_at = "2099-01-02 12:00:00";
            }
            db.ownPresence.status = status as "present" | "absent";
            db.ownPresence.comment = comment as string | null;
            db.ownPresence.updated_at = "2099-01-02 12:00:00";
          }
          return { meta: { last_row_id: 1 } };
        },
      };
      return statement;
    },
  };
  return db;
}

describe("handleMusicianPresenceApi", () => {
  let fakeDb: FakeDb;

  beforeEach(() => {
    vi.clearAllMocks();
    fakeDb = createFakeDb();
    Object.assign(env, { DB: fakeDb });
  });

  it("refuse l'accès sans session", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(null);

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );

    expect(response.status).toBe(401);
  });

  it("retourne les réponses et un roster sans jamais exposer les commentaires des autres", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(caller);

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const wire = await response.text();
    const body = JSON.parse(wire) as {
      events: Array<{ response: { comment: string }; roster: unknown[] }>;
    };

    expect(response.status).toBe(200);
    expect(wire).not.toContain("SENTINEL_SECRET_COMMENT");
    expect(wire).toContain("MON_PROPRE_COMMENTAIRE");
    expect(body.events[0]?.roster.length).toBeGreaterThan(0);
    const own = fakeDb.calls.find((call) => call.sql.includes("FROM event_presences WHERE"));
    expect(own?.binds).toEqual([12, caller.id]);
    expect(fakeDb.calls.find((call) => call.sql === PRESENCE_MEMBER_QUERY)?.sql).not.toContain(
      "comment"
    );
  });

  it("rejette la valeur de statut peut-être", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(caller);

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "peut-etre" }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("refuse une réponse pour un événement passé", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(caller);
    fakeDb.pastEvent = true;

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "absent" }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("enregistre une réponse sans invalider le cache", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(caller);

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "absent", comment: "  Après répétition  " }),
      })
    );

    expect(response.status).toBe(200);
    expect(invalidateCache).not.toHaveBeenCalled();
    const insert = fakeDb.calls.find((call) => call.sql.includes("INSERT INTO event_presences"));
    expect(insert?.binds[3]).toBe("Après répétition");
  });

  it("refuse une réponse pour un musicien non éligible", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(caller);
    fakeDb.callerEligible = false;

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "present" }),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Vous n'êtes pas membre adhérent de l'harmonie.",
    });
  });

  it("refuse un commentaire de plus de 1000 caractères", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(caller);

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "present", comment: "a".repeat(1001) }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Le commentaire ne peut pas dépasser 1000 caractères.",
    });
  });

  it("déplace status_changed_at lors d'un changement de statut mais pas lors d'une édition du commentaire", async () => {
    vi.mocked(verifySession).mockResolvedValue(caller);

    await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "absent", comment: "Premier commentaire" }),
      })
    );
    const dateAfterFlip = fakeDb.ownPresence.status_changed_at;

    await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "absent", comment: "Commentaire modifié" }),
      })
    );

    expect(dateAfterFlip).toBe("2099-01-02 12:00:00");
    expect(fakeDb.ownPresence.status_changed_at).toBe(dateAfterFlip);
    const insert = fakeDb.calls.find((call) => call.sql.includes("INSERT INTO event_presences"));
    expect(insert?.sql).toContain("WHEN excluded.status <> event_presences.status");
    expect(insert?.sql).toContain("ELSE event_presences.status_changed_at");
    expect(insert?.sql).toContain("updated_at = datetime('now')");
  });
});
