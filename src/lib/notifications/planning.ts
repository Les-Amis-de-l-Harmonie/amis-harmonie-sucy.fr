import { isReservedEmail } from "@/db/types";
import type {
  PlannedReminder,
  ReminderClaim,
  ReminderPreviewItem,
  ReminderSubject,
  ReminderStage,
  ReminderTarget,
} from "./types";

export function isValidEmailAddress(value: string | null | undefined): value is string {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) &&
    !isReservedEmail(value)
  );
}

/** Paliers en fenêtres : 7 jours à J-3..J-7, puis 2 jours à J-0..J-2. */
export function dueReminderStages(
  eventDate: string,
  responseDeadline: string | null,
  today: string
): ReminderStage[] {
  const targetDate = responseDeadline ?? eventDate;
  const target = parseIsoDay(targetDate);
  const current = parseIsoDay(today);
  if (target === null || current === null) return [];
  const days = Math.round((target - current) / 86_400_000);
  if (days > 2 && days <= 7) return [7];
  if (days >= 0 && days <= 2) return [2];
  return [];
}

function parseIsoDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function addUnique<T>(values: T[], value: T): void {
  if (!values.includes(value)) values.push(value);
}

function claimKey(eventId: number, stage: ReminderStage, recipientUserId: number): string {
  return `presence:${eventId}:${stage}:${recipientUserId}`;
}

function namesList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "votre musicien";
  if (names.length === 2) return `${names[0]} et ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} et ${names[names.length - 1]}`;
}

