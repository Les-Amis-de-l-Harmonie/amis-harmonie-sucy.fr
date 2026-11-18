import type { NotificationSettings } from "@/db/types";
import { MUSICIAN_PRESENCE_MEMBER_QUERY, type PresenceRow } from "@/lib/presence";
import { dueReminderStages } from "./planning";
import type { ReminderClaim, ReminderTarget } from "./types";

interface EventReminderRow {
  id: number;
  title: string;
  date: string;
  time: string | null;
  response_deadline: string | null;
}

interface ReminderUserRow {
  userId: number;
  email: string | null;
  kind: string;
  firstName: string | null;
}

interface GuardianRecipientRow {
  childUserId: number;
  guardianUserId: number;
  email: string | null;
  firstName: string | null;
}

export interface ExistingNotificationKey {
  dedupeKey: string;
  status: string;
}

export interface RecentNotificationLogRow {
  id: number;
  createdAt: string;
  sentAt: string | null;
  status: string;
  kind: string;
  eventTitle: string | null;
  stage: number | null;
  recipientEmail: string;
  subjectUserIds: string | null;
  error: string | null;
}

export interface NotificationStore {
  getSettings(): Promise<NotificationSettings | null>;
  writeLastRun(at: string, summary: string): Promise<void>;
  getReminderTargets(today: string): Promise<ReminderTarget[]>;
  getExistingKeys(keys: string[]): Promise<ExistingNotificationKey[]>;
  reserveClaims(claims: ReminderClaim[]): Promise<Set<string>>;
  markSent(keys: string[]): Promise<void>;
  deleteClaims(keys: string[]): Promise<void>;
  getRecentLogs(): Promise<RecentNotificationLogRow[]>;
  getSubjectNames(userIds: number[]): Promise<Map<number, string>>;
}

interface NotificationD1Statement {
  bind(...values: Array<string | number | null>): NotificationD1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ meta: { changes: number; last_row_id: number } }>;
}

export interface NotificationD1Database {
  prepare(sql: string): NotificationD1Statement;
}

