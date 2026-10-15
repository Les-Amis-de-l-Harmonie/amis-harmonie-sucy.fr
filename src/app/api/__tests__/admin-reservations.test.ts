// @vitest-environment node
import { readFileSync } from "node:fs";
import { Buffer } from "node:buffer";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleReservationsAdminApi } from "../admin/reservations";
import { verifySession } from "../auth";

vi.mock("../auth", () => ({ verifySession: vi.fn() }));
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

function adminRequest(path: string, method = "GET", body?: unknown): Request {
  return new Request(`https://test.local/api/admin/reservations${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function insertReservation(
  database: DatabaseSync,
  input: {
    lastName?: string | null;
    firstName?: string | null;
    email?: string | null;
    partySize?: number;
    interests?: string[];
    source?: string | null;
    newsletter?: boolean;
    status?: "active" | "cancelled";
    consentAt?: string | null;
    unsubscribedAt?: string | null;
  } = {}
): number {
  const email = input.email ?? null;
  const result = database
    .prepare(
      `INSERT INTO free_reservations (event_slug, last_name, first_name, email, email_normalized,
     party_size, interests, source, newsletter_opt_in, newsletter_consent_at, status, unsubscribed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      "rencontre-harmonies-2026",
      input.lastName ?? "Dupont",
      input.firstName ?? "Camille",
      email,
      email?.toLowerCase() ?? null,
      input.partySize ?? 2,
      JSON.stringify(input.interests ?? []),
      input.source ?? null,
      input.newsletter ? 1 : 0,
      input.consentAt ?? null,
      input.status ?? "active",
      input.unsubscribedAt ?? null
    );
  return Number(result.lastInsertRowid);
}

describe("handleReservationsAdminApi", () => {
  let database: DatabaseSync;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    database = createDatabase();
    Object.assign(env, { DB: createD1Database(database), RESEND_API_KEY: "test-key" });
    vi.mocked(verifySession).mockResolvedValue({
      id: 1,
      email: "admin@example.test",
      role: "ADMIN",
      is_active: 1,
      last_login: null,
      created_at: "2026-01-01",
      sessionId: "session-test",
    });
    fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ id: "mail-id" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb, RESEND_API_KEY: originalApiKey });
    vi.unstubAllGlobals();
  });

  it("refuse l'accès sans authentification et ne met pas la réponse en cache", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(null);
    const response = await handleReservationsAdminApi(
      adminRequest("?eventSlug=rencontre-harmonies-2026")
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("calcule les statistiques sur les actives et exclut les annulées", async () => {
    insertReservation(database, {
      email: "une@example.test",
      partySize: 2,
      interests: ["harmonie-sucy"],
      source: "affiche",
      newsletter: true,
      consentAt: "2026-10-15T10:00:00.000Z",
    });
    insertReservation(database, {
      email: "deux@example.test",
      partySize: 3,
      interests: ["harmonie-sucy", "villecresnes"],
      status: "cancelled",
    });
    const response = await handleReservationsAdminApi(
      adminRequest("?eventSlug=rencontre-harmonies-2026")
    );
    const body = (await response.json()) as {
      stats: Record<string, unknown>;
      reservations: unknown[];
    };
    expect(body.stats).toMatchObject({
      reservations: 1,
      places: 2,
      newsletterOptIns: 1,
      cancelled: 1,
    });
    expect(body.stats.byInterest).toMatchObject({
      "harmonie-sucy": { reservations: 1, places: 2 },
      villecresnes: { reservations: 0, places: 0 },
    });
    expect(body.stats.bySource).toMatchObject({
      affiche: { reservations: 1, places: 2 },
      none: { reservations: 0, places: 0 },
      ville: { reservations: 0, places: 0 },
    });
    expect(body.reservations).toHaveLength(2);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("annule une réservation par PATCH", async () => {
    const id = insertReservation(database, { email: "une@example.test" });
    const response = await handleReservationsAdminApi(
      adminRequest(`?id=${id}`, "PATCH", { status: "cancelled" })
    );
    expect(response.status).toBe(200);
    expect(database.prepare("SELECT status FROM free_reservations WHERE id = ?").get(id)).toEqual({
      status: "cancelled",
    });
  });

  it("ne désinscrit pas une ligne qui n'était pas abonnée", async () => {
    const id = insertReservation(database, { email: "sans-consentement@example.test" });
    const response = await handleReservationsAdminApi(
      adminRequest(`?id=${id}`, "PATCH", { newsletterOptIn: false })
    );
    expect(response.status).toBe(200);
    expect(
      database
        .prepare("SELECT newsletter_opt_in, unsubscribed_at FROM free_reservations WHERE id = ?")
        .get(id)
    ).toEqual({ newsletter_opt_in: 0, unsubscribed_at: null });

    const optedInId = insertReservation(database, {
      email: "abonne@example.test",
      newsletter: true,
      consentAt: "2026-10-15",
    });
    await handleReservationsAdminApi(
      adminRequest(`?id=${optedInId}`, "PATCH", { newsletterOptIn: false })
    );
    const optedOut = database
      .prepare("SELECT newsletter_opt_in, unsubscribed_at FROM free_reservations WHERE id = ?")
      .get(optedInId) as { newsletter_opt_in: number; unsubscribed_at: string | null };
    expect(optedOut.newsletter_opt_in).toBe(0);
    expect(optedOut.unsubscribed_at).not.toBeNull();
  });

  it("refuse de modifier les coordonnées d'une réservation anonymisée", async () => {
    const id = insertReservation(database, { email: "anonymisee@example.test" });
    database
      .prepare(
        "UPDATE free_reservations SET email = NULL, email_normalized = NULL, last_name = NULL, first_name = NULL, anonymized_at = datetime('now') WHERE id = ?"
      )
      .run(id);

    for (const patch of [
      { email: "nouvelle@example.test" },
      { lastName: "Nouveau" },
      { firstName: "Nouveau" },
    ]) {
      const response = await handleReservationsAdminApi(adminRequest(`?id=${id}`, "PATCH", patch));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error:
          "Cette réservation a été anonymisée : ses coordonnées ne peuvent plus être modifiées.",
      });
    }
  });

  it("crée manuellement une réservation sans adresse e-mail", async () => {
    const response = await handleReservationsAdminApi(
      adminRequest("", "POST", {
        eventSlug: "rencontre-harmonies-2026",
        lastName: "Martin",
        firstName: "Léa",
        partySize: 4,
      })
    );
    const body = (await response.json()) as { id: number };
    const row = database
      .prepare("SELECT origin, email, party_size FROM free_reservations WHERE id = ?")
      .get(body.id);
    expect(response.status).toBe(201);
    expect(row).toEqual({ origin: "admin", email: null, party_size: 4 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("indique qu'une réservation annulée doit être réactivée avant une nouvelle création", async () => {
    insertReservation(database, { email: "annulee@example.test", status: "cancelled" });
    const response = await handleReservationsAdminApi(
      adminRequest("", "POST", {
        eventSlug: "rencontre-harmonies-2026",
        lastName: "Martin",
        firstName: "Léa",
        email: "annulee@example.test",
        partySize: 1,
      })
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error:
        "Une réservation annulée existe déjà avec cette adresse : réactivez-la depuis la liste.",
    });
  });

  it("refuse de renvoyer la confirmation d'une réservation annulée ou sans e-mail", async () => {
    const cancelledId = insertReservation(database, {
      email: "annulee@example.test",
      status: "cancelled",
    });
    const noEmailId = insertReservation(database, { email: null });
    const cancelled = await handleReservationsAdminApi(
      adminRequest(`?action=resend&id=${cancelledId}`, "POST")
    );
    const noEmail = await handleReservationsAdminApi(
      adminRequest(`?action=resend&id=${noEmailId}`, "POST")
    );
    expect(cancelled.status).toBe(400);
    expect(noEmail.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("exporte les participants avec BOM, séparateur français, tri et protection contre les formules", async () => {
    insertReservation(database, { lastName: "Éclair", firstName: "Zoe", email: "e@example.test" });
    insertReservation(database, {
      lastName: "=Formule",
      firstName: "Alice",
      email: "f@example.test",
    });
    insertReservation(database, {
      lastName: "Abeille",
      firstName: "Élodie",
      email: "a@example.test",
    });
    const response = await handleReservationsAdminApi(
      adminRequest("?action=export&type=attendees&eventSlug=rencontre-harmonies-2026")
    );
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = Buffer.from(bytes.slice(3)).toString("utf8");
    expect(text).toContain("Nom;Prénom;Places;Présent");
    expect(text).toContain("'=Formule");
    expect(text.indexOf("Abeille")).toBeLessThan(text.indexOf("Éclair"));
    expect(response.headers.get("Content-Disposition")).toContain("attachment; filename=");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("exporte les seuls contacts newsletter consentis et non désinscrits", async () => {
    insertReservation(database, {
      lastName: "Oui",
      firstName: "Alice",
      email: "oui@example.test",
      newsletter: true,
      consentAt: "2026-10-15",
    });
    insertReservation(database, {
      lastName: "Non",
      firstName: "Bob",
      email: "non@example.test",
      newsletter: true,
      unsubscribedAt: "2026-10-16",
    });
    const response = await handleReservationsAdminApi(
      adminRequest("?action=export&type=newsletter&eventSlug=rencontre-harmonies-2026")
    );
    const text = await response.text();
    expect(text).toContain("Email Address,First Name,Last Name,Consent Date");
    expect(text).toContain("oui@example.test");
    expect(text).not.toContain("non@example.test");
    expect(text.charCodeAt(0)).not.toBe(0xfeff);
  });

  it("anonymise en simulation puis réellement, conserve les opt-ins et libère l'index unique", async () => {
    const firstId = insertReservation(database, {
      lastName: "À anonymiser",
      email: "meme@example.test",
      newsletter: false,
    });
    database
      .prepare("UPDATE free_reservations SET confirmation_error = 'http_422' WHERE id = ?")
      .run(firstId);
    insertReservation(database, {
      lastName: "À conserver",
      email: "consentement@example.test",
      newsletter: true,
      consentAt: "2026-10-15",
    });
    const dryRun = await handleReservationsAdminApi(
      adminRequest("?action=anonymize&eventSlug=rencontre-harmonies-2026&dryRun=1", "POST")
    );
    expect(await dryRun.json()).toEqual({ success: true, count: 1 });
    expect(
      database.prepare("SELECT email FROM free_reservations WHERE id = ?").get(firstId)
    ).toEqual({
      email: "meme@example.test",
    });

    const actual = await handleReservationsAdminApi(
      adminRequest("?action=anonymize&eventSlug=rencontre-harmonies-2026", "POST")
    );
    expect(await actual.json()).toEqual({ success: true, anonymized: 1 });
    const anonymous = database
      .prepare(
        "SELECT email, email_normalized, newsletter_opt_in, confirmation_error, anonymized_at FROM free_reservations WHERE id = ?"
      )
      .get(firstId);
    expect(anonymous).toMatchObject({
      email: null,
      email_normalized: null,
      newsletter_opt_in: 0,
      confirmation_error: null,
    });
    expect(anonymous).toHaveProperty("anonymized_at");
    const afterAnonymize = await handleReservationsAdminApi(
      adminRequest("?eventSlug=rencontre-harmonies-2026")
    );
    const afterAnonymizeBody = (await afterAnonymize.json()) as {
      stats: Record<string, unknown>;
    };
    expect(afterAnonymizeBody.stats).toMatchObject({
      reservations: 2,
      places: 4,
      confirmationErrors: 0,
    });

    const makeSameEmail = () =>
      handleReservationsAdminApi(
        adminRequest("", "POST", {
          eventSlug: "rencontre-harmonies-2026",
          lastName: "Martin",
          firstName: "Camille",
          email: "meme@example.test",
          partySize: 1,
        })
      );
    const second = await makeSameEmail();
    expect(second.status).toBe(201);
    const secondId = Number(((await second.json()) as { id: number }).id);
    await handleReservationsAdminApi(
      adminRequest(`?id=${secondId}`, "PATCH", { newsletterOptIn: false })
    );
    await handleReservationsAdminApi(
      adminRequest("?action=anonymize&eventSlug=rencontre-harmonies-2026", "POST")
    );
    expect((await makeSameEmail()).status).toBe(201);

    const optedIn = database
      .prepare(
        "SELECT newsletter_opt_in, newsletter_consent_at FROM free_reservations WHERE email = ?"
      )
      .get("consentement@example.test");
    expect(optedIn).toEqual({ newsletter_opt_in: 1, newsletter_consent_at: "2026-10-15" });
  });

  it("applique l'index unique partiel et laisse réutiliser une adresse après anonymisation", () => {
    insertReservation(database, { email: "unique@example.test" });
    expect(() => insertReservation(database, { email: "unique@example.test" })).toThrow(/UNIQUE/i);
    database
      .prepare("UPDATE free_reservations SET anonymized_at = datetime('now') WHERE email = ?")
      .run("unique@example.test");
    const secondId = insertReservation(database, { email: "unique@example.test" });
    database
      .prepare("UPDATE free_reservations SET anonymized_at = datetime('now') WHERE id = ?")
      .run(secondId);
    expect(() => insertReservation(database, { email: "unique@example.test" })).not.toThrow();
  });
});
