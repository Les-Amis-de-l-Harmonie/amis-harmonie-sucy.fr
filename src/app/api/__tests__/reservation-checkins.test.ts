// @vitest-environment node
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { handleReservationCheckinsApi } from "../admin/reservation-checkins";
import { verifySession } from "../auth";
import { RENCONTRE_HARMONIES_2026 } from "@/lib/free-events/rencontre-harmonies-2026";
import { createD1Database } from "./d1-adapter";

vi.mock("../auth", () => ({ verifySession: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  getRequestLogContext: vi.fn(() => ({})),
}));

const originalDb = env.DB;
const eventSlug = "rencontre-harmonies-2026";

function createDatabase(): DatabaseSync {
  const database = new DatabaseSync(":memory:");
  database.exec(readFileSync("migrations/0015_create_free_reservations.sql", "utf8"));
  database.exec(readFileSync("migrations/0016_create_free_reservation_checkins.sql", "utf8"));
  return database;
}

function request(path = "", method = "GET", body?: unknown): Request {
  return new Request(`https://test.local/api/admin/reservations/checkins${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function addReservation(
  database: DatabaseSync,
  options: {
    eventSlug?: string;
    email?: string;
    status?: "active" | "cancelled";
    partySize?: number;
    anonymized?: boolean;
  } = {}
): number {
  const idResult = database
    .prepare("SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM free_reservations")
    .get() as { next_id: number };
  const email = options.email ?? `camille-${idResult.next_id}@example.test`;
  const result = database
    .prepare(
      `INSERT INTO free_reservations (
        event_slug, last_name, first_name, email, email_normalized, party_size, interests, status,
        anonymized_at
      ) VALUES (?, 'Dupont', 'Camille', ?, ?, ?, '[]', ?, ?)`
    )
    .run(
      options.eventSlug ?? eventSlug,
      email,
      email,
      options.partySize ?? 2,
      options.status ?? "active",
      options.anonymized ? "2026-11-15T00:00:00Z" : null
    );
  return Number(result.lastInsertRowid);
}

function addCheckin(
  database: DatabaseSync,
  input: { reservationId: number | null; delta: number; opId: string; event?: string }
): void {
  database
    .prepare(
      `INSERT INTO free_reservation_checkins (event_slug, reservation_id, delta, op_id, operator)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      input.event ?? eventSlug,
      input.reservationId,
      input.delta,
      input.opId,
      "admin@example.test"
    );
}

function reservationBody(
  reservationId: number,
  from: number,
  to: number,
  opId = "reservation-op-1"
) {
  return { kind: "reservation", eventSlug, reservationId, from, to, opId };
}

