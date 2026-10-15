import { env } from "cloudflare:workers";
import type { FreeReservation } from "@/db/types";
import { checkAdminAuth } from "@/app/api/admin-crud";
import { getFreeEvent } from "@/lib/free-events";
import { buildConfirmationEmail } from "@/lib/free-events/emails";
import {
  adminReservationPatchSchema,
  createAdminReservationSchema,
  validationFields,
} from "@/lib/free-events/schema";
import { sendEmail } from "@/lib/email";
import { logger, getRequestLogContext } from "@/lib/logger";

interface ReservationRow extends FreeReservation {}

interface AdminReservation {
  id: number;
  lastName: string | null;
  firstName: string | null;
  email: string | null;
  partySize: number;
  interests: string[];
  source: string | null;
  newsletterOptIn: boolean;
  status: "active" | "cancelled";
  origin: "web" | "admin";
  confirmationSentAt: string | null;
  confirmationError: string | null;
  createdAt: string;
  updatedAt: string;
  anonymizedAt: string | null;
}

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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseInterests(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function toAdminReservation(row: ReservationRow): AdminReservation {
  return {
    id: row.id,
    lastName: row.last_name,
    firstName: row.first_name,
    email: row.email,
    partySize: row.party_size,
    interests: parseInterests(row.interests),
    source: row.source,
    newsletterOptIn: row.newsletter_opt_in === 1,
    status: row.status,
    origin: row.origin,
    confirmationSentAt: row.confirmation_sent_at,
    confirmationError: row.confirmation_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    anonymizedAt: row.anonymized_at,
  };
}

function csvCell(value: string | number | null): string {
  let text = value === null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",;\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvResponse(
  rows: Array<Array<string | number | null>>,
  delimiter: "," | ";",
  filename: string,
  bom = false
): Response {
  const csv = rows.map((row) => row.map(csvCell).join(delimiter)).join("\r\n");
  return noStore(
    new Response(`${bom ? "\uFEFF" : ""}${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  );
}

function sortByNames<T extends { last_name: string | null; first_name: string | null }>(
  rows: T[]
): T[] {
  return rows.sort((a, b) => {
    const last = (a.last_name ?? "").localeCompare(b.last_name ?? "", "fr", {
      sensitivity: "base",
    });
    return (
      last || (a.first_name ?? "").localeCompare(b.first_name ?? "", "fr", { sensitivity: "base" })
    );
  });
}

function statsIncrement(
  aggregate: Record<string, { reservations: number; places: number }>,
  key: string,
  partySize: number
): void {
  aggregate[key] ??= { reservations: 0, places: 0 };
  aggregate[key].reservations += 1;
  aggregate[key].places += partySize;
}

async function getReservations(
  event: NonNullable<ReturnType<typeof getFreeEvent>>
): Promise<Response> {
  const [allResult, activeResult] = await Promise.all([
    env.DB.prepare(
      "SELECT * FROM free_reservations WHERE event_slug = ? ORDER BY created_at DESC, id DESC"
    )
      .bind(event.slug)
      .all<ReservationRow>(),
    env.DB.prepare("SELECT * FROM free_reservations WHERE event_slug = ? AND status = 'active'")
      .bind(event.slug)
      .all<ReservationRow>(),
  ]);
  const active = activeResult.results;
  const byInterest: Record<string, { reservations: number; places: number }> = {};
  const bySource: Record<string, { reservations: number; places: number }> = {
    none: { reservations: 0, places: 0 },
  };
  for (const { code } of event.form.interests) byInterest[code] = { reservations: 0, places: 0 };
  for (const { code } of event.form.sources) bySource[code] = { reservations: 0, places: 0 };

  for (const row of active) {
    const interests = parseInterests(row.interests);
    for (const interest of interests) statsIncrement(byInterest, interest, row.party_size);
    statsIncrement(bySource, row.source ?? "none", row.party_size);
  }

  const cancelledCount = allResult.results.filter((row) => row.status === "cancelled").length;
  const stats = {
    reservations: active.length,
    places: active.reduce((sum, row) => sum + row.party_size, 0),
    newsletterOptIns: active.filter(
      (row) => row.newsletter_opt_in === 1 && row.unsubscribed_at === null
    ).length,
    cancelled: cancelledCount,
    confirmationErrors: active.filter(
      (row) => row.confirmation_error !== null && row.anonymized_at === null
    ).length,
    byInterest,
    bySource,
  };
  return jsonResponse({ stats, reservations: allResult.results.map(toAdminReservation) });
}

async function createReservation(request: Request): Promise<Response> {
  const body = await readJson(request);
  if (!isObject(body) || typeof body.eventSlug !== "string") {
    return jsonResponse({ error: "Contenu de la requête invalide." }, 400);
  }
  const event = getFreeEvent(body.eventSlug);
  if (!event) return jsonResponse({ error: "Événement introuvable." }, 404);
  const parsed = createAdminReservationSchema(event).safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: "Vérifiez les informations indiquées.", fields: validationFields(parsed.error) },
      400
    );
  }
  const data = parsed.data;
  const email = data.email ?? null;
  const normalizedEmail = email?.trim().toLowerCase() ?? null;
  const existing = normalizedEmail
    ? await env.DB.prepare(
        "SELECT id, status FROM free_reservations WHERE event_slug = ? AND email_normalized = ? AND anonymized_at IS NULL LIMIT 1"
      )
        .bind(event.slug, normalizedEmail)
        .first<{ id: number; status: string }>()
    : null;
  if (existing?.status === "cancelled") {
    return jsonResponse(
      {
        error:
          "Une réservation annulée existe déjà avec cette adresse : réactivez-la depuis la liste.",
      },
      409
    );
  }
  if (existing)
    return jsonResponse({ error: "Une réservation existe déjà avec cette adresse e-mail." }, 409);

  const consentAt = data.newsletterOptIn ? new Date().toISOString() : null;
  try {
    const result = await env.DB.prepare(
      `INSERT INTO free_reservations (
        event_slug, last_name, first_name, email, email_normalized, party_size, interests, source,
        newsletter_opt_in, newsletter_consent_at, consent_text_version, origin
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'admin')`
    )
      .bind(
        event.slug,
        data.lastName,
        data.firstName,
        email,
        normalizedEmail,
        data.partySize,
        JSON.stringify(data.interests),
        data.source,
        data.newsletterOptIn ? 1 : 0,
        consentAt,
        data.newsletterOptIn ? event.consentTextVersion : null
      )
      .run();
    const id = Number(result.meta.last_row_id);

    if (data.sendConfirmation && email) {
      const confirmation = buildConfirmationEmail(event, {
        firstName: data.firstName,
        partySize: data.partySize,
      });
      const sent = await sendEmail({ to: email, ...confirmation, replyTo: event.contact.email });
      await env.DB.prepare(
        "UPDATE free_reservations SET confirmation_sent_at = ?, confirmation_error = ? WHERE id = ?"
      )
        .bind(sent.ok ? new Date().toISOString() : null, sent.ok ? null : sent.error, id)
        .run();
    }
    return jsonResponse({ success: true, id }, 201);
  } catch (error) {
    if (error instanceof Error && /UNIQUE/i.test(error.message)) {
      return jsonResponse({ error: "Une réservation existe déjà avec cette adresse e-mail." }, 409);
    }
    throw error;
  }
}

async function updateReservation(url: URL, request: Request): Promise<Response> {
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0)
    return jsonResponse({ error: "Identifiant invalide." }, 400);
  const current = await env.DB.prepare("SELECT * FROM free_reservations WHERE id = ?")
    .bind(id)
    .first<ReservationRow>();
  if (!current) return jsonResponse({ error: "Réservation introuvable." }, 404);
  const body = await readJson(request);
  if (!isObject(body)) return jsonResponse({ error: "Contenu de la requête invalide." }, 400);
  if (
    current.anonymized_at !== null &&
    ("email" in body || "lastName" in body || "firstName" in body)
  ) {
    return jsonResponse(
      {
        error:
          "Cette réservation a été anonymisée : ses coordonnées ne peuvent plus être modifiées.",
      },
      400
    );
  }
  const parsed = adminReservationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: "Vérifiez les informations indiquées.", fields: validationFields(parsed.error) },
      400
    );
  }
  const data = parsed.data;
  const updates: string[] = [];
  const values: Array<string | number | null> = [];
  const add = (column: string, value: string | number | null) => {
    updates.push(`${column} = ?`);
    values.push(value);
  };

  if (data.lastName !== undefined) add("last_name", data.lastName);
  if (data.firstName !== undefined) add("first_name", data.firstName);
  if (data.partySize !== undefined) add("party_size", data.partySize);
  if (data.status !== undefined) add("status", data.status);
  if (data.email !== undefined) {
    const email = data.email?.trim() || null;
    add("email", email);
    add("email_normalized", email?.toLowerCase() ?? null);
  }
  if (data.newsletterOptIn !== undefined) {
    const optedIn = data.newsletterOptIn;
    add("newsletter_opt_in", optedIn ? 1 : 0);
    if (optedIn) {
      if (current.newsletter_opt_in !== 1) {
        add("newsletter_consent_at", new Date().toISOString());
        add("consent_text_version", getFreeEvent(current.event_slug)?.consentTextVersion ?? null);
      }
      add("unsubscribed_at", null);
    } else if (current.newsletter_opt_in === 1) {
      add("unsubscribed_at", new Date().toISOString());
    }
  }
  updates.push("updated_at = datetime('now')");

  try {
    await env.DB.prepare(`UPDATE free_reservations SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values, id)
      .run();
    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof Error && /UNIQUE/i.test(error.message)) {
      return jsonResponse({ error: "Une réservation existe déjà avec cette adresse e-mail." }, 409);
    }
    throw error;
  }
}

