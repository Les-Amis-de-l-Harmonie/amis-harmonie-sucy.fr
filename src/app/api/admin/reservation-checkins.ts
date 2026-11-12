import { env } from "cloudflare:workers";
import type { FreeReservation, FreeReservationCheckin } from "@/db/types";
import { isAdmin } from "@/db/types";
import { verifySession } from "@/app/api/auth";
import {
  type CheckinEntry,
  type CheckinPayload,
  type CheckinReservation,
  type CheckinRequest,
  type CheckinTotals,
  type ReservationCheckinConflict,
  type ReservationCheckinSuccess,
  type WalkInCheckinConflict,
  type WalkInCheckinSuccess,
} from "@/lib/free-events/checkins";
import { checkinRequestSchema, validationFields } from "@/lib/free-events/schema";
import { getFreeEvent } from "@/lib/free-events";
import { logger, getRequestLogContext } from "@/lib/logger";

interface CheckinRow extends FreeReservationCheckin {}

type CheckinReservationRow = Pick<
  FreeReservation,
  "id" | "last_name" | "first_name" | "email" | "party_size" | "status"
>;

function noStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return noStore(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function toEntry(row: CheckinRow): CheckinEntry {
  return { at: row.created_at, delta: row.delta, by: row.operator };
}

function toHistory(rows: CheckinRow[]): CheckinEntry[] {
  return rows.map(toEntry);
}

async function reservationState(
  reservationId: number
): Promise<{ checkedIn: number; history: CheckinEntry[] }> {
  const result = await env.DB.prepare(
    `SELECT id, event_slug, reservation_id, delta, op_id, operator, created_at
     FROM free_reservation_checkins WHERE reservation_id = ? ORDER BY id`
  )
    .bind(reservationId)
    .all<CheckinRow>();
  return {
    checkedIn: result.results.reduce((sum, row) => sum + row.delta, 0),
    history: toHistory(result.results),
  };
}

async function walkInCount(eventSlug: string): Promise<number> {
  const result = await env.DB.prepare(
    `SELECT COALESCE(SUM(delta), 0) AS count FROM free_reservation_checkins
     WHERE event_slug = ? AND reservation_id IS NULL`
  )
    .bind(eventSlug)
    .first<{ count: number }>();
  return Number(result?.count ?? 0);
}

async function getCheckins(eventSlug: string): Promise<Response> {
  const event = getFreeEvent(eventSlug);
  if (!event) return jsonResponse({ error: "Événement introuvable." }, 404);

  const [reservationResult, checkinResult] = await Promise.all([
    env.DB.prepare(
      `SELECT id, last_name, first_name, email, party_size, status FROM free_reservations
       WHERE event_slug = ? AND anonymized_at IS NULL ORDER BY id`
    )
      .bind(event.slug)
      .all<CheckinReservationRow>(),
    env.DB.prepare(
      `SELECT id, event_slug, reservation_id, delta, op_id, operator, created_at
       FROM free_reservation_checkins WHERE event_slug = ? ORDER BY id`
    )
      .bind(event.slug)
      .all<CheckinRow>(),
  ]);

  const reservationsById = new Map<number, CheckinReservation>();
  for (const row of reservationResult.results) {
    reservationsById.set(row.id, {
      id: row.id,
      lastName: row.last_name,
      firstName: row.first_name,
      email: row.email,
      partySize: row.party_size,
      status: row.status,
      checkedIn: 0,
      history: [],
    });
  }

  let walkIns = 0;
  for (const checkin of checkinResult.results) {
    if (checkin.reservation_id === null) {
      walkIns += checkin.delta;
      continue;
    }
    const reservation = reservationsById.get(checkin.reservation_id);
    if (reservation) {
      reservation.checkedIn += checkin.delta;
      reservation.history.push(toEntry(checkin));
    }
  }

  const reservations = [...reservationsById.values()];
  const active = reservations.filter((reservation) => reservation.status === "active");
  const checkedIn = reservations.reduce((sum, reservation) => sum + reservation.checkedIn, 0);
  const totals: CheckinTotals = {
    reservations: active.length,
    reservedPlaces: active.reduce((sum, reservation) => sum + reservation.partySize, 0),
    reservationsArrived: reservations.filter((reservation) => reservation.checkedIn > 0).length,
    checkedIn,
    walkIns,
    inHall: checkedIn + walkIns,
  };
  const payload: CheckinPayload = {
    serverTime: new Date().toISOString(),
    event: { slug: event.slug, title: event.title, capacity: event.venueCapacity },
    reservations,
    totals,
  };
  return jsonResponse(payload);
}

function readJson(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

async function postCheckin(request: Request, operator: string): Promise<Response> {
  const body = await readJson(request);
  const parsed = checkinRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: "Vérifiez les informations indiquées.", fields: validationFields(parsed.error) },
      400
    );
  }

  const data: CheckinRequest = parsed.data;
  const event = getFreeEvent(data.eventSlug);
  if (!event) return jsonResponse({ error: "Événement introuvable." }, 404);

  if (data.kind === "reservation") {
    return checkInReservation(data, event.slug, operator);
  }
  return checkInWalkIn(data, event.slug, operator);
}