describe("handleReservationCheckinsApi", () => {
  let database: DatabaseSync;

  beforeEach(() => {
    vi.clearAllMocks();
    database = createDatabase();
    Object.assign(env, { DB: createD1Database(database) });
    vi.mocked(verifySession).mockResolvedValue({
      id: 1,
      email: "admin@example.test",
      role: "ADMIN",
      is_active: 1,
      last_login: null,
      created_at: "2026-01-01",
      sessionId: "session-test",
    });
  });

  afterEach(() => {
    database.close();
    Object.assign(env, { DB: originalDb });
  });

  it("refuse l'accès sans session administrateur", async () => {
    vi.mocked(verifySession).mockResolvedValueOnce(null);
    const response = await handleReservationCheckinsApi(request(`?eventSlug=${eventSlug}`));
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("renvoie la liste et les totaux, y compris les réservations annulées et les entrées libres", async () => {
    const activeId = addReservation(database, { partySize: 2 });
    const cancelledId = addReservation(database, { status: "cancelled", partySize: 4 });
    addReservation(database, { anonymized: true });
    addCheckin(database, { reservationId: activeId, delta: 1, opId: "get-active-1" });
    addCheckin(database, { reservationId: activeId, delta: 1, opId: "get-active-2" });
    addCheckin(database, { reservationId: cancelledId, delta: 2, opId: "get-cancelled" });
    addCheckin(database, { reservationId: null, delta: 3, opId: "get-walkin" });

    const response = await handleReservationCheckinsApi(request(`?eventSlug=${eventSlug}`));
    const payload = (await response.json()) as {
      event: { slug: string; title: string; capacity: number | null };
      reservations: Array<{
        id: number;
        status: string;
        email: string;
        checkedIn: number;
        history: unknown[];
      }>;
      totals: Record<string, number>;
      serverTime: string;
    };
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(payload.event).toMatchObject({
      slug: eventSlug,
      title: "Rencontre d'Harmonies",
      capacity: RENCONTRE_HARMONIES_2026.venueCapacity,
    });
    expect(Number.isNaN(Date.parse(payload.serverTime))).toBe(false);
    expect(payload.reservations).toHaveLength(2);
    expect(payload.reservations).toContainEqual(
      expect.objectContaining({
        id: activeId,
        status: "active",
        email: "camille-1@example.test",
        checkedIn: 2,
        history: [
          { at: expect.any(String), delta: 1, by: "admin@example.test" },
          { at: expect.any(String), delta: 1, by: "admin@example.test" },
        ],
      })
    );
    expect(payload.reservations).toContainEqual(
      expect.objectContaining({ id: cancelledId, status: "cancelled", checkedIn: 2 })
    );
    expect(payload.totals).toEqual({
      reservations: 1,
      reservedPlaces: 2,
      reservationsArrived: 2,
      checkedIn: 4,
      walkIns: 3,
      inHall: 7,
    });
  });

  it("ajoute un pointage de réservation par comparaison atomique", async () => {
    const id = addReservation(database);
    const response = await handleReservationCheckinsApi(
      request("", "POST", reservationBody(id, 0, 2))
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      reservationId: id,
      checkedIn: 2,
      duplicate: false,
    });
    expect(database.prepare("SELECT operator FROM free_reservation_checkins").get()).toEqual({
      operator: "admin@example.test",
    });
  });

  it("refuse un pointage concurrent sans écrire de ligne supplémentaire", async () => {
    const id = addReservation(database);
    addCheckin(database, { reservationId: id, delta: 1, opId: "other-phone-op" });
    const response = await handleReservationCheckinsApi(
      request("", "POST", reservationBody(id, 0, 2, "our-phone-op"))
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ conflict: "reservation", checkedIn: 1 });
    expect(
      database.prepare("SELECT COUNT(*) AS count FROM free_reservation_checkins").get()
    ).toEqual({ count: 1 });
  });

  it("traite un opId déjà reçu comme doublon sans recompter", async () => {
    const id = addReservation(database);
    const body = reservationBody(id, 0, 2, "retry-operation");
    expect((await handleReservationCheckinsApi(request("", "POST", body))).status).toBe(200);
    const response = await handleReservationCheckinsApi(request("", "POST", body));
    expect(await response.json()).toMatchObject({ success: true, checkedIn: 2, duplicate: true });
    expect(
      database.prepare("SELECT COUNT(*) AS count FROM free_reservation_checkins").get()
    ).toEqual({ count: 1 });
  });

  it("accepte from égal à to sans écrire et renvoie l'état courant", async () => {
    const id = addReservation(database);
    addCheckin(database, { reservationId: id, delta: 1, opId: "noop-existing" });
    const response = await handleReservationCheckinsApi(
      request("", "POST", reservationBody(id, 1, 1, "noop-operation"))
    );
    expect(await response.json()).toMatchObject({ success: true, checkedIn: 1, duplicate: false });
    expect(
      database.prepare("SELECT COUNT(*) AS count FROM free_reservation_checkins").get()
    ).toEqual({ count: 1 });
  });

  it("ne permet pas de pointer une réservation d'un autre événement", async () => {
    const id = addReservation(database, { eventSlug: "autre-evenement" });
    const response = await handleReservationCheckinsApi(
      request("", "POST", reservationBody(id, 0, 1))
    );
    expect(response.status).toBe(404);
  });

  it("autorise le pointage d'une réservation annulée", async () => {
    const id = addReservation(database, { status: "cancelled" });
    const response = await handleReservationCheckinsApi(
      request("", "POST", reservationBody(id, 0, 1))
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, checkedIn: 1 });
  });

  it("refuse le pointage d'une réservation anonymisée", async () => {
    const id = addReservation(database, { anonymized: true });
    const response = await handleReservationCheckinsApi(
      request("", "POST", reservationBody(id, 0, 1))
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.any(String) });
    expect(
      database.prepare("SELECT COUNT(*) AS count FROM free_reservation_checkins").get()
    ).toEqual({ count: 0 });
  });

  it("renvoie les erreurs de validation pour opId, compteur et variation nulle", async () => {
    const id = addReservation(database);
    const invalidRequests = [
      reservationBody(id, 0, 1, "bad!"),
      reservationBody(id, 0, 100, "validation-to"),
      { kind: "walk-in", eventSlug, opId: "validation-zero", delta: 0 },
    ];
    for (const body of invalidRequests) {
      const response = await handleReservationCheckinsApi(request("", "POST", body));
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: expect.any(String),
        fields: expect.any(Object),
      });
    }
  });

  it("ajoute et retire des entrées libres, sans laisser le compteur passer sous zéro", async () => {
    const addResponse = await handleReservationCheckinsApi(
      request("", "POST", { kind: "walk-in", eventSlug, opId: "walkin-add-1", delta: 3 })
    );
    expect(await addResponse.json()).toMatchObject({ success: true, walkIns: 3 });
    const removeResponse = await handleReservationCheckinsApi(
      request("", "POST", { kind: "walk-in", eventSlug, opId: "walkin-remove-1", delta: -2 })
    );
    expect(await removeResponse.json()).toMatchObject({ success: true, walkIns: 1 });
    const conflictResponse = await handleReservationCheckinsApi(
      request("", "POST", { kind: "walk-in", eventSlug, opId: "walkin-remove-2", delta: -2 })
    );
    expect(conflictResponse.status).toBe(409);
    expect(await conflictResponse.json()).toMatchObject({ conflict: "walk-in", walkIns: 1 });
    expect(
      database.prepare("SELECT COUNT(*) AS count FROM free_reservation_checkins").get()
    ).toEqual({ count: 2 });
  });

  it("renvoie 405 pour une méthode non prise en charge", async () => {
    const response = await handleReservationCheckinsApi(request("", "PUT"));
    expect(response.status).toBe(405);
  });
});