async function resendConfirmation(url: URL): Promise<Response> {
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0)
    return jsonResponse({ error: "Identifiant invalide." }, 400);
  const row = await env.DB.prepare("SELECT * FROM free_reservations WHERE id = ?")
    .bind(id)
    .first<ReservationRow>();
  if (!row) return jsonResponse({ error: "Réservation introuvable." }, 404);
  const event = getFreeEvent(row.event_slug);
  if (!event) return jsonResponse({ error: "Événement introuvable." }, 404);
  if (row.status !== "active")
    return jsonResponse({ error: "Cette réservation est annulée." }, 400);
  if (!row.email)
    return jsonResponse({ error: "Cette réservation ne comporte pas d'adresse e-mail." }, 400);
  const content = buildConfirmationEmail(event, {
    firstName: row.first_name,
    partySize: row.party_size,
  });
  const sent = await sendEmail({ to: row.email, ...content, replyTo: event.contact.email });
  await env.DB.prepare(
    "UPDATE free_reservations SET confirmation_sent_at = ?, confirmation_error = ?, updated_at = datetime('now') WHERE id = ?"
  )
    .bind(sent.ok ? new Date().toISOString() : null, sent.ok ? null : sent.error, id)
    .run();
  if (!sent.ok)
    return jsonResponse({ error: "L'e-mail de confirmation n'a pas pu être envoyé." }, 502);
  return jsonResponse({ success: true });
}