function frenchDate(value: string): string {
  const parsed = parseIsoDay(value);
  if (parsed === null) return value;
  return new Date(parsed).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildContent(
  recipientUserId: number,
  recipientName: string | null,
  recipientIsGuardian: boolean,
  claims: ReminderClaim[]
): { subject: string; text: string; html: string; subjectNames: string[] } {
  const subjectNames: string[] = [];
  const byEvent = new Map<number, ReminderClaim>();
  for (const claim of claims) {
    for (const name of claim.subjectNames) addUnique(subjectNames, name);
    const existing = byEvent.get(claim.eventId);
    if (!existing) {
      byEvent.set(claim.eventId, {
        ...claim,
        subjects: claim.subjects.map((subject) => ({ ...subject })),
        subjectUserIds: [...claim.subjectUserIds],
        subjectNames: [...claim.subjectNames],
      });
      continue;
    }
    for (const subject of claim.subjects) {
      if (!existing.subjects.some((current) => current.userId === subject.userId)) {
        existing.subjects.push({ ...subject });
      }
    }
    existing.subjectUserIds = existing.subjects.map((subject) => subject.userId);
    existing.subjectNames = existing.subjects.map((subject) => subject.name);
  }

  const subjectsByUserId = new Map<number, ReminderSubject>();
  for (const claim of claims) {
    for (const subject of claim.subjects) {
      if (!subjectsByUserId.has(subject.userId)) subjectsByUserId.set(subject.userId, subject);
    }
  }
  const displaySubjectNames = Array.from(subjectsByUserId.values()).map((subject) =>
    recipientIsGuardian && subject.userId === recipientUserId ? "vous" : subject.name
  );
  const events = Array.from(byEvent.values()).sort(
    (a, b) => a.eventDate.localeCompare(b.eventDate) || a.eventTitle.localeCompare(b.eventTitle, "fr")
  );
  const quotedTitles = events.map((event) => `« ${event.eventTitle} »`).join(" et ");
  const severalEvents = events.length > 1;
  const people = namesList(displaySubjectNames);
  const subject = recipientIsGuardian
    ? `Rappel : ${severalEvents || subjectNames.length > 1 ? "réponses attendues" : "réponse attendue"} pour ${people} – ${quotedTitles}`
    : `${severalEvents ? "Rappel : vos réponses" : "Rappel : votre réponse"} pour ${quotedTitles}`;

  const greeting = recipientName?.trim() ? `Bonjour ${recipientName.trim()},` : "Bonjour,";
  const eventLines = events.map((event) => {
    const eventSubjectNames = event.subjects.map((subject) =>
      recipientIsGuardian && subject.userId === recipientUserId ? "vous" : subject.name
    );
    const subjectText = recipientIsGuardian
      ? `pour ${namesList(eventSubjectNames)}`
      : "de votre part";
    const time = event.eventTime ? ` à ${event.eventTime}` : "";
    const deadline = event.responseDeadline ?? event.eventDate;
    const bullet = severalEvents ? "• " : "";
    return `${bullet}Une réponse est attendue ${subjectText} pour « ${event.eventTitle} », le ${frenchDate(event.eventDate)}${time}. Date limite de réponse : ${frenchDate(deadline)}.`;
  });
  const text = [
    greeting,
    "",
    ...eventLines,
    "",
    "Vous recevez ce rappel car aucune réponse n'a été donnée.",
    recipientIsGuardian
      ? "Pour répondre, connectez-vous à l'espace musicien avec votre adresse e-mail :"
      : "Pour répondre, rendez-vous dans votre espace musicien :",
    "https://amis-harmonie-sucy.fr/musician/disponibilites",
    "",
    "À bientôt,",
    "Les Amis de l'Harmonie de Sucy-en-Brie",
  ].join("\n");
  const html = `<p>${escapeHtml(text).replaceAll("\n", "<br>\n")}</p>`;
  return { subject, text, html, subjectNames };
}

function buildPlannedReminder(
  recipientUserId: number,
  recipientEmail: string,
  recipientName: string | null,
  recipientIsGuardian: boolean,
  claims: ReminderClaim[]
): PlannedReminder {
  const sortedClaims = [...claims].sort(
    (a, b) => a.eventDate.localeCompare(b.eventDate) || b.stage - a.stage || a.eventTitle.localeCompare(b.eventTitle, "fr")
  );
  const content = buildContent(recipientUserId, recipientName, recipientIsGuardian, sortedClaims);
  const events: string[] = [];
  for (const claim of sortedClaims) addUnique(events, claim.eventTitle);
  const stages: ReminderStage[] = [];
  for (const claim of sortedClaims) addUnique(stages, claim.stage);
  stages.sort((a, b) => b - a);
  return {
    recipientUserId,
    recipientEmail,
    recipientName,
    recipientIsGuardian,
    claims: sortedClaims,
    eventTitle: events.join(" ; "),
    eventDate: sortedClaims[0]?.eventDate ?? "",
    stage: stages[0] ?? 7,
    stages,
    subjectNames: content.subjectNames,
    subject: content.subject,
    text: content.text,
    html: content.html,
  };
}

/** Regroupe les enfants/événements d'un même destinataire et fabrique une clé par palier. */
export function groupReminderTargets(targets: ReminderTarget[]): PlannedReminder[] {
  const recipients = new Map<
    string,
    {
      recipientUserId: number;
      recipientEmail: string;
      recipientName: string | null;
      recipientIsGuardian: boolean;
      claims: Map<string, ReminderClaim>;
    }
  >();

  for (const target of targets) {
    const email = target.recipientEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    const recipientKey = `${target.recipientUserId}:${email}`;
    let recipient = recipients.get(recipientKey);
    if (!recipient) {
      recipient = {
        recipientUserId: target.recipientUserId,
        recipientEmail: email,
        recipientName: target.recipientName?.trim() || null,
        recipientIsGuardian: target.recipientIsGuardian,
        claims: new Map(),
      };
      recipients.set(recipientKey, recipient);
    } else if (!recipient.recipientName && target.recipientName?.trim()) {
      recipient.recipientName = target.recipientName.trim();
    }
    recipient.recipientIsGuardian ||= target.recipientIsGuardian;

    const dedupeKey = claimKey(target.eventId, target.stage, target.recipientUserId);
    let claim = recipient.claims.get(dedupeKey);
    if (!claim) {
      claim = {
        dedupeKey,
        eventId: target.eventId,
        stage: target.stage,
        recipientUserId: target.recipientUserId,
        recipientEmail: email,
        subjects: [],
        subjectUserIds: [],
        subjectNames: [],
        eventTitle: target.eventTitle,
        eventDate: target.eventDate,
        eventTime: target.eventTime,
        responseDeadline: target.responseDeadline,
      };
      recipient.claims.set(dedupeKey, claim);
    }
    if (!claim.subjects.some((subject) => subject.userId === target.subjectUserId)) {
      claim.subjects.push({
        userId: target.subjectUserId,
        name: target.subjectName.trim() || "votre musicien",
      });
    }
    claim.subjectUserIds = claim.subjects.map((subject) => subject.userId);
    claim.subjectNames = claim.subjects.map((subject) => subject.name);
  }

  return Array.from(recipients.values())
    .map((recipient) =>
      buildPlannedReminder(
        recipient.recipientUserId,
        recipient.recipientEmail,
        recipient.recipientName,
        recipient.recipientIsGuardian,
        Array.from(recipient.claims.values())
      )
    )
    .sort((a, b) => a.recipientEmail.localeCompare(b.recipientEmail));
}

/** Reconstruit le texte après qu'une exécution concurrente a réservé seulement certaines clés. */
export function reminderWithClaims(
  reminder: PlannedReminder,
  claims: ReminderClaim[]
): PlannedReminder {
  return buildPlannedReminder(
    reminder.recipientUserId,
    reminder.recipientEmail,
    reminder.recipientName,
    reminder.recipientIsGuardian,
    claims
  );
}

export function toPreviewItem(
  reminder: PlannedReminder,
  alreadySent: boolean
): ReminderPreviewItem {
  return {
    recipientEmail: reminder.recipientEmail,
    recipientName: reminder.recipientName,
    eventTitle: reminder.eventTitle,
    eventDate: reminder.eventDate,
    stage: reminder.stage,
    stages: reminder.stages,
    subjectNames: reminder.subjectNames,
    subject: reminder.subject,
    text: reminder.text,
    alreadySent,
  };
}

export function buildTestDigest(
  reminders: PlannedReminder[],
  today: string
): { subject: string; text: string; html: string } {
  const sections = reminders.map(
    (reminder) =>
      `Destinataire réel : ${reminder.recipientEmail}\nObjet : ${reminder.subject}\n\n${reminder.text}`
  );
  const text = [
    `Récapitulatif des rappels de présence du ${frenchDate(today)}.`,
    "Aucun message n'a été envoyé aux destinataires réels.",
    "",
    ...(sections.length > 0 ? sections : ["Aucun rappel n'aurait été envoyé."]),
  ].join("\n\n");
  return {
    subject: `Essai des rappels de présence — ${today}`,
    text,
    html: `<p>${escapeHtml(text).replaceAll("\n", "<br>\n")}</p>`,
  };
}
