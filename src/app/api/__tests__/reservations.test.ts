// @vitest-environment node
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleReservationSubmission } from "../reservations";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getRequestLogContext: vi.fn(() => ({})),
}));

const originalDb = env.DB;
const originalApiKey = env.RESEND_API_KEY;

interface SqliteStatement {
  bind(...values: Array<string | number | null>): SqliteStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
}

function createD1Database(database: DatabaseSync): { prepare: (sql: string) => SqliteStatement } {
  return {
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
  const migration = readFileSync("migrations/0015_create_free_reservations.sql", "utf8");
  database.exec(migration);
  return database;
}

function request(body: unknown, method = "POST"): Request {
  return new Request("https://test.local/api/reservations", {
    method,
    headers: { "Content-Type": "application/json" },
    body: method === "GET" ? undefined : JSON.stringify(body),
  });
}

function validReservation(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    eventSlug: "rencontre-harmonies-2026",
    lastName: "Dupont",
    firstName: "Camille",
    email: "camille@example.test",
    partySize: 2,
    interests: ["harmonie-sucy"],
    source: "affiche",
    newsletterOptIn: true,
    website: "",
    ...overrides,
  };
}

describe("handleReservationSubmission", () => {
  let database: DatabaseSync;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    database = createDatabase();
    Object.assign(env, { DB: createD1Database(database), RESEND_API_KEY: "test-key" });
    fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "mail-id" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb, RESEND_API_KEY: originalApiKey });
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("enregistre la réservation et envoie une confirmation avec l'adresse de réponse", async () => {
    const response = await handleReservationSubmission(request(validReservation()));
    const row = database.prepare("SELECT * FROM free_reservations").get() as {
      email_normalized: string;
      newsletter_opt_in: number;
      consent_text_version: string;
      confirmation_sent_at: string | null;
    };
    const emailPayload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<
      string,
      unknown
    >;

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, partySize: 2 });
    expect(row.email_normalized).toBe("camille@example.test");
    expect(row.newsletter_opt_in).toBe(1);
    expect(row.consent_text_version).toBe("2026-10-15");
    expect(row.confirmation_sent_at).not.toBeNull();
    expect(emailPayload.reply_to).toBe("contact@amis-harmonie-sucy.fr");
  });

  it.each([
    [{ partySize: 0 }, "partySize"],
    [{ partySize: 11 }, "partySize"],
    [{ email: "adresse-invalide" }, "email"],
    [{ interests: ["code-inconnu"] }, "interests"],
  ])("refuse les valeurs invalides %#", async (changes, field) => {
    const response = await handleReservationSubmission(request(validReservation(changes)));
    const body = (await response.json()) as { fields: Record<string, string> };
    expect(response.status).toBe(400);
    expect(body.fields[field]).toBeTruthy();
    expect(database.prepare("SELECT COUNT(*) AS count FROM free_reservations").get()).toEqual({
      count: 0,
    });
  });

  it("refuse un événement inconnu", async () => {
    const response = await handleReservationSubmission(
      request(validReservation({ eventSlug: "inconnu" }))
    );
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse un doublon même si la casse de l'adresse diffère", async () => {
    await handleReservationSubmission(request(validReservation()));
    const response = await handleReservationSubmission(
      request(validReservation({ email: "CAMILLE@EXAMPLE.TEST" }))
    );
    expect(response.status).toBe(409);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("réactive une réservation annulée en remplaçant ses données", async () => {
    database
      .prepare(
        `INSERT INTO free_reservations (event_slug, last_name, first_name, email, email_normalized,
       party_size, status) VALUES (?, ?, ?, ?, ?, ?, 'cancelled')`
      )
      .run(
        "rencontre-harmonies-2026",
        "Ancien",
        "Prénom",
        "camille@example.test",
        "camille@example.test",
        1
      );
    const response = await handleReservationSubmission(request(validReservation({ partySize: 3 })));
    const row = database
      .prepare("SELECT status, last_name, party_size FROM free_reservations")
      .get();
    expect(response.status).toBe(201);
    expect(row).toEqual({ status: "active", last_name: "Dupont", party_size: 3 });
    expect(database.prepare("SELECT COUNT(*) AS count FROM free_reservations").get()).toEqual({
      count: 1,
    });
  });

  it("absorbe un formulaire rempli dans le champ piège sans enregistrer ni envoyer", async () => {
    const response = await handleReservationSubmission(
      request(validReservation({ website: "robot" }))
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ success: true, partySize: 2 });
    expect(database.prepare("SELECT COUNT(*) AS count FROM free_reservations").get()).toEqual({
      count: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuse les réservations après la clôture", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-15T12:00:00+01:00"));
    const response = await handleReservationSubmission(request(validReservation()));
    expect(response.status).toBe(410);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("conserve la réservation même si Resend échoue", async () => {
    fetchMock.mockResolvedValueOnce(new Response("contenu privé", { status: 422 }));
    const response = await handleReservationSubmission(request(validReservation()));
    const row = database.prepare("SELECT confirmation_error FROM free_reservations").get() as {
      confirmation_error: string;
    };
    expect(response.status).toBe(201);
    expect(row.confirmation_error).toBe("http_422");
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(
      "camille@example.test"
    );
  });

  it("ne transmet jamais l'adresse e-mail au logger", async () => {
    await handleReservationSubmission(request(validReservation()));
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(
      "camille@example.test"
    );
  });

  it("répond 400 pour un JSON mal formé et 405 pour une autre méthode", async () => {
    const malformed = await handleReservationSubmission(
      new Request("https://test.local/api/reservations", { method: "POST", body: "{" })
    );
    const wrongMethod = await handleReservationSubmission(request({}, "GET"));
    expect(malformed.status).toBe(400);
    expect(wrongMethod.status).toBe(405);
  });
});
