import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@/db/types";
import { PRESENCE_MEMBER_QUERY, type PresenceRow } from "@/lib/presence";
import { handleAdminPresenceApi } from "../presence";
import { checkAdminAuth } from "../../admin-crud";
import { invalidateCache } from "@/lib/cache";

vi.mock("../../admin-crud", () => ({
  checkAdminAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/lib/cache", () => ({
  invalidateCache: vi.fn(),
}));

interface PresenceCommentRow {
  userId: number;
  comment: string | null;
}

interface FakeStatement {
  bind(...values: unknown[]): FakeStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { last_row_id: number } }>;
}

interface FakeDb {
  prepare: ReturnType<typeof vi.fn>;
}

interface FakeDbFixture {
  event: Event | null;
  events: Array<Pick<Event, "id" | "title" | "date" | "response_deadline" | "is_public">>;
  rows: PresenceRow[];
  comments: PresenceCommentRow[];
  gridEvents: Array<{
    id: number;
    title: string;
    date: string;
    response_deadline: string | null;
  }>;
  answers: Array<{ eventId: number; userId: number; status: "present" | "absent" }>;
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
  let currentComments = fixture.comments.map((row) => ({ ...row }));
  let currentAnswers = fixture.answers.map((row) => ({ ...row }));
  const db: FakeDb = {
    prepare: vi.fn((sql: string) => {
      if (sql === "SELECT * FROM events WHERE id = ? AND presence_required = 1") {
        return statementFor(fixture.event, []);
      }
      if (sql.includes("date >= date('now')") && !sql.includes("is_public")) {
        return statementFor(null, fixture.gridEvents);
      }
      if (sql.includes("WHERE presence_required = 1")) {
        return statementFor(null, fixture.events);
      }
      if (sql === PRESENCE_MEMBER_QUERY) {
        return statementFor(null, currentRows);
      }
      if (sql.startsWith("SELECT user_id AS userId, comment")) {
        return statementFor(null, currentComments);
      }
      if (sql.startsWith("DELETE FROM event_presences")) {
        return statementFor(null, [], (...values) => {
          const userId = values[1];
          currentRows = currentRows.map((row) =>
            row.userId === userId ? { ...row, status: null, statusChangedAt: null } : row
          );
          currentComments = currentComments.filter((row) => row.userId !== userId);
          currentAnswers = currentAnswers.filter(
            (answer) => !(answer.eventId === values[0] && answer.userId === userId)
          );
        });
      }
      if (sql.startsWith("INSERT INTO event_presences")) {
        return statementFor(null, [], (...values) => {
          const eventId = values[0];
          const userId = values[1];
          const status = values[2];
          const comment = values[3];
          currentRows = currentRows.map((row) =>
            row.userId === userId
              ? {
                  ...row,
                  status: status as "present" | "absent",
                  statusChangedAt: "2026-09-03 10:00:00",
                }
              : row
          );
          currentComments = [
            ...currentComments.filter((row) => row.userId !== userId),
            { userId: userId as number, comment: comment as string | null },
          ];
          currentAnswers = [
            ...currentAnswers.filter(
              (answer) => !(answer.eventId === eventId && answer.userId === userId)
            ),
            {
              eventId: eventId as number,
              userId: userId as number,
              status: status as "present" | "absent",
            },
          ];
        });
      }
      if (sql.includes("SELECT event_id AS eventId, user_id AS userId, status")) {
        return statementFor(null, currentAnswers);
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
    status: "present",
    statusChangedAt: "2026-09-01 14:30:00",
  },
  {
    userId: 1,
    firstName: "Alice",
    lastName: "Martin",
    instrument: "Trombone",
    status: "present",
    statusChangedAt: "2026-09-01 14:30:00",
  },
  {
    userId: 2,
    firstName: "Benoît",
    lastName: "Durand",
    instrument: "Trombone",
    status: "absent",
    statusChangedAt: "2026-09-02 10:00:00",
  },
  {
    userId: 3,
    firstName: "Claire",
    lastName: "Sans",
    instrument: null,
    status: null,
    statusChangedAt: null,
  },
];

const fixture: FakeDbFixture = {
  event,
  events: [
    {
      id: event.id,
      title: event.title,
      date: event.date,
      response_deadline: event.response_deadline,
      is_public: event.is_public,
    },
  ],
  rows,
  comments: [{ userId: 2, comment: "Blessure au poignet" }],
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
  answers: [
    { eventId: event.id, userId: 1, status: "present" },
    { eventId: 43, userId: 1, status: "absent" },
    { eventId: 43, userId: 2, status: "present" },
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

  it("retourne la liste des événements nécessitant une présence", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(fixture.events);
  });

  it("retourne une erreur française pour un événement inconnu", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb({ ...fixture, event: null });

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?eventId=999")
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Événement introuvable." });
  });

  it("compte un musicien multi-instrument une fois au global et dans chaque pupitre", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?eventId=42")
    );
    const data = (await response.json()) as {
      event: Event;
      totalMembers: number;
      present: number;
      absent: number;
      noAnswer: number;
      responseRate: number;
      byInstrument: Array<{
        instrument: string;
        present: number;
        absent: number;
        noAnswer: number;
      }>;
    };

    expect(data.event).toEqual(event);
    expect(data.totalMembers).toBe(3);
    expect(data.present).toBe(1);
    expect(data.absent).toBe(1);
    expect(data.noAnswer).toBe(1);
    expect(data.responseRate).toBe(2 / 3);
    expect(data.byInstrument).toEqual(
      [
        { instrument: "Trombone", present: 1, absent: 1, noAnswer: 0 },
        { instrument: "Trompette", present: 1, absent: 0, noAnswer: 0 },
        { instrument: "Sans pupitre renseigné", present: 0, absent: 0, noAnswer: 1 },
      ].map((expected) => expect.objectContaining(expected))
    );
  });

