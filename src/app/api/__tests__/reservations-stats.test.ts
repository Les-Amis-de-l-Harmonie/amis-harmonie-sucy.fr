// @vitest-environment node
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleReservationStatsApi } from "../reservations-stats";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getRequestLogContext: vi.fn(() => ({})),
}));

const originalDb = env.DB;
const originalStatsToken = env.RESERVATIONS_STATS_TOKEN;

interface SqliteStatement {
  bind(...values: Array<string | number | null>): SqliteStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
}

function createD1Database(database: DatabaseSync): {
  prepare: (sql: string) => SqliteStatement;
  batch: (statements: SqliteStatement[]) => Promise<unknown>;
} {
  return {
    async batch(statements) {
      for (const statement of statements) await statement.run();
      return [];
    },
    prepare(sql: string): SqliteStatement {
      let values: Array<string | number | null> = [];
      const statement: SqliteStatement = {
        bind(...boundValues) {
          values = boundValues;
          return statement;
        },
        async first<T>() {
          return (database.prepare(sql).get(...values) as T | undefined) ?? null;
        },
        async all<T>() {
          return { results: database.prepare(sql).all(...values) as T[] };
        },
        async run() {
          const result = database.prepare(sql).run(...values);
          return {
            meta: {
              changes: Number(result.changes),
              last_row_id: Number(result.lastInsertRowid),
            },
          };
        },
      };
      return statement;
    },
  };
}

function createDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync("migrations/0015_create_free_reservations.sql", "utf8"));
  return database;
}

function statsRequest(query = "", method = "GET"): Request {
  return new Request(`https://test.local/api/reservations/stats${query}`, { method });
}

function insertReservation(
  database: DatabaseSync,
  input: {
    lastName?: string;
    firstName?: string;
    email?: string;
    partySize?: number;
    interests?: string[];
    source?: string | null;
    newsletter?: boolean;
    confirmationSentAt?: string | null;
    confirmationError?: string | null;
    status?: "active" | "cancelled";
    origin?: "web" | "admin";
    createdAt?: string;
  } = {}
): void {
  database
    .prepare(
      `INSERT INTO free_reservations (
        event_slug, last_name, first_name, email, email_normalized, party_size, interests, source,
        newsletter_opt_in, confirmation_sent_at, confirmation_error, status, origin, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "rencontre-harmonies-2026",
      input.lastName ?? "NomConfidentiel",
      input.firstName ?? "PrenomConfidentiel",
      input.email ?? "confidentiel@example.test",
      (input.email ?? "confidentiel@example.test").toLowerCase(),
      input.partySize ?? 2,
      JSON.stringify(input.interests ?? ["harmonie-sucy"]),
      input.source ?? "affiche",
      input.newsletter ? 1 : 0,
      input.confirmationSentAt ?? null,
      input.confirmationError ?? null,
      input.status ?? "active",
      input.origin ?? "web",
      input.createdAt ?? "2026-10-21 10:00:00"
    );
}

describe("handleReservationStatsApi", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    vi.clearAllMocks();
    database = createDatabase();
    Object.assign(env, {
      DB: createD1Database(database),
      RESERVATIONS_STATS_TOKEN: "test-only-secret",
    });
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb, RESERVATIONS_STATS_TOKEN: originalStatsToken });
  });

  it("masque l'endpoint si le secret Worker n'est pas configuré", async () => {
    Object.assign(env, { RESERVATIONS_STATS_TOKEN: undefined });
    const response = await handleReservationStatsApi(statsRequest("?token=test-only-secret"));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Introuvable." });
  });

  it("masque l'endpoint si le jeton manque ou est incorrect", async () => {
    for (const query of ["", "?token=incorrect"]) {
      const response = await handleReservationStatsApi(statsRequest(query));
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Introuvable." });
    }
  });

  it("retourne les statistiques sans données personnelles avec les en-têtes requis", async () => {
    insertReservation(database, {
      lastName: "NomConfidentiel",
      firstName: "PrenomConfidentiel",
      email: "confidentiel@example.test",
      partySize: 3,
      newsletter: true,
      confirmationSentAt: "2026-10-21T10:00:00.000Z",
    });
    insertReservation(database, {
      email: "annulee@example.test",
      partySize: 4,
      status: "cancelled",
    });

    const response = await handleReservationStatsApi(statsRequest("?token=test-only-secret"));
    const text = await response.text();
    const body = JSON.parse(text) as {
      totals: { reservations: number; places: number; cancelledReservations: number };
      newsletter: { optIns: number };
    };

    expect(response.status).toBe(200);
    expect(body.totals).toMatchObject({ reservations: 1, places: 3, cancelledReservations: 1 });
    expect(body.newsletter.optIns).toBe(1);
    expect(response.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(text).toContain('\n  "event"');
    expect(text).not.toContain("confidentiel@example.test");
    expect(text).not.toContain("NomConfidentiel");
    expect(text).not.toContain("PrenomConfidentiel");
  });

  it("refuse une méthode autre que GET ou HEAD après validation du jeton", async () => {
    const response = await handleReservationStatsApi(
      statsRequest("?token=test-only-secret", "POST")
    );
    expect(response.status).toBe(405);
    expect(await response.json()).toEqual({ error: "Méthode non autorisée." });
  });

  it("renvoie une erreur dédiée pour un événement inconnu après validation du jeton", async () => {
    const response = await handleReservationStatsApi(
      statsRequest("?token=test-only-secret&event=inconnu")
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Événement introuvable." });
  });
});
