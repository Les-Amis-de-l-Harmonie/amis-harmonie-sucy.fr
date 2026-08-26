import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "@/db/types";
import { PRESENCE_MEMBER_QUERY, type PresenceRow } from "@/lib/presence";
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

interface PresenceCommentRow {
  userId: number;
  comment: string | null;
}

interface FakeStatement {
  bind(...values: unknown[]): FakeStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
}

interface FakeDb {
  prepare: ReturnType<typeof vi.fn>;
}

interface FakeDbFixture {
  event: Event | null;
  events: Array<Pick<Event, "id" | "title" | "date" | "response_deadline" | "is_public">>;
  rows: PresenceRow[];
  comments: PresenceCommentRow[];
}

function statementFor(firstResult: unknown, allResult: unknown[]): FakeStatement {
  const statement: FakeStatement = {
    bind: (..._values: unknown[]) => statement,
    first: async <T>() => firstResult as T | null,
    all: async <T>() => ({ results: allResult as T[] }),
  };
  return statement;
}

function applySqlDispatchingDb(fixture: FakeDbFixture): FakeDb {
  const db: FakeDb = {
    prepare: vi.fn((sql: string) => {
      if (sql === "SELECT * FROM events WHERE id = ? AND presence_required = 1") {
        return statementFor(fixture.event, []);
      }
      if (sql.includes("WHERE presence_required = 1")) {
        return statementFor(null, fixture.events);
      }
      if (sql === PRESENCE_MEMBER_QUERY) {
        return statementFor(null, fixture.rows);
      }
      if (sql.startsWith("SELECT user_id AS userId, comment")) {
        return statementFor(null, fixture.comments);
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

  it("refuse les méthodes autres que GET", async () => {
    vi.mocked(checkAdminAuth).mockResolvedValueOnce(null);

    const response = await handleAdminPresenceApi(
      new Request("https://test.local/api/admin/presence", { method: "POST" })
    );

    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Method not allowed" });
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
});