export function createNotificationStore(db: NotificationD1Database): NotificationStore {
  return {
    async getSettings() {
      return db.prepare("SELECT * FROM notification_settings WHERE id = 1").first<NotificationSettings>();
    },

    async writeLastRun(at, summary) {
      await db
        .prepare(
          `INSERT INTO notification_settings (id, last_run_at, last_run_summary)
           VALUES (1, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             last_run_at = excluded.last_run_at,
             last_run_summary = excluded.last_run_summary`
        )
        .bind(at, summary)
        .run();
    },

    async getReminderTargets(today) {
      const events = await db
        .prepare(
          `SELECT id, title, date, time, response_deadline
           FROM events
           WHERE presence_required = 1 AND date >= ?
           ORDER BY date ASC, id ASC`
        )
        .bind(today)
        .all<EventReminderRow>();
      const targets: ReminderTarget[] = [];

      for (const event of events.results ?? []) {
        const stages = dueReminderStages(event.date, event.response_deadline, today);
        if (stages.length === 0) continue;

        // L'effectif est celui du portail, et non celui de la grille admin (qui inclut
        // les ADMIN instrumentistes et pourrait doubler un compte MUSICIAN parallèle).
        const rows = await db.prepare(MUSICIAN_PRESENCE_MEMBER_QUERY).bind(event.id).all<PresenceRow>();
        const unanswered = new Map<number, PresenceRow>();
        for (const member of rows.results ?? []) {
          if (member.status === null && !unanswered.has(member.userId)) {
            unanswered.set(member.userId, member);
          }
        }
        if (unanswered.size === 0) continue;

        const childIds = Array.from(unanswered.keys());
        const accounts = await db
          .prepare(
            `SELECT u.id AS userId,
                    CASE WHEN u.kind = 'managed' THEN NULL ELSE u.email END AS email,
                    u.kind, mp.first_name AS firstName
             FROM users u
             LEFT JOIN musician_profiles mp ON mp.user_id = u.id
             WHERE u.id IN (SELECT value FROM json_each(?) WHERE type = 'integer')`
          )
          .bind(JSON.stringify(childIds))
          .all<ReminderUserRow>();
        const accountById = new Map((accounts.results ?? []).map((account) => [account.userId, account]));

        const guardians = await db
          .prepare(
            `SELECT gl.child_user_id AS childUserId, g.id AS guardianUserId,
                    CASE WHEN g.kind = 'managed' THEN NULL ELSE g.email END AS email,
                    gp.first_name AS firstName
             FROM guardian_links gl
             JOIN users g ON g.id = gl.guardian_user_id AND g.is_active = 1
             LEFT JOIN musician_profiles gp ON gp.user_id = g.id
             WHERE gl.child_user_id IN (SELECT value FROM json_each(?) WHERE type = 'integer')`
          )
          .bind(JSON.stringify(childIds))
          .all<GuardianRecipientRow>();
        const guardiansByChild = new Map<number, GuardianRecipientRow[]>();
        for (const guardian of guardians.results ?? []) {
          const linked = guardiansByChild.get(guardian.childUserId) ?? [];
          linked.push(guardian);
          guardiansByChild.set(guardian.childUserId, linked);
        }

        for (const [childUserId, member] of unanswered) {
          const account = accountById.get(childUserId);
          if (!account) continue;
          for (const stage of stages) {
            if (account.kind !== "managed" && account.email) {
              targets.push({
                eventId: event.id,
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
                responseDeadline: event.response_deadline,
                stage,
                recipientUserId: childUserId,
                recipientEmail: account.email,
                recipientName: account.firstName,
                recipientIsGuardian: false,
                subjectUserId: childUserId,
                subjectName: member.firstName?.trim() || "votre musicien",
              });
            }
            for (const guardian of guardiansByChild.get(childUserId) ?? []) {
              if (!guardian.email) continue;
              targets.push({
                eventId: event.id,
                eventTitle: event.title,
                eventDate: event.date,
                eventTime: event.time,
                responseDeadline: event.response_deadline,
                stage,
                recipientUserId: guardian.guardianUserId,
                recipientEmail: guardian.email,
                recipientName: guardian.firstName,
                recipientIsGuardian: true,
                subjectUserId: childUserId,
                subjectName: member.firstName?.trim() || "votre musicien",
              });
            }
          }
        }
      }
      return targets;
    },

    async getExistingKeys(keys) {
      if (keys.length === 0) return [];
      const rows = await db
        .prepare(
          `SELECT dedupe_key AS dedupeKey, status
           FROM notification_log
           WHERE dedupe_key IN (SELECT value FROM json_each(?) WHERE type = 'text')`
        )
        .bind(JSON.stringify(keys))
        .all<ExistingNotificationKey>();
      return rows.results ?? [];
    },

    async reserveClaims(claims) {
      if (claims.length === 0) return new Set();
      const payload = claims.map((claim) => ({
        dedupeKey: claim.dedupeKey,
        eventId: claim.eventId,
        stage: claim.stage,
        recipientUserId: claim.recipientUserId,
        recipientEmail: claim.recipientEmail,
        subjectUserIds: JSON.stringify(claim.subjectUserIds),
      }));
      const rows = await db
        .prepare(
          `INSERT INTO notification_log (
             dedupe_key, kind, event_id, stage, recipient_user_id, recipient_email,
             subject_user_ids, status, error, created_at, sent_at
           )
           SELECT json_extract(value, '$.dedupeKey'), 'presence',
                  json_extract(value, '$.eventId'), json_extract(value, '$.stage'),
                  json_extract(value, '$.recipientUserId'), json_extract(value, '$.recipientEmail'),
                  json_extract(value, '$.subjectUserIds'), 'pending', NULL, datetime('now'), NULL
           FROM json_each(?)
           WHERE 1
           ON CONFLICT(dedupe_key) DO NOTHING
           RETURNING dedupe_key AS dedupeKey`
        )
        .bind(JSON.stringify(payload))
        .all<{ dedupeKey: string }>();
      return new Set((rows.results ?? []).map((row) => row.dedupeKey));
    },

    async markSent(keys) {
      if (keys.length === 0) return;
      await db
        .prepare(
          `UPDATE notification_log
           SET status = 'sent', sent_at = datetime('now'), error = NULL
           WHERE dedupe_key IN (SELECT value FROM json_each(?) WHERE type = 'text')`
        )
        .bind(JSON.stringify(keys))
        .run();
    },

    async deleteClaims(keys) {
      if (keys.length === 0) return;
      await db
        .prepare(
          `DELETE FROM notification_log
           WHERE dedupe_key IN (SELECT value FROM json_each(?) WHERE type = 'text')`
        )
        .bind(JSON.stringify(keys))
        .run();
    },

    async getRecentLogs() {
      const rows = await db
        .prepare(
          `SELECT nl.id, nl.created_at AS createdAt, nl.sent_at AS sentAt, nl.status, nl.kind,
                  e.title AS eventTitle, nl.stage, nl.recipient_email AS recipientEmail,
                  nl.subject_user_ids AS subjectUserIds, nl.error
           FROM notification_log nl
           LEFT JOIN events e ON e.id = nl.event_id
           ORDER BY nl.created_at DESC, nl.id DESC
           LIMIT 50`
        )
        .all<RecentNotificationLogRow>();
      return rows.results ?? [];
    },

    async getSubjectNames(userIds) {
      if (userIds.length === 0) return new Map();
      const rows = await db
        .prepare(
          `SELECT u.id AS userId, p.first_name AS firstName, p.last_name AS lastName
           FROM users u LEFT JOIN musician_profiles p ON p.user_id = u.id
           WHERE u.id IN (SELECT value FROM json_each(?) WHERE type = 'integer')`
        )
        .bind(JSON.stringify(userIds))
        .all<{ userId: number; firstName: string | null; lastName: string | null }>();
      return new Map(
        (rows.results ?? []).map((row) => [
          row.userId,
          [row.firstName, row.lastName].map((part) => part?.trim() ?? "").filter(Boolean).join(" ") ||
            "Compte supprimé",
        ])
      );
    },
  };
}
