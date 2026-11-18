import { env } from "cloudflare:workers";
import { verifySession } from "@/app/api/auth";
import { isAdmin, isSuperAdmin, type NotificationSettings } from "@/db/types";
import { getParisDate } from "@/lib/presence";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import {
  previewPresenceReminders,
  sendTestReminder,
} from "@/lib/notifications/runner";
import {
  createNotificationStore,
  type NotificationStore,
  type RecentNotificationLogRow,
} from "@/lib/notifications/store";
import { effectiveNotificationSettings } from "@/lib/notifications/settings";
import { isValidEmailAddress } from "@/lib/notifications/planning";
import type { NotificationSettingsView } from "@/lib/notifications/types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function settingsView(
  row: NotificationSettings | null,
  effective = effectiveNotificationSettings(row)
): NotificationSettingsView {
  return {
    presenceRemindersMode: effective.mode,
    testRecipient: effective.testRecipient,
    lastRunAt: row?.last_run_at ?? null,
    lastRunSummary: row?.last_run_summary ?? null,
    updatedAt: row?.updated_at ?? "",
  };
}

function parseSubjectUserIds(value: string | null): number[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id))
      : [];
  } catch {
    return [];
  }
}

async function getLogRows(store: NotificationStore, rows: RecentNotificationLogRow[]) {
  const subjectIds = Array.from(new Set(rows.flatMap((row) => parseSubjectUserIds(row.subjectUserIds))));
  const subjectNames = await store.getSubjectNames(subjectIds);
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    sentAt: row.sentAt,
    status: row.status === "sent" ? "sent" : "pending",
    kind: row.kind,
    eventTitle: row.eventTitle,
    stage: row.stage,
    recipientEmail: row.recipientEmail,
    subjectNames: parseSubjectUserIds(row.subjectUserIds).map(
      (id) => subjectNames.get(id) ?? "Compte supprimé"
    ),
    error: row.error,
  }));
}

function isSettingsBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function handleAdminNotificationsApi(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await verifySession(request, "admin");
  } catch (error) {
    logger.error("Notifications API authentication error:", error);
    return jsonResponse({ error: "Une erreur interne est survenue." }, 500);
  }
  if (!actor || !isAdmin(actor.role)) return jsonResponse({ error: "Non autorisé" }, 401);

  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const store = createNotificationStore(env.DB);

  try {
    if (request.method === "GET") {
      if (action === "preview") {
        return jsonResponse(await previewPresenceReminders(store, getParisDate()));
      }
      if (action !== null) return jsonResponse({ error: "Action inconnue." }, 400);

      const [row, logRows] = await Promise.all([store.getSettings(), store.getRecentLogs()]);
      const effective = effectiveNotificationSettings(row);
      return jsonResponse({
        settings: settingsView(row, effective),
        canEdit: isSuperAdmin(actor.role),
        log: await getLogRows(store, logRows),
      });
    }

    if (request.method === "PUT") {
      if (!isSuperAdmin(actor.role)) {
        return jsonResponse({ error: "Cette action est réservée aux super-administrateurs." }, 403);
      }
      let data: unknown;
      try {
        data = await request.json();
      } catch {
        return jsonResponse({ error: "Le corps de la requête est invalide." }, 400);
      }
      if (!isSettingsBody(data)) return jsonResponse({ error: "Les réglages sont invalides." }, 400);

      const mode = data.presenceRemindersMode;
      if (
        mode !== "off" &&
        mode !== "test" &&
        mode !== "on"
      ) {
        return jsonResponse({ error: "Le mode de rappel doit être off, test ou on." }, 400);
      }
      const rawRecipient = data.testRecipient;
      if (rawRecipient !== undefined && rawRecipient !== null && typeof rawRecipient !== "string") {
        return jsonResponse({ error: "L'adresse d'essai est invalide." }, 400);
      }
      const testRecipient =
        typeof rawRecipient === "string" ? rawRecipient.trim().toLowerCase() || null : null;
      if (testRecipient !== null && !isValidEmailAddress(testRecipient)) {
        return jsonResponse(
          { error: "L'adresse d'essai doit être valide et ne peut pas être une adresse réservée." },
          400
        );
      }
      if (mode === "test" && testRecipient === null) {
        return jsonResponse({ error: "Une adresse d'essai est obligatoire en mode Essai." }, 400);
      }

      await env.DB.prepare(
        `INSERT INTO notification_settings (
           id, presence_reminders_mode, test_recipient, updated_at, updated_by
         ) VALUES (1, ?, ?, datetime('now'), ?)
         ON CONFLICT(id) DO UPDATE SET
           presence_reminders_mode = excluded.presence_reminders_mode,
           test_recipient = excluded.test_recipient,
           updated_at = datetime('now'),
           updated_by = excluded.updated_by`
      )
        .bind(mode, testRecipient, actor.id)
        .run();
      const updated = await store.getSettings();
      return jsonResponse({ success: true, settings: settingsView(updated) });
    }

    if (request.method === "POST") {
      if (action !== "send-test") return jsonResponse({ error: "Action inconnue." }, 400);
      if (!isSuperAdmin(actor.role)) {
        return jsonResponse({ error: "Cette action est réservée aux super-administrateurs." }, 403);
      }
      const row = await store.getSettings();
      const effective = effectiveNotificationSettings(row);
      if (effective.mode !== "test" || !effective.testRecipient) {
        return jsonResponse({ error: "L'envoi d'essai est disponible uniquement en mode Essai." }, 409);
      }
      const result = await sendTestReminder({
        db: store,
        today: getParisDate(),
        testRecipient: effective.testRecipient,
        send: sendEmail,
      });
      if (!result.ok) {
        return jsonResponse({ error: "Le récapitulatif d'essai n'a pas pu être envoyé." }, 502);
      }
      return jsonResponse({ success: true, sentTo: result.sentTo, itemCount: result.itemCount });
    }

    return jsonResponse({ error: "Méthode non autorisée" }, 405);
  } catch (error) {
    logger.error("Admin notifications API error:", error);
    return jsonResponse({ error: "Une erreur interne est survenue." }, 500);
  }
}
