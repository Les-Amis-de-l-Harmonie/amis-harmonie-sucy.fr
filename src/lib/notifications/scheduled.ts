import { sendEmail } from "@/lib/email";
import { getParisDate } from "@/lib/presence";
import { createNotificationStore, type NotificationD1Database } from "./store";
import { runScheduledPresenceReminders } from "./runner";

/** Colle les bindings Worker au runner ; la date métier est toujours celle de Paris. */
export async function runScheduledTick(
  db: NotificationD1Database,
  now: Date = new Date()
): Promise<void> {
  await runScheduledPresenceReminders({
    db: createNotificationStore(db),
    today: getParisDate(now),
    now: now.toISOString(),
    send: sendEmail,
  });
}
