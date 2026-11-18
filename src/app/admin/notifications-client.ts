import type { NotificationMode } from "@/db/types";
import { formatParisDateTime } from "./users-shared";

/** Réglages renvoyés par `GET /api/admin/notifications`. */
export interface NotificationSettingsView {
  presenceRemindersMode: NotificationMode;
  testRecipient: string | null;
  lastRunAt: string | null;
  lastRunSummary: string | null;
  updatedAt?: string;
}

export interface NotificationLogItem {
  id: number;
  createdAt: string;
  sentAt: string | null;
  status: "pending" | "sent";
  kind: string;
  eventTitle: string | null;
  stage: number | null;
  recipientEmail: string;
  subjectNames: string[];
  error: string | null;
}

export interface NotificationsOverview {
  settings: NotificationSettingsView;
  /** Vrai pour un super-administrateur : seul à pouvoir modifier. */
  canEdit: boolean;
  log: NotificationLogItem[];
}

export interface PreviewItem {
  recipientEmail: string;
  recipientName: string | null;
  eventTitle: string;
  eventDate: string;
  stage: 7 | 2;
  stages: number[];
  subjectNames: string[];
  subject: string;
  text: string;
  alreadySent: boolean;
}

export interface NotificationsPreview {
  today: string;
  items: PreviewItem[];
  capped: boolean;
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T & { error?: string };
}

const GENERIC_ERROR = "Une erreur est survenue. Réessayez dans un instant.";

async function call<T>(url: string, init?: Parameters<typeof fetch>[1]): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, init);
    let data: unknown = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    return { ok: response.ok, status: response.status, data: data as T & { error?: string } };
  } catch {
    return { ok: false, status: 0, data: { error: GENERIC_ERROR } as T & { error?: string } };
  }
}

export function apiError(result: ApiResult<unknown>): string {
  return result.data.error || GENERIC_ERROR;
}

export function fetchNotifications() {
  return call<Partial<NotificationsOverview>>("/api/admin/notifications");
}

export function saveNotificationSettings(input: {
  presenceRemindersMode: NotificationMode;
  testRecipient: string | null;
}) {
  return call<{ success?: boolean; settings?: NotificationSettingsView }>(
    "/api/admin/notifications",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
}

export function fetchPreview() {
  return call<Partial<NotificationsPreview>>("/api/admin/notifications?action=preview");
}

export function sendTestNow() {
  return call<{ success?: boolean; sentTo?: string; itemCount?: number }>(
    "/api/admin/notifications?action=send-test",
    { method: "POST" }
  );
}

// --- Textes et calculs d'affichage -------------------------------------------------

export const MODE_LABELS: Record<NotificationMode, string> = {
  off: "Désactivé",
  test: "Essai",
  on: "Activé",
};

/** Une adresse d'essai exploitable : le serveur refuse le reste et traite le mode Essai comme Désactivé. */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Date lisible d'une valeur SQLite ou ISO, ou `null` si elle est invalide. */
export function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const formatted = formatParisDateTime(value);
  if (formatted.includes("NaN")) return null;
  const [day, time] = formatted.split(" ");
  return `${day} à ${time}`;
}

/** Au-delà de ce délai sans exécution, la tâche quotidienne est suspecte. */
export const STALE_RUN_HOURS = 36;

export function hoursSince(
  value: string | null | undefined,
  now: number = Date.now()
): number | null {
  if (!value) return null;
  const parsed = /[TZ]/.test(value) ? new Date(value) : new Date(`${value.replace(" ", "T")}Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return (now - parsed.getTime()) / 3_600_000;
}

export function stageLabel(stages: number[], stage: number | null): string {
  const list = stages.length > 0 ? stages : stage !== null ? [stage] : [];
  if (list.length === 0) return "—";
  const sorted = [...list].sort((a, b) => b - a);
  return sorted.length === 1 ? `${sorted[0]} jours avant` : `${sorted.join(" et ")} jours avant`;
}