  it("ajoute les commentaires, le membre sans pupitre et la liste de relance", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?eventId=42")
    );
    const data = (await response.json()) as {
      byInstrument: Array<{ instrument: string; members: Array<{ userId: number }> }>;
      nonResponders: Array<{ userId: number; instruments: string[]; comment: string | null }>;
      nonRespondersText: string;
    };

    const withoutInstrument = data.byInstrument.find(
      (breakdown) => breakdown.instrument === "Sans pupitre renseigné"
    );
    expect(withoutInstrument?.members.map((member) => member.userId)).toEqual([3]);
    expect(data.nonResponders).toEqual([
      expect.objectContaining({ userId: 3, instruments: [], comment: null }),
    ]);
    expect(data.nonRespondersText).toBe("Claire Sans");
  });

  it("signale les réponses après la date limite mais pas celles du jour limite", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?eventId=42")
    );
    const data = (await response.json()) as {
      lateChanges: Array<{ userId: number; comment: string | null }>;
    };

    expect(data.lateChanges).toEqual([
      expect.objectContaining({ userId: 2, comment: "Blessure au poignet" }),
    ]);
  });

  it("enregistre une réponse administrativement et renvoie le récapitulatif recalculé", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValue(null);
    applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({
          eventId: 42,
          userId: 3,
          status: "present",
          comment: "Saisi par l'administration",
        }),
      })
    );
    const data = (await response.json()) as {
      event: Event;
      present: number;
      noAnswer: number;
      nonResponders: Array<{ userId: number }>;
    };

    expect(response.status).toBe(200);
    expect(data.event).toEqual(event);
    expect(data.present).toBe(2);
    expect(data.noAnswer).toBe(0);
    expect(data.nonResponders).toEqual([]);
    expect(invalidateCache).not.toHaveBeenCalled();
  });

  it("supprime une réponse administrative et remet le membre sans réponse", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValue(null);
    applySqlDispatchingDb(fixture);

    await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 3, status: "present" }),
      })
    );
    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", {
        method: "POST",
        body: JSON.stringify({ eventId: 42, userId: 3, status: null }),
      })
    );
    const data = (await response.json()) as {
      noAnswer: number;
      nonResponders: Array<{ userId: number }>;
    };

    expect(response.status).toBe(200);
    expect(data.noAnswer).toBe(1);
    expect(data.nonResponders).toEqual([expect.objectContaining({ userId: 3 })]);
    expect(invalidateCache).not.toHaveBeenCalled();
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
    expect(await response.json()).toEqual({ error: "Les données de présence sont invalides." });
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

  it("retourne le tableau croisé avec une réponse par événement et par membre", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);
    applySqlDispatchingDb(fixture);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence?grid=1")
    );
    const data = (await response.json()) as {
      events: Array<{ id: number }>;
      members: Array<{
        userId: number;
        instruments: string[];
        answers: Record<string, "present" | "absent" | null>;
      }>;
    };

    expect(response.status).toBe(200);
    expect(data.events.map((gridEvent) => gridEvent.id)).toEqual([42, 43]);
    expect(data.members.map((member) => member.userId)).toEqual([2, 1, 3]);
    expect(data.members.filter((member) => member.userId === 1)).toHaveLength(1);
    expect(data.members.find((member) => member.userId === 1)?.instruments).toEqual([
      "Trombone",
      "Trompette",
    ]);
    for (const member of data.members) {
      expect(Object.keys(member.answers)).toEqual(["42", "43"]);
    }
    expect(data.members.find((member) => member.userId === 3)?.answers).toEqual({
      "42": null,
      "43": null,
    });
  });
});
