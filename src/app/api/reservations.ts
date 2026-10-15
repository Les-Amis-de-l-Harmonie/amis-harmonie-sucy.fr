import { env } from "cloudflare:workers";
import { getFreeEvent, isEventClosed } from "@/lib/free-events";
import { buildConfirmationEmail } from "@/lib/free-events/emails";
import { createPublicReservationSchema, validationFields } from "@/lib/free-events/schema";
import { sendEmail } from "@/lib/email";
import { logger, getRequestLogContext } from "@/lib/logger";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function handleReservationSubmission(request: Request): Promise<Response> {
  if (request.method !== "POST") return jsonResponse({ error: "Méthode non autorisée." }, 405);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Le contenu de la requête est invalide." }, 400);
  }
  if (!isObject(body))
    return jsonResponse({ error: "Le contenu de la requête est invalide." }, 400);

  const eventSlug = typeof body.eventSlug === "string" ? body.eventSlug : "";
  const event = getFreeEvent(eventSlug);
  if (!event) return jsonResponse({ error: "Événement introuvable." }, 404);
  if (isEventClosed(event)) return jsonResponse({ error: event.closedMessage }, 410);

  // Le champ piège absorbe les robots sans enregistrer de données ni déclencher d'e-mail.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    const partySize =
      typeof body.partySize === "number" &&
      Number.isInteger(body.partySize) &&
      body.partySize >= 1 &&
      body.partySize <= event.form.maxPartySize
        ? body.partySize
        : 1;
    return jsonResponse({ success: true, partySize }, 201);
  }

  const parsed = createPublicReservationSchema(event).safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: "Vérifiez les informations indiquées.", fields: validationFields(parsed.error) },
      400
    );
  }

  const data = parsed.data;
  const normalizedEmail = data.email.trim().toLowerCase();
  const newsletterConsentAt = data.newsletterOptIn ? new Date().toISOString() : null;
  const consentTextVersion = data.newsletterOptIn ? event.consentTextVersion : null;

  try {
    const existingActive = await env.DB.prepare(
      `SELECT id FROM free_reservations
       WHERE event_slug = ? AND email_normalized = ? AND status = 'active'
         AND anonymized_at IS NULL LIMIT 1`
    )
      .bind(event.slug, normalizedEmail)
      .first<{ id: number }>();

    if (existingActive) return jsonResponse({ error: event.duplicateMessage }, 409);

    const cancelled = await env.DB.prepare(
      `SELECT id FROM free_reservations
       WHERE event_slug = ? AND email_normalized = ? AND status = 'cancelled'
         AND anonymized_at IS NULL LIMIT 1`
    )
      .bind(event.slug, normalizedEmail)
      .first<{ id: number }>();

    let reservationId: number;
    if (cancelled) {
      reservationId = cancelled.id;
      await env.DB.prepare(
        `UPDATE free_reservations SET
           last_name = ?, first_name = ?, email = ?, email_normalized = ?, party_size = ?,
           interests = ?, source = ?, newsletter_opt_in = ?, newsletter_consent_at = ?,
           consent_text_version = ?, status = 'active', origin = 'web',
           confirmation_sent_at = NULL, confirmation_error = NULL, unsubscribed_at = NULL,
           updated_at = datetime('now')
         WHERE id = ?`
      )
        .bind(
          data.lastName,
          data.firstName,
          data.email,
          normalizedEmail,
          data.partySize,
          JSON.stringify(data.interests),
          data.source,
          data.newsletterOptIn ? 1 : 0,
          newsletterConsentAt,
          consentTextVersion,
          reservationId
        )
        .run();
    } else {
      const inserted = await env.DB.prepare(
        `INSERT INTO free_reservations (
           event_slug, last_name, first_name, email, email_normalized, party_size, interests,
           source, newsletter_opt_in, newsletter_consent_at, consent_text_version, origin
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'web')`
      )
        .bind(
          event.slug,
          data.lastName,
          data.firstName,
          data.email,
          normalizedEmail,
          data.partySize,
          JSON.stringify(data.interests),
          data.source,
          data.newsletterOptIn ? 1 : 0,
          newsletterConsentAt,
          consentTextVersion
        )
        .run();
      reservationId = Number(inserted.meta.last_row_id);
    }

    const confirmation = buildConfirmationEmail(event, {
      firstName: data.firstName,
      partySize: data.partySize,
    });
    const emailResult = await sendEmail({
      to: data.email,
      ...confirmation,
      replyTo: event.contact.email,
    });
    const confirmationSentAt = emailResult.ok ? new Date().toISOString() : null;
    const confirmationError = emailResult.ok ? null : emailResult.error;

    try {
      await env.DB.prepare(
        `UPDATE free_reservations SET confirmation_sent_at = ?, confirmation_error = ?,
         updated_at = datetime('now') WHERE id = ?`
      )
        .bind(confirmationSentAt, confirmationError, reservationId)
        .run();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      logger.error(
        "Impossible d'enregistrer l'état du courriel de réservation",
        new Error(errorMessage),
        getRequestLogContext(request)
      );
    }

    return jsonResponse({ success: true, partySize: data.partySize }, 201);
  } catch (error) {
    if (error instanceof Error && /UNIQUE/i.test(error.message)) {
      return jsonResponse({ error: event.duplicateMessage }, 409);
    }
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    logger.error(
      "Erreur lors de l'enregistrement d'une réservation",
      new Error(errorMessage),
      getRequestLogContext(request)
    );
    return jsonResponse(
      { error: "Une erreur est survenue. Réessayez dans un instant ou appelez le 07 83 51 17 41." },
      500
    );
  }
}