async function resendFailed(url: URL): Promise<Response> {
  const eventSlug = url.searchParams.get("eventSlug");
  const event = eventSlug ? getFreeEvent(eventSlug) : undefined;
  if (!event) return jsonResponse({ error: "Événement introuvable." }, 404);
  const rows = await env.DB.prepare(
    `SELECT * FROM free_reservations
     WHERE event_slug = ? AND status = 'active' AND email IS NOT NULL
       AND confirmation_error IS NOT NULL AND anonymized_at IS NULL
     ORDER BY id LIMIT 40`
  )
    .bind(event.slug)
    .all<ReservationRow>();
  let sentCount = 0;
  let failedCount = 0;
  const updates: Array<ReturnType<typeof env.DB.prepare>> = [];
  for (const row of rows.results) {
    const content = buildConfirmationEmail(event, {
      firstName: row.first_name,
      partySize: row.party_size,
    });
    if (!row.email) continue;
    const result = await sendEmail({ to: row.email, ...content, replyTo: event.contact.email });
    updates.push(
      env.DB.prepare(
        "UPDATE free_reservations SET confirmation_sent_at = ?, confirmation_error = ?, updated_at = datetime('now') WHERE id = ?"
      ).bind(result.ok ? new Date().toISOString() : null, result.ok ? null : result.error, row.id)
    );
    if (result.ok) sentCount += 1;
    else failedCount += 1;
  }
  if (updates.length > 0) await env.DB.batch(updates);
  return jsonResponse({ success: true, sent: sentCount, failed: failedCount });
}

