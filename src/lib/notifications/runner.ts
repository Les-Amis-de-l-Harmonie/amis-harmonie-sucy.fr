import { isReservedEmail, toNotificationMode, type NotificationSettings } from "@/db/types";
import { logger } from "@/lib/logger";
import type { NotificationStore } from "./store";
import {
  buildTestDigest,
  groupReminderTargets,
  isValidEmailAddress,
  reminderWithClaims,
  toPreviewItem,
  withOtherEvents,
} from "./planning";
import { effectiveNotificationSettings } from "./settings";
import type {
  ReminderExecutionResult,
  ReminderPreviewItem,
  ReminderSender,
  ReminderStage,
} from "./types";

const MAX_EMAILS_PER_RUN = 30;

export interface RunPresenceRemindersInput {
  db: NotificationStore;
  today: string;
  mode: unknown;
  send: ReminderSender;
  testRecipient?: string | null;
  now?: string;
}

export interface SendTestReminderInput {
  db: NotificationStore;
  today: string;
  testRecipient: string;
  send: ReminderSender;
}

export interface SendTestReminderResult {
  ok: boolean;
  sentTo: string;
  itemCount: number;
  capped: boolean;
  error?: string;
}

export interface ReminderPreview {
  today: string;
  items: ReminderPreviewItem[];
  capped: boolean;
}

function skippedReservedRecipients<T extends { recipientEmail: string }>(items: T[]): T[] {
  return items.filter((item) => {
    if (!isReservedEmail(item.recipientEmail)) return true;
    logger.error("Adresse réservée exclue des rappels de présence", {
      recipientEmail: item.recipientEmail,
    });
    return false;
  });
}

function shouldStopAfterSendFailure(error: string): boolean {
  if (error === "missing_key") return true;
  const match = /^http_(\d{3})$/.exec(error);
  if (!match) return false;
  const status = Number(match[1]);
  return (status >= 400 && status < 500 && status !== 422) || status >= 500;
}

function formatStageSummary(stages: ReminderStage[]): string {
  return [...new Set(stages)].sort((a, b) => b - a).join(" et ");
}

async function planReminders(db: NotificationStore, today: string) {
  const targets = await db.getReminderTargets(today);
  const groups = groupReminderTargets(targets, today);
  const subjectIds = Array.from(
    new Set(groups.flatMap((group) => group.claims.flatMap((claim) => claim.subjectUserIds)))
  );
  const otherEvents = await db.getUnansweredUpcomingEvents(subjectIds, today);
  return groups.map((group) => withOtherEvents(group, otherEvents, today));
}

export async function sendTestReminder({
  db,
  today,
  testRecipient,
  send,
}: SendTestReminderInput): Promise<SendTestReminderResult> {
  if (!isValidEmailAddress(testRecipient)) {
    return {
      ok: false,
      sentTo: testRecipient,
      itemCount: 0,
      capped: false,
      error: "invalid_test_recipient",
    };
  }
  const groups = skippedReservedRecipients(await planReminders(db, today));
  const capped = groups.length > MAX_EMAILS_PER_RUN;
  const digestItems = groups.slice(0, MAX_EMAILS_PER_RUN);
  const digest = buildTestDigest(digestItems, today);
  const result = await send({ to: testRecipient, ...digest });
  return {
    ok: result.ok,
    sentTo: testRecipient,
    itemCount: digestItems.length,
    capped,
    ...(result.ok ? {} : { error: result.error }),
  };
}

/** Aperçu strictement en lecture : aucune réservation, écriture de réglage ou mise en file d'envoi. */
export async function previewPresenceReminders(
  db: NotificationStore,
  today: string
): Promise<ReminderPreview> {
  const groups = skippedReservedRecipients(await planReminders(db, today));
  const capped = groups.length > MAX_EMAILS_PER_RUN;
  const visibleGroups = groups.slice(0, MAX_EMAILS_PER_RUN);
  const existing = await db.getExistingKeys(
    visibleGroups.flatMap((group) => group.claims.map((claim) => claim.dedupeKey))
  );
  const statusByKey = new Map(existing.map((row) => [row.dedupeKey, row.status]));
  return {
    today,
    items: visibleGroups.map((group) =>
      toPreviewItem(
        group,
        group.claims.length > 0 &&
          group.claims.every((claim) => statusByKey.get(claim.dedupeKey) === "sent")
      )
    ),
    capped,
  };
}

/**
 * Exécute un passage quotidien. `mode` est toujours dérivé de la ligne serveur par
 * `runScheduledPresenceReminders`; un appel avec une valeur inconnue retombe aussi sur off.
 */
