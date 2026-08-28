import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@/db/types";
import { PRESENCE_MEMBER_QUERY, PRESENCE_UPSERT_ADMIN_SQL, type PresenceRow } from "@/lib/presence";
import { handleAdminPresenceApi } from "../presence";
import { checkAdminAuth } from "../../admin-crud";

vi.mock("../../admin-crud", () => ({
  checkAdminAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
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

interface FakeDb {
  prepare: ReturnType<typeof vi.fn>;
  calls: FakeCall[];
  getAnswers: () => FakeDbFixture["answers"];
}

interface FakeDbFixture {
  event: Event | null;
  rows: PresenceRow[];
  gridEvents: Array<{
    id: number;
    title: string;
    date: string;
    response_deadline: string | null;
  }>;
  pastGridEvents: Array<{
    id: number;
    title: string;
    date: string;
    response_deadline: string | null;
  }>;
  answers: Array<{
    eventId: number;
    userId: number;
    status: "present" | "absent";
    comment: string | null;
    statusChangedAt: string | null;
  }>;
}

function statementFor(
  firstResult: unknown,
  allResult: unknown[],
  runHandler: (...values: unknown[]) => void = () => undefined
): FakeStatement {
  let boundValues: unknown[] = [];
  const statement: FakeStatement = {
    bind: (...values: unknown[]) => {
      boundValues = values;
      return statement;
    },
    first: async <T>() => firstResult as T | null,
    all: async <T>() => ({ results: allResult as T[] }),
    run: async () => {
      runHandler(...boundValues);
      return { meta: { last_row_id: 1 } };
    },
  };
  return statement;
}

function applySqlDispatchingDb(fixture: FakeDbFixture): FakeDb {
  let currentRows = fixture.rows.map((row) => ({ ...row }));
  let currentAnswers = fixture.answers.map((answer) => ({ ...answer }));
  const calls: FakeCall[] = [];
  const db: FakeDb = {
    calls,
    getAnswers: () => currentAnswers,
    prepare: vi.fn((sql: string) => {
      const call: FakeCall = { sql, binds: [] };
      calls.push(call);
      const trackedStatementFor = (
        firstResult: unknown,
        allResult: unknown[],
        runHandler: (...values: unknown[]) => void = () => undefined
      ): FakeStatement => {
        const statement = statementFor(firstResult, allResult, runHandler);
        const originalBind = statement.bind;
        statement.bind = (...values: unknown[]) => {
          call.binds = values;
          return originalBind(...values);
        };
        return statement;
      };

      if (sql === "SELECT * FROM events WHERE id = ? AND presence_required = 1") {
        return trackedStatementFor(fixture.event, []);
      }
      if (sql.includes("SELECT id, title, date, response_deadline")) {
        return trackedStatementFor(
          null,
          sql.includes("-12 months") ? fixture.pastGridEvents : fixture.gridEvents
        );
      }
      if (sql === PRESENCE_MEMBER_QUERY) {
        return trackedStatementFor(null, currentRows);
      }
      if (sql.startsWith("DELETE FROM event_presences")) {
        return trackedStatementFor(null, [], (...values) => {
          const eventId = values[0];
          const userId = values[1];
          currentRows = currentRows.map((row) =>
            row.userId === userId ? { ...row, status: null, statusChangedAt: null } : row
          );
          currentAnswers = currentAnswers.filter(
            (answer) => !(answer.eventId === eventId && answer.userId === userId)
          );
        });
      }
      if (sql.startsWith("INSERT INTO event_presences")) {
        return trackedStatementFor(null, [], (...values) => {
          const eventId = values[0];
          const userId = values[1];
          const status = values[2];
          const comment = values[3];
          const existingAnswer = currentAnswers.find(
            (answer) => answer.eventId === eventId && answer.userId === userId
          );
          currentRows = currentRows.map((row) =>
            row.userId === userId
              ? {
                  ...row,
                  status: status as "present" | "absent",
                  statusChangedAt: "2026-09-03 10:00:00",
                }
              : row
          );
          currentAnswers = [
            ...currentAnswers.filter(
              (answer) => !(answer.eventId === eventId && answer.userId === userId)
            ),
            {
              eventId: eventId as number,
              userId: userId as number,
              status: status as "present" | "absent",
              comment: (comment as string | null) ?? existingAnswer?.comment ?? null,
              statusChangedAt: "2026-09-03 10:00:00",
            },
          ];
        });
      }
      if (
        sql.startsWith(
          "SELECT status, comment, status_changed_at AS statusChangedAt FROM event_presences"
        )
      ) {
        const readback = trackedStatementFor(null, []);
        readback.first = async <T>() => {
          const answer = currentAnswers.find(
            (item) => item.eventId === call.binds[0] && item.userId === call.binds[1]
          );
          return answer as T | null;
        };
        return readback;
      }
      if (sql.includes("SELECT event_id AS eventId, user_id AS userId, status, comment")) {
        return trackedStatementFor(null, currentAnswers);
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    }),
  };

  const mutableEnv = env as unknown as { DB: FakeDb };
  mutableEnv.DB = db;
  return db;
}

const event: Event = {
  id: 42,
  title: "Concert de rentrée",
  image: null,
  location: "Salle des fêtes",
  description: null,
  date: "2026-09-15",
  time: "20:30",
  price: null,
  details_link: null,
  reservation_link: null,
  is_public: 1,
  presence_required: 1,
  address: null,
  response_deadline: "2026-09-01",
  created_at: "2026-01-01 00:00:00",
};

const rows: PresenceRow[] = [
  {
    userId: 1,
    firstName: "Alice",
    lastName: "Martin",
    instrument: "Trompette",
    isPrimary: 1,
    status: "present",
    statusChangedAt: "2026-09-01 14:30:00",
  },
  {
    userId: 1,
    firstName: "Alice",
    lastName: "Martin",
    instrument: "Trombone",
    isPrimary: 0,
    status: "present",
    statusChangedAt: "2026-09-01 14:30:00",
  },
  {
    userId: 2,
    firstName: "Benoît",
    lastName: "Durand",
    instrument: "Trombone",
    isPrimary: 0,
    status: "absent",
    statusChangedAt: "2026-09-02 10:00:00",
  },
  {
    userId: 3,
    firstName: "Claire",
    lastName: "Sans",
    instrument: null,
    isPrimary: null,
    status: null,
    statusChangedAt: null,
  },
];

const fixture: FakeDbFixture = {
  event,
  rows,
  gridEvents: [
    {
      id: event.id,
      title: event.title,
      date: event.date,
      response_deadline: event.response_deadline,
    },
    {
      id: 43,
      title: "Concert d'hiver",
      date: "2026-12-15",
      response_deadline: null,
    },
  ],
  pastGridEvents: [
    {
      id: event.id,
      title: event.title,
      date: event.date,
      response_deadline: event.response_deadline,
    },
    {
      id: 43,
      title: "Concert d'hiver",
      date: "2026-12-15",
      response_deadline: null,
    },
    {
      id: 44,
      title: "Concert passé",
      date: "2026-08-01",
      response_deadline: "2026-07-30",
    },
  ],
  answers: [
    {
      eventId: event.id,
      userId: 1,
      status: "present",
      comment: "Présent confirmé",
      statusChangedAt: "2026-09-01 14:30:00",
    },
    {
      eventId: event.id,
      userId: 2,
      status: "absent",
      comment: "Blessure au poignet",
      statusChangedAt: "2026-09-02 10:00:00",
    },
    {
      eventId: 43,
      userId: 1,
      status: "absent",
      comment: null,
      statusChangedAt: "2026-09-06 14:30:00",
    },
    {
      eventId: 43,
      userId: 2,
      status: "present",
      comment: "Présent",
      statusChangedAt: "2026-09-06 14:30:00",
    },
    {
      eventId: 44,
      userId: 2,
      status: "present",
      comment: "Réponse tardive",
      statusChangedAt: "2026-08-01 14:30:00",
    },
  ],
};

describe("handleAdminPresenceApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne le refus d'authentification pour un administrateur non connecté", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
    );

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence")
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });

  it("refuse les méthodes autres que GET et POST", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", { method: "PATCH" })
    );

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Méthode non autorisée" });
  });

  it("exige explicitement le mode grille pour une requête GET", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence")
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Le paramètre grid=1 est requis." });
  });

  it("retourne exactement le nouveau contrat après une réponse présente", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 3, status: "present" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      eventId: 42,
      userId: 3,
      status: "present",
      comment: null,
      changedAfterDeadline: true,
    });
  });

  it("retourne un marqueur tardif à false quand la réponse précède l'échéance", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb({
      ...fixture,
      event: { ...event, response_deadline: "2026-09-10" },
    });

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 3, status: "present" }),
      })
    );

    expect(await response.json()).toEqual({
      success: true,
      eventId: 42,
      userId: 3,
      status: "present",
      comment: null,
      changedAfterDeadline: false,
    });
  });

  it("retourne un marqueur tardif à false quand l'événement n'a pas d'échéance", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb({
      ...fixture,
      event: { ...event, response_deadline: null },
    });

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 3, status: "present" }),
      })
    );

    expect(await response.json()).toEqual({
      success: true,
      eventId: 42,
      userId: 3,
      status: "present",
      comment: null,
      changedAfterDeadline: false,
    });
  });

  it("retourne exactement le nouveau contrat après une réponse absente", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 1, status: "absent" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      eventId: 42,
      userId: 1,
      status: "absent",
      comment: "Présent confirmé",
      changedAfterDeadline: true,
    });
  });

  it("supprime une réponse et retourne exactement le statut nul", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    const db = applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 2, status: null }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      eventId: 42,
      userId: 2,
      status: null,
      comment: null,
      changedAfterDeadline: false,
    });
    expect(db.calls.some((call) => call.sql.startsWith("DELETE FROM event_presences"))).toBe(true);
    expect(db.getAnswers().some((answer) => answer.eventId === 42 && answer.userId === 2)).toBe(
      false
    );
  });

  it("rend le nettoyage d'une réponse déjà absente idempotent", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 3, status: null }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      eventId: 42,
      userId: 3,
      status: null,
      comment: null,
      changedAfterDeadline: false,
    });
  });

  it("préserve le commentaire existant avec la variante d'upsert administrateur", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    const db = applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 2, status: "present" }),
      })
    );

    expect(response.status).toBe(200);
    expect(
      db.getAnswers().find((answer) => answer.eventId === 42 && answer.userId === 2)?.comment
    ).toBe("Blessure au poignet");
    expect(PRESENCE_UPSERT_ADMIN_SQL).toContain(
      "comment = COALESCE(excluded.comment, event_presences.comment)"
    );
  });

  it("refuse un statut qui n'est pas présent, absent ou sans réponse", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 3, status: "peut-etre" }),
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Les données de présence sont invalides.",
    });
  });

  it("refuse un musicien hors de l'effectif de référence", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb(fixture);
    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 999, status: "present" }),
      })
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Ce musicien ne fait pas partie de l'effectif de référence.",
    });
  });

  it("refuse un événement qui ne nécessite pas de présence", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb({ ...fixture, event: null });
    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 3, status: "present" }),
      })
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Événement introuvable." });
  });

  it("refuse un commentaire de plus de 1000 caractères", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({
          eventId: 42,
          userId: 3,
          status: "present",
          comment: "a".repeat(1001),
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Le commentaire ne peut pas dépasser 1000 caractères.",
    });
  });

  it("retourne la grille avec le principal et un objet complet par cellule", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    const db = applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1")
    );
    const data = (await response.json()) as {
      events: Array<{ id: number }>;
      members: Array<{
        userId: number;
        instruments: string[];
        primaryInstrument: string | null;
        answers: Record<
          string,
          {
            status: "present" | "absent" | null;
            comment: string | null;
            changedAfterDeadline: boolean;
          }
        >;
      }>;
    };

    expect(response.status).toBe(200);
    expect(data.events.map((gridEvent) => gridEvent.id)).toEqual([42, 43]);
    expect(data.members.map((member) => member.userId)).toEqual([2, 1, 3]);
    expect(data.members.find((member) => member.userId === 1)?.primaryInstrument).toBe("Trompette");
    expect(data.members.find((member) => member.userId === 2)?.primaryInstrument).toBe("Trombone");
    expect(data.members.find((member) => member.userId === 3)?.primaryInstrument).toBeNull();
    expect(data.members.find((member) => member.userId === 1)?.answers).toEqual({
      "42": { status: "present", comment: "Présent confirmé", changedAfterDeadline: false },
      "43": { status: "absent", comment: null, changedAfterDeadline: false },
    });
    expect(data.members.find((member) => member.userId === 2)?.answers).toEqual({
      "42": { status: "absent", comment: "Blessure au poignet", changedAfterDeadline: true },
      "43": { status: "present", comment: "Présent", changedAfterDeadline: false },
    });
    expect(data.members.find((member) => member.userId === 3)?.answers).toEqual({
      "42": { status: null, comment: null, changedAfterDeadline: false },
      "43": { status: null, comment: null, changedAfterDeadline: false },
    });

    const memberQuery = db.calls.find((call) => call.sql === PRESENCE_MEMBER_QUERY);
    expect(memberQuery?.sql).not.toContain("comment");
  });

  it("inclut les événements passés des douze derniers mois avec includePast=1", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    const db = applySqlDispatchingDb(fixture);
    const defaultResponse = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1")
    );
    const defaultBody = (await defaultResponse.json()) as {
      events: Array<{ title: string }>;
    };
    expect(defaultBody.events.map((item) => item.title)).toContain("Concert d'hiver");

    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    const pastResponse = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1&includePast=1")
    );
    const body = (await pastResponse.json()) as { events: Array<{ id: number }> };
    expect(body.events.map((item) => item.id)).toEqual([42, 43, 44]);
    const eventQuery = db.calls.find((call) => call.sql.includes("-12 months"));
    expect(eventQuery?.sql).toContain("date >= date('now', '-12 months')");
  });

  it("utilise json_each avec un seul paramètre pour la liste des événements", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    const db = applySqlDispatchingDb(fixture);

    await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1&includePast=1")
    );

    const answerQuery = db.calls.find((call) =>
      call.sql.includes("SELECT event_id AS eventId, user_id AS userId, status, comment")
    );
    expect(answerQuery?.sql).toContain("WHERE event_id IN (SELECT value FROM json_each(?)");
    expect(answerQuery?.sql).toContain("WHERE type = 'integer'");
    expect(answerQuery?.binds).toHaveLength(1);
    expect(answerQuery?.binds[0]).toBe(JSON.stringify([42, 43, 44]));
  });

  it("n'interroge pas les réponses lorsqu'il n'y a aucun événement", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    const db = applySqlDispatchingDb({ ...fixture, gridEvents: [], pastGridEvents: [] });

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1")
    );

    expect(response.status).toBe(200);
    expect(db.calls.some((call) => call.sql.includes("FROM event_presences"))).toBe(false);
  });
});