async function exportReservations(url: URL): Promise<Response> {
  const eventSlug = url.searchParams.get("eventSlug");
  const event = eventSlug ? getFreeEvent(eventSlug) : undefined;
  const type = url.searchParams.get("type");
  if (!event) return jsonResponse({ error: "Événement introuvable." }, 404);

  if (type === "attendees") {
    const result = await env.DB.prepare(
      "SELECT last_name, first_name, party_size FROM free_reservations WHERE event_slug = ? AND status = 'active' AND anonymized_at IS NULL"
    )
      .bind(event.slug)
      .all<{ last_name: string | null; first_name: string | null; party_size: number }>();
    const rows = sortByNames(result.results);
    return csvResponse(
      [
        ["Nom", "Prénom", "Places", "Présent"],
        ...rows.map((row) => [row.last_name, row.first_name, row.party_size, ""]),
      ],
      ";",
      `reservations-${event.slug}-participants.csv`,
      true
    );
  }

  if (type === "contacts") {
    const result = await env.DB.prepare(
      `SELECT email, first_name, last_name, party_size, newsletter_opt_in FROM free_reservations
       WHERE event_slug = ? AND status = 'active' AND email IS NOT NULL AND anonymized_at IS NULL`
    )
      .bind(event.slug)
      .all<
        Pick<
          ReservationRow,
          "email" | "first_name" | "last_name" | "party_size" | "newsletter_opt_in"
        >
      >();
    const rows = sortByNames(result.results);
    return csvResponse(
      [
        ["Email Address", "First Name", "Last Name", "Places", "Newsletter"],
        ...rows.map((row) => [
          row.email,
          row.first_name,
          row.last_name,
          row.party_size,
          row.newsletter_opt_in ? "Oui" : "Non",
        ]),
      ],
      ",",
      `reservations-${event.slug}-contacts.csv`
    );
  }

  if (type === "newsletter") {
    const result = await env.DB.prepare(
      `SELECT email, first_name, last_name, newsletter_consent_at FROM free_reservations
       WHERE event_slug = ? AND newsletter_opt_in = 1 AND unsubscribed_at IS NULL
         AND email IS NOT NULL AND anonymized_at IS NULL`
    )
      .bind(event.slug)
      .all<Pick<ReservationRow, "email" | "first_name" | "last_name" | "newsletter_consent_at">>();
    const rows = sortByNames(result.results);
    return csvResponse(
      [
        ["Email Address", "First Name", "Last Name", "Consent Date"],
        ...rows.map((row) => [row.email, row.first_name, row.last_name, row.newsletter_consent_at]),
      ],
      ",",
      `reservations-${event.slug}-newsletter.csv`
    );
  }
  return jsonResponse({ error: "Type d'export invalide." }, 400);
}

async function anonymizeReservations(url: URL): Promise<Response> {
  const eventSlug = url.searchParams.get("eventSlug");
  const event = eventSlug ? getFreeEvent(eventSlug) : undefined;
  if (!event) return jsonResponse({ error: "Événement introuvable." }, 404);
  const eligible = `event_slug = ? AND anonymized_at IS NULL AND
    (newsletter_opt_in = 0 OR unsubscribed_at IS NOT NULL)`;
  const result = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM free_reservations WHERE ${eligible}`
  )
    .bind(event.slug)
    .first<{ count: number }>();
  const count = Number(result?.count ?? 0);
  if (url.searchParams.get("dryRun") === "1") return jsonResponse({ success: true, count });
  const anonymized = await env.DB.prepare(
    `UPDATE free_reservations SET last_name = NULL, first_name = NULL, email = NULL,
      email_normalized = NULL, confirmation_error = NULL,
      anonymized_at = datetime('now'), updated_at = datetime('now')
     WHERE ${eligible}`
  )
    .bind(event.slug)
    .run();
  return jsonResponse({ success: true, anonymized: Number(anonymized.meta.changes) });
}

export async function handleReservationsAdminApi(request: Request): Promise<Response> {
  const authError = await checkAdminAuth(request);
  if (authError) return noStore(authError);
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    if (request.method === "GET" && action === "export") return await exportReservations(url);
    if (request.method === "POST" && action === "anonymize")
      return await anonymizeReservations(url);
    if (request.method === "POST" && action === "resend") return await resendConfirmation(url);
    if (request.method === "POST" && action === "resend-failed") return await resendFailed(url);

    if (request.method === "GET") {
      const eventSlug = url.searchParams.get("eventSlug");
      const event = eventSlug ? getFreeEvent(eventSlug) : undefined;
      if (!event) return jsonResponse({ error: "Événement introuvable." }, 404);
      return await getReservations(event);
    }
    if (request.method === "POST") return await createReservation(request);
    if (request.method === "PATCH") return await updateReservation(url, request);
    if (request.method === "DELETE") {
      const id = Number(url.searchParams.get("id"));
      if (!Number.isInteger(id) || id <= 0)
        return jsonResponse({ error: "Identifiant invalide." }, 400);
      const result = await env.DB.prepare("DELETE FROM free_reservations WHERE id = ?")
        .bind(id)
        .run();
      if (!result.meta.changes) return jsonResponse({ error: "Réservation introuvable." }, 404);
      return jsonResponse({ success: true });
    }
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    logger.error(
      "Erreur API des réservations administratives",
      new Error(errorMessage),
      getRequestLogContext(request)
    );
    return jsonResponse(
      { error: "Une erreur est survenue lors du traitement des réservations." },
      500
    );
  }
}
