import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleMusicianPresenceApi } from "../musician-presence";
import { resolveMusicianIdentity } from "../auth";
import { invalidateCache } from "@/lib/cache";
import { MUSICIAN_PRESENCE_MEMBER_QUERY } from "@/lib/presence";
import { PRESENCE_SHEET_URL } from "@/lib/presence-beta";

vi.mock("../auth", () => ({
  resolveMusicianIdentity: vi.fn(),
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

interface FakeAnswerAuthor {
  updatedBy: number | null;
  updaterRole: "ADMIN" | "SUPER_ADMIN" | "MUSICIAN" | null;
  updaterFirstName: string | null;
  updaterRelation: string | null;
}

interface FakeEvent {
  id: number;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  address: string | null;
  response_deadline: string | null;
  dress_code: string | null;
  call_time: string | null;
  musician_notes: string | null;
}

interface FakeDb {
  prepare(sql: string): FakeStatement;
  calls: FakeCall[];
  ownPresence: FakePresence | null;
  ownAuthor: FakeAnswerAuthor;
  otherPresence: FakePresence;
  event: FakeEvent;
  events: FakeEvent[];
  pastEvent: boolean;
  callerEligible: boolean;
}

const caller = {
  id: 7,
  email: "leducmaxime@gmail.com",
  role: "MUSICIAN" as const,
  kind: "member" as const,
  is_active: 1,
  created_at: "2026-01-01",
  last_login: null,
  sessionId: "session-id",
  acting_user_id: null,
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
    ownAuthor: {
      updatedBy: 7,
      updaterRole: "MUSICIAN",
      updaterFirstName: "Paul",
      updaterRelation: null,
    },
    otherPresence: {
      status: "absent",
      comment: "SENTINEL_SECRET_COMMENT",
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
      dress_code: "Tenue de cérémonie",
      call_time: "10H30",
      musician_notes: "Apporter les partitions",
    },
    events: [],
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
          if (sql.includes("FROM event_presences ep") && sql.includes("WHERE ep.event_id")) {
            return (
              db.ownPresence
                ? { eventId: 12, ...db.ownPresence, ...db.ownAuthor }
                : null
            ) as T;
          }
          return null;
        },
        async all<T>(): Promise<{ results: T[] }> {
          if (sql.includes("FROM events")) {
            const pastIncluded = sql.includes("-12 months");
            return (db.pastEvent && !pastIncluded ? { results: [] } : { results: db.events }) as {
              results: T[];
            };
          }
          if (sql.includes("WHERE ep.user_id = ?") && sql.includes("json_each")) {
            const eventIds = JSON.parse(String(call.binds[1])) as number[];
            const results = eventIds.flatMap((eventId) => {
              if (eventId !== 12 || db.ownPresence === null) return [];
              return [{ eventId, ...db.ownPresence, updatedAt: db.ownPresence.updated_at, ...db.ownAuthor }];
            });
            return { results } as { results: T[] };
          }
          if (sql.includes("FROM event_presences ep") && sql.includes("json_each")) {
            const eventIds = JSON.parse(String(call.binds[0])) as number[];
            const results = eventIds.flatMap((eventId) => {
              if (eventId !== 12) return [];
              return [
                {
                  eventId,
                  userId: 7,
                  status: db.ownPresence?.status ?? "present",
                  comment: db.ownPresence?.comment ?? null,
                  updatedAt: db.ownPresence?.updated_at ?? "2099-01-01 00:00:00",
                },
                {
                  eventId,
                  userId: 8,
                  status: db.otherPresence.status,
                  comment: db.otherPresence.comment,
                  updatedAt: db.otherPresence.updated_at,
                  updatedBy: null,
                  updaterRole: null,
                  updaterFirstName: null,
                  updaterRelation: null,
                },
              ];
            });
            return { results } as { results: T[] };
          }
          if (sql.includes("FROM users u")) {
            const results = [
              {
                userId: 7,
                firstName: "Paul",
                lastName: "Musicien",
                instrument: null,
                isPrimary: null,
                status: db.ownPresence?.status ?? null,
                statusChangedAt: db.ownPresence?.status_changed_at ?? null,
              },
              {
                userId: 8,
                firstName: "Autre",
                lastName: "Musicien",
                instrument: null,
                isPrimary: null,
                status: db.otherPresence.status,
                statusChangedAt: db.otherPresence.status_changed_at,
              },
              {
                userId: 9,
                firstName: "Sans",
                lastName: "Réponse",
                instrument: "Cor",
                isPrimary: 0,
                status: null,
                statusChangedAt: null,
              },
            ].filter((member) => db.callerEligible || member.userId !== 7);
            return { results } as { results: T[] };
          }
          return { results: [] };
        },
        async run(): Promise<{ meta: { last_row_id: number } }> {
          if (sql.includes("DELETE FROM event_presences")) {
            db.ownPresence = null;
          } else if (sql.includes("INSERT INTO event_presences") && db.ownPresence !== null) {
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
  db.events = [db.event];
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
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce(null);

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );

    expect(response.status).toBe(401);
  });

  it("retourne les réponses et un roster sans jamais exposer les commentaires des autres", async () => {
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const wire = await response.text();
    const body = JSON.parse(wire) as {
      currentUserId: number;
      presenceBeta: { locked: boolean; sheetUrl: string };
      events: Array<{
        id: number;
        response: {
          status: string;
          comment: string | null;
          updated_at: string | null;
          answeredBy: {
            name: string | null;
            relation: string | null;
            byAssociation: boolean;
            byYou: boolean;
          } | null;
        };
        roster: Array<Record<string, unknown>>;
        counts: Record<string, number>;
        authorization: unknown;
      }>;
    };

    expect(response.status).toBe(200);
    expect(wire).not.toContain("SENTINEL_SECRET_COMMENT");
    expect(wire).toContain("MON_PROPRE_COMMENTAIRE");
    expect(body.events[0]?.roster.length).toBeGreaterThan(0);
    expect(body.currentUserId).toBe(caller.id);
    expect(body.presenceBeta).toEqual({ locked: false, sheetUrl: PRESENCE_SHEET_URL });
    const event = body.events[0];
    expect(event).toBeDefined();
    if (!event) throw new Error("La réponse événement est absente");
    expect(Object.keys(event)).toEqual([
      "id",
      "title",
      "date",
      "time",
      "location",
        "address",
        "response_deadline",
        "dress_code",
        "call_time",
        "musician_notes",
        "response",
        "roster",
        "counts",
        "authorization",
      ]);
    expect(event.authorization).toBeNull();
    expect(event).toMatchObject({
      dress_code: "Tenue de cérémonie",
      call_time: "10H30",
      musician_notes: "Apporter les partitions",
    });
    expect(Object.keys(event.response)).toEqual(["status", "comment", "updated_at", "answeredBy"]);
    expect(event.response.answeredBy).toBeNull();
    expect(Object.keys(event.roster[0] ?? {})).toEqual([
      "userId",
      "firstName",
      "lastName",
      "instruments",
      "primaryInstrument",
      "status",
    ]);
    expect(Object.keys(event.counts)).toEqual(["present", "absent", "noAnswer", "totalMembers"]);
    expect(
      body.events[0]?.roster.some(
        (entry) =>
          typeof entry === "object" && entry !== null && "status" in entry && entry.status === null
      )
    ).toBe(true);
    for (const entry of body.events[0]?.roster ?? []) {
      expect(Object.keys(entry as object)).not.toContain("comment");
    }
    const answers = fakeDb.calls.find(
      (call) => call.sql.includes("json_each") && !call.sql.includes("WHERE ep.user_id = ?")
    );
    expect(answers?.binds).toEqual([JSON.stringify([12])]);
    expect(answers?.sql).toContain("WHERE ep.event_id IN (SELECT value FROM json_each(?)");
    expect(answers?.sql).toContain("WHERE type = 'integer'");
    expect(answers?.sql).not.toContain("LEFT JOIN users updater");
    const ownAnswerQuery = fakeDb.calls.find((call) => call.sql.includes("WHERE ep.user_id = ?"));
    expect(ownAnswerQuery?.binds).toEqual([caller.id, JSON.stringify([12])]);
    expect(ownAnswerQuery?.sql).toContain("LEFT JOIN users updater");
    expect(
      fakeDb.calls.filter((call) => call.sql.includes("FROM event_presences WHERE"))
    ).toHaveLength(0);
    expect(
      fakeDb.calls.find((call) => call.sql === MUSICIAN_PRESENCE_MEMBER_QUERY)?.sql
    ).not.toContain("comment");
    expect(MUSICIAN_PRESENCE_MEMBER_QUERY).toContain("AND u.role = 'MUSICIAN'");
  });

  it("indique le verrou bêta dans la réponse quand le compte n'est pas testeur", async () => {
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: { ...caller, email: "musicien@example.fr" },
      effective: caller,
      delegated: false,
      profiles: [],
    });

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const body = (await response.json()) as {
      presenceBeta: { locked: boolean; sheetUrl: string };
      events: Array<{
        dress_code: string | null;
        call_time: string | null;
        musician_notes: string | null;
      }>;
    };

    expect(body.presenceBeta).toEqual({ locked: true, sheetUrl: PRESENCE_SHEET_URL });
    expect(body.events[0]).toMatchObject({
      dress_code: "Tenue de cérémonie",
      call_time: "10H30",
      musician_notes: "Apporter les partitions",
    });
  });

  it("indique le prénom et la relation du responsable ayant répondu", async () => {
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });
    fakeDb.ownAuthor = {
      updatedBy: 21,
      updaterRole: "MUSICIAN",
      updaterFirstName: "Aurélie",
      updaterRelation: "mère",
    };

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const body = (await response.json()) as {
      events: Array<{ response: { answeredBy: unknown } }>;
    };

    expect(body.events[0]?.response.answeredBy).toEqual({
      name: "Aurélie",
      relation: "mère",
      byAssociation: false,
      byYou: false,
    });
  });

  it("n'affiche pas le nom d'un administrateur dans le portail musicien", async () => {
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });
    fakeDb.ownAuthor = {
      updatedBy: 1,
      updaterRole: "ADMIN",
      updaterFirstName: "Mario",
      updaterRelation: null,
    };

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const body = (await response.json()) as {
      events: Array<{ response: { answeredBy: unknown } }>;
    };

    expect(body.events[0]?.response.answeredBy).toEqual({
      name: null,
      relation: null,
      byAssociation: true,
      byYou: false,
    });
  });

  it("conserve le prénom du responsable mais retire la relation si le lien n'existe plus", async () => {
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });
    fakeDb.ownAuthor = {
      updatedBy: 21,
      updaterRole: "MUSICIAN",
      updaterFirstName: "Aurélie",
      updaterRelation: null,
    };

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const body = (await response.json()) as {
      events: Array<{ response: { answeredBy: unknown } }>;
    };

    expect(body.events[0]?.response.answeredBy).toEqual({
      name: "Aurélie",
      relation: null,
      byAssociation: false,
      byYou: false,
    });
  });

  it("marque votre propre réponse comme telle uniquement en délégation", async () => {
    const child = { ...caller, id: 8, kind: "managed" as const };
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: child,
      delegated: true,
      profiles: [],
    });
    fakeDb.ownAuthor = {
      updatedBy: caller.id,
      updaterRole: "MUSICIAN",
      updaterFirstName: "Paul",
      updaterRelation: null,
    };

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const body = (await response.json()) as {
      events: Array<{ response: { answeredBy: unknown } }>;
    };

    expect(body.events[0]?.response.answeredBy).toEqual({
      name: "Paul",
      relation: null,
      byAssociation: false,
      byYou: true,
    });
  });

  it("ne montre aucune attribution quand le musicien a répondu lui-même en délégation", async () => {
    const child = { ...caller, id: 8, kind: "managed" as const };
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: child,
      delegated: true,
      profiles: [],
    });
    fakeDb.ownAuthor = {
      updatedBy: child.id,
      updaterRole: "MUSICIAN",
      updaterFirstName: "Léa",
      updaterRelation: null,
    };

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence")
    );
    const body = (await response.json()) as {
      events: Array<{ response: { answeredBy: unknown } }>;
    };

    expect(body.events[0]?.response.answeredBy).toBeNull();
  });

  it("inclut les événements passés des douze derniers mois avec includePast=1", async () => {
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });
    fakeDb.pastEvent = true;

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence?includePast=1")
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as { events: Array<{ title: string }> };
    expect(body.events[0]?.title).toBe("Concert de rentrée");
    const eventQuery = fakeDb.calls.find((call) => call.sql.includes("FROM events"));
    expect(eventQuery?.sql).toContain("date('now', '-12 months')");
    expect(eventQuery?.sql).toContain("ORDER BY date ASC");
  });

  it("garde un nombre fixe de requêtes quand le nombre d'événements augmente", async () => {
    const queryCountFor = async (eventCount: number): Promise<number> => {
      const db = createFakeDb();
      db.events = Array.from({ length: eventCount }, (_, index) => ({
        ...db.event,
        id: 100 + index,
        title: `Répétition ${index + 1}`,
      }));
      Object.assign(env, { DB: db });
      vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
        actor: caller,
        effective: caller,
        delegated: false,
        profiles: [],
      });

      const response = await handleMusicianPresenceApi(
        new Request("https://test.local/api/musician/presence")
      );
      expect(response.status).toBe(200);
      return db.calls.length;
    };

    expect(await queryCountFor(3)).toBe(4);
    expect(await queryCountFor(6)).toBe(4);
  });

  it("rejette la valeur de statut peut-être", async () => {
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "peut-etre" }),
      })
    );

    expect(response.status).toBe(400);
  });

  it("refuse une réponse pour un événement passé", async () => {
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });
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
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "absent", comment: "  Après répétition  " }),
      })
    );

    expect(response.status).toBe(200);
    expect(invalidateCache).not.toHaveBeenCalled();
    expect(await response.clone().json()).toMatchObject({
      event: {
        dress_code: "Tenue de cérémonie",
        call_time: "10H30",
        musician_notes: "Apporter les partitions",
      },
    });
    const insert = fakeDb.calls.find((call) => call.sql.includes("INSERT INTO event_presences"));
    expect(insert?.binds[3]).toBe("Après répétition");
  });

  it("refuse une réponse hors bêta sans écrire en base", async () => {
    const originalPresence = fakeDb.ownPresence ? { ...fakeDb.ownPresence } : null;
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: { ...caller, email: "musicien@example.fr" },
      effective: caller,
      delegated: false,
      profiles: [],
    });

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "absent" }),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Les réponses de présence se font pour l'instant dans le fichier des présences.",
      sheetUrl: PRESENCE_SHEET_URL,
    });
    expect(fakeDb.ownPresence).toEqual(originalPresence);
    expect(fakeDb.calls).toHaveLength(0);
  });

  it("efface une réponse avec un statut nul de façon idempotente", async () => {
    vi.mocked(resolveMusicianIdentity).mockResolvedValue({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });

    const firstResponse = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: null, comment: "commentaire ignoré" }),
      })
    );
    const secondResponse = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: null }),
      })
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(fakeDb.ownPresence).toBeNull();
    expect(
      fakeDb.calls.filter((call) => call.sql.includes("DELETE FROM event_presences"))
    ).toHaveLength(2);
  });

  it("enregistre la présence de l'enfant avec l'identifiant du parent comme auteur", async () => {
    const child = { ...caller, id: 8, kind: "managed" as const };
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: child,
      delegated: true,
      profiles: [],
    });

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "present", comment: "Réponse du parent" }),
      })
    );

    const upsert = fakeDb.calls.find((call) => call.sql.includes("INSERT INTO event_presences"));
    expect(response.status).toBe(200);
    expect(upsert?.binds).toEqual([12, 8, "present", "Réponse du parent", 7]);
    expect(upsert?.sql).toContain("updated_by");
  });

  it("verrouille aussi la réponse d'un enfant quand le parent n'est pas testeur", async () => {
    const child = { ...caller, id: 8, kind: "managed" as const };
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: { ...caller, email: "parent@example.fr" },
      effective: child,
      delegated: true,
      profiles: [],
    });

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "present" }),
      })
    );

    expect(response.status).toBe(403);
    expect(fakeDb.calls).toHaveLength(0);
  });

  it("refuse une réponse pour un musicien non éligible", async () => {
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });
    fakeDb.callerEligible = false;

    const response = await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "present" }),
      })
    );

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Vous ne faites pas partie de l'effectif de référence de l'harmonie.",
    });
  });

  it("refuse un commentaire de plus de 1000 caractères", async () => {
    vi.mocked(resolveMusicianIdentity).mockResolvedValueOnce({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });

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
    vi.mocked(resolveMusicianIdentity).mockResolvedValue({
      actor: caller,
      effective: caller,
      delegated: false,
      profiles: [],
    });

    await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "absent", comment: "Premier commentaire" }),
      })
    );
    const dateAfterFlip = fakeDb.ownPresence?.status_changed_at;

    await handleMusicianPresenceApi(
      new Request("https://test.local/api/musician/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 12, status: "absent", comment: "Commentaire modifié" }),
      })
    );

    expect(dateAfterFlip).toBe("2099-01-02 12:00:00");
    expect(fakeDb.ownPresence?.status_changed_at).toBe(dateAfterFlip);
    const insert = fakeDb.calls.find((call) => call.sql.includes("INSERT INTO event_presences"));
    expect(insert?.sql).toContain("WHEN excluded.status <> event_presences.status");
    expect(insert?.sql).toContain("ELSE event_presences.status_changed_at");
    expect(insert?.sql).toContain("updated_at = datetime('now')");
  });
});