export async function runPresenceReminders({
  db,
  today,
  mode: requestedMode,
  send,
  testRecipient = null,
  now = new Date().toISOString(),
}: RunPresenceRemindersInput): Promise<ReminderExecutionResult> {
  let mode = toNotificationMode(requestedMode);
  const effectiveTestRecipient = isValidEmailAddress(testRecipient) ? testRecipient : null;
  if (mode === "test" && effectiveTestRecipient === null) mode = "off";
  let planned = 0;
  let sent = 0;
  let capped = false;
  let summary = "";

  try {
    if (mode === "off") {
      summary = "Désactivé : aucun e-mail envoyé.";
    } else if (mode === "test") {
      const result = await sendTestReminder({
        db,
        today,
        testRecipient: effectiveTestRecipient ?? "",
        send,
      });
      planned = result.itemCount;
      capped = result.capped;
      sent = result.ok ? 1 : 0;
      summary = result.ok
        ? `Essai envoyé à ${result.sentTo} ; ${result.itemCount} rappel(s) simulé(s)${result.capped ? " (plafond de 30 atteint)" : ""}.`
        : `Essai non envoyé (${result.error ?? "erreur d'envoi"}).`;
    } else {
      const groups = await planReminders(db, today);
      const sendableCount = groups.filter((group) =>
        isValidEmailAddress(group.recipientEmail)
      ).length;
      planned = sendableCount;
      capped = sendableCount > MAX_EMAILS_PER_RUN;
      let attempted = 0;
      const stages: ReminderStage[] = [];
      let lastError: string | null = null;

      for (const group of groups) {
        if (attempted >= MAX_EMAILS_PER_RUN) break;
        if (!isValidEmailAddress(group.recipientEmail)) {
          if (isReservedEmail(group.recipientEmail)) {
            logger.error("Garde finale : envoi interdit vers une adresse réservée", {
              recipientEmail: group.recipientEmail,
            });
          }
          continue;
        }

        const claimedKeys = await db.reserveClaims(group.claims);
        if (claimedKeys.size === 0) continue;
        const claimedClaims = group.claims.filter((claim) => claimedKeys.has(claim.dedupeKey));
        const message = reminderWithClaims(group, claimedClaims);
        attempted += 1;
        for (const claim of claimedClaims) stages.push(claim.stage);

        let result;
        try {
          result = await send({
            to: message.recipientEmail,
            subject: message.subject,
            text: message.text,
            html: message.html,
          });
        } catch (error) {
          logger.error("Erreur d'envoi d'un rappel de présence", error);
          result = { ok: false as const, error: "network" };
        }

        if (result.ok) {
          // Si la mise à jour échoue après l'envoi, garder les clés pending empêche un doublon.
          await db.markSent(Array.from(claimedKeys));
          sent += 1;
          continue;
        }

        await db.deleteClaims(Array.from(claimedKeys));
        lastError = result.error;
        if (shouldStopAfterSendFailure(result.error)) {
          summary = `Arrêt après une erreur ${result.error} ; dernière erreur : ${result.error} ; ${sent} e-mail(s) envoyé(s).`;
          break;
        }
      }

      if (!summary) {
        summary = `Activé : ${sent} e-mail(s) envoyé(s), paliers ${formatStageSummary(stages) || "aucun"}${lastError ? ` ; dernière erreur : ${lastError}` : ""}${capped ? " ; plafond de 30 atteint" : ""}.`;
      }
    }
  } catch (error) {
    logger.error("Échec de l'exécution des rappels de présence", error);
    summary = `Erreur d'exécution ; ${sent} e-mail(s) envoyé(s).`;
  }

  try {
    await db.writeLastRun(now, summary);
  } catch (error) {
    // Un échec du journal de tâche ne doit jamais déclencher un autre envoi.
    logger.error("Impossible d'enregistrer le résultat des rappels de présence", error);
  }

  return { mode, planned, sent, capped, summary };
}

/** Lit le réglage à chaque déclenchement et transforme tout défaut de lecture en off. */
export async function runScheduledPresenceReminders(input: {
  db: NotificationStore;
  today: string;
  now?: string;
  send: ReminderSender;
}): Promise<ReminderExecutionResult> {
  let settings: NotificationSettings | null = null;
  try {
    settings = await input.db.getSettings();
  } catch (error) {
    logger.error("Impossible de lire le réglage des rappels ; exécution désactivée", error);
  }
  const effective = effectiveNotificationSettings(settings);
  return runPresenceReminders({
    ...input,
    mode: effective.mode,
    testRecipient: effective.testRecipient,
  });
}

export { effectiveNotificationSettings };
