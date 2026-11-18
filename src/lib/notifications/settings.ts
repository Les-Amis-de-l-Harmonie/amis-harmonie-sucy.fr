import {
  toNotificationMode,
  type NotificationMode,
  type NotificationSettings,
} from "@/db/types";
import { isValidEmailAddress } from "./planning";

export interface EffectiveNotificationSettings {
  mode: NotificationMode;
  testRecipient: string | null;
}

/** Fail-closed : ligne absente, mode inconnu ou destinataire d'essai invalide → off. */
export function effectiveNotificationSettings(
  row: NotificationSettings | null
): EffectiveNotificationSettings {
  const rawRecipient = row?.test_recipient?.trim().toLowerCase() || null;
  const testRecipient = isValidEmailAddress(rawRecipient) ? rawRecipient : null;
  let mode = toNotificationMode(row?.presence_reminders_mode);
  if (mode === "test" && testRecipient === null) mode = "off";
  return { mode, testRecipient };
}