async function checkInReservation(
  data: Extract<CheckinRequest, { kind: "reservation" }>,
  eventSlug: string,
  operator: string
): Promise<Response> {
  const reservation = await env.DB.prepare(
    `SELECT id, event_slug, anonymized_at FROM free_reservations
     WHERE id = ? AND event_slug = ?`
  )
    .bind(data.reservationId, eventSlug)
    .first<Pick<FreeReservation, "id" | "event_slug" | "anonymized_at">>();
  if (!reservation) return jsonResponse({ error: "Réservation introuvable." }, 404);
  if (reservation.anonymized_at !== null) {
    return jsonResponse(
      { error: "Cette réservation a été anonymisée et ne peut plus être pointée." },
      400
    );
  }

  if (data.from === data.to) {
    const state = await reservationState(data.reservationId);
    const response: ReservationCheckinSuccess = {
      success: true,
      reservationId: data.reservationId,
      ...state,
      duplicate: false,
    };
    return jsonResponse(response);
  }

  const delta = data.to - data.from;
  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO free_reservation_checkins
       (event_slug, reservation_id, delta, op_id, operator)
     SELECT ?, ?, ?, ?, ?
     WHERE (SELECT COALESCE(SUM(delta), 0) FROM free_reservation_checkins
       WHERE reservation_id = ?) = ?`
  )
    .bind(eventSlug, data.reservationId, delta, data.opId, operator, data.reservationId, data.from)
    .run();

  if (result.meta.changes === 1) {
    const state = await reservationState(data.reservationId);
    const response: ReservationCheckinSuccess = {
      success: true,
      reservationId: data.reservationId,
      ...state,
      duplicate: false,
    };
    return jsonResponse(response);
  }

  const duplicate = await env.DB.prepare("SELECT id FROM free_reservation_checkins WHERE op_id = ?")
    .bind(data.opId)
    .first<{ id: number }>();
  const state = await reservationState(data.reservationId);
  if (duplicate) {
    const response: ReservationCheckinSuccess = {
      success: true,
      reservationId: data.reservationId,
      ...state,
      duplicate: true,
    };
    return jsonResponse(response);
  }

  const conflict: ReservationCheckinConflict = {
    error: "Ce groupe a été pointé entre-temps sur un autre téléphone.",
    conflict: "reservation",
    reservationId: data.reservationId,
    ...state,
  };
  return jsonResponse(conflict, 409);
}

async function checkInWalkIn(
  data: Extract<CheckinRequest, { kind: "walk-in" }>,
  eventSlug: string,
  operator: string
): Promise<Response> {
  const result = await env.DB.prepare(
    `INSERT OR IGNORE INTO free_reservation_checkins
       (event_slug, reservation_id, delta, op_id, operator)
     SELECT ?, NULL, ?, ?, ?
     WHERE (SELECT COALESCE(SUM(delta), 0) FROM free_reservation_checkins
       WHERE event_slug = ? AND reservation_id IS NULL) + ? >= 0`
  )
    .bind(eventSlug, data.delta, data.opId, operator, eventSlug, data.delta)
    .run();

  if (result.meta.changes === 1) {
    const response: WalkInCheckinSuccess = {
      success: true,
      walkIns: await walkInCount(eventSlug),
      duplicate: false,
    };
    return jsonResponse(response);
  }

  const duplicate = await env.DB.prepare("SELECT id FROM free_reservation_checkins WHERE op_id = ?")
    .bind(data.opId)
    .first<{ id: number }>();
  const currentWalkIns = await walkInCount(eventSlug);
  if (duplicate) {
    const response: WalkInCheckinSuccess = {
      success: true,
      walkIns: currentWalkIns,
      duplicate: true,
    };
    return jsonResponse(response);
  }

  const conflict: WalkInCheckinConflict = {
    error: "Le compteur des entrées sans réservation ne peut pas être négatif.",
    conflict: "walk-in",
    walkIns: currentWalkIns,
  };
  return jsonResponse(conflict, 409);
}

export async function handleReservationCheckinsApi(request: Request): Promise<Response> {
  try {
    const user = await verifySession(request, "admin");
    if (!user || !isAdmin(user.role)) {
      return jsonResponse({ error: "Authentification requise." }, 401);
    }

    const url = new URL(request.url);
    if (request.method === "GET") {
      const eventSlug = url.searchParams.get("eventSlug");
      if (!eventSlug) return jsonResponse({ error: "Événement introuvable." }, 404);
      return await getCheckins(eventSlug);
    }
    if (request.method === "POST") return await postCheckin(request, user.email);
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    logger.error(
      "Erreur API du pointage des réservations",
      new Error(errorMessage),
      getRequestLogContext(request)
    );
    return jsonResponse({ error: "Une erreur est survenue lors du pointage." }, 500);
  }
}
