import type { NotificationMode } from "@/db/types";
import type { ReminderEmailModel } from "./email-model";

export type ReminderStage = 7 | 2;

/** Une réponse manquante pour un musicien, un événement et un palier. */
export interface ReminderTarget {
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventTime: string | null;
  eventLocation: string | null;
  responseDeadline: string | null;
  stage: ReminderStage;
  recipientUserId: number;
  recipientEmail: string;
  recipientName: string | null;
  recipientIsGuardian: boolean;
  subjectUserId: number;
  subjectName: string;
}

export interface ReminderSubject {
  userId: number;
  name: string;
}

/** Ligne dédupliquée et réservable indépendamment dans notification_log. */
export interface ReminderClaim {
  dedupeKey: string;
  eventId: number;
  stage: ReminderStage;
  recipientUserId: number;
  recipientEmail: string;
  subjects: ReminderSubject[];
  subjectUserIds: number[];
  subjectNames: string[];
  eventTitle: string;
  eventDate: string;
  eventTime: string | null;
  eventLocation: string | null;
  responseDeadline: string | null;
}

/** Une date à venir sans réponse pour un sujet, sans palier ni claim associé. */
export interface ReminderOtherEvent {
  subjectUserId: number;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  eventTime: string | null;
  eventLocation: string | null;
  responseDeadline: string | null;
}

/** Un seul message par destinataire peut réunir plusieurs enfants, événements et paliers. */
export interface PlannedReminder {
  recipientUserId: number;
  recipientEmail: string;
  recipientName: string | null;
  recipientIsGuardian: boolean;
  claims: ReminderClaim[];
  eventTitle: string;
  eventDate: string;
  stage: ReminderStage;
  stages: ReminderStage[];
  subjectNames: string[];
  subject: string;
  text: string;
  html: string;
  emailModel: ReminderEmailModel;
  otherEventsBySubject: ReminderOtherEvent[];
  otherEventsCount: number;
  today: string;
}

export interface ReminderPreviewItem {
  recipientEmail: string;
  recipientName: string | null;
  eventTitle: string;
  eventDate: string;
  stage: ReminderStage;
  stages: ReminderStage[];
  subjectNames: string[];
  subject: string;
  text: string;
  html: string;
  otherEventsCount: number;
  alreadySent: boolean;
}

export interface ReminderSendInput {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type ReminderSendResult = { ok: true; id: string } | { ok: false; error: string };
export type ReminderSender = (input: ReminderSendInput) => Promise<ReminderSendResult>;

export interface NotificationSettingsView {
  presenceRemindersMode: NotificationMode;
  testRecipient: string | null;
  lastRunAt: string | null;
  lastRunSummary: string | null;
  updatedAt: string;
}

export interface ReminderExecutionResult {
  mode: NotificationMode;
  planned: number;
  sent: number;
  capped: boolean;
  summary: string;
}
