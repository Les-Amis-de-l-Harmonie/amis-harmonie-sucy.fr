import { isReservedEmail } from "@/db/types";
import { renderDigestHtml, renderReminderHtml } from "./emails/render-reminder-email";
import type {
  ReminderDigestEntry,
  ReminderDigestModel,
  ReminderEmailModel,
  ReminderEventLine,
} from "./email-model";
import type {
  PlannedReminder,
  ReminderClaim,
  ReminderOtherEvent,
  ReminderPreviewItem,
  ReminderStage,
  ReminderSubject,
  ReminderTarget,
} from "./types";

const REMINDER_CTA_URL = "https://amis-harmonie-sucy.fr/musician/disponibilites";
const REMINDER_REASON = "Vous recevez ce rappel car aucune réponse n'a été donnée.";

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

function frenchDate(value: string, weekday = false): string {
  const parsed = parseIsoDay(value);
  if (parsed === null) return value;
  return new Date(parsed).toLocaleDateString("fr-FR", {
    ...(weekday ? { weekday: "long" as const } : {}),
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function lineFromClaim(claim: ReminderClaim, today: string): ReminderEventLine {
  return eventLine(
    claim.eventId,
    claim.eventTitle,
    claim.eventDate,
    claim.eventTime,
    claim.eventLocation,
    claim.eventDressCode,
    claim.eventCallTime,
    claim.responseDeadline,
    today
  );
}

function lineFromOther(event: ReminderOtherEvent, today: string): ReminderEventLine {
  return eventLine(
    event.eventId,
    event.eventTitle,
    event.eventDate,
    event.eventTime,
    event.eventLocation,
    event.eventDressCode,
    event.eventCallTime,
    event.responseDeadline,
    today
  );
}

function eventLine(
  eventId: number,
  title: string,
  eventDate: string,
  eventTime: string | null,
  location: string | null,
  dressCode: string | null,
  callTime: string | null,
  responseDeadline: string | null,
  today: string
): ReminderEventLine {
  const deadline = responseDeadline ?? eventDate;
  const deadlineDays =
    parseIsoDay(deadline) !== null && parseIsoDay(today) !== null
      ? Math.round(((parseIsoDay(deadline) ?? 0) - (parseIsoDay(today) ?? 0)) / 86_400_000)
      : Number.POSITIVE_INFINITY;
  return {
    eventId,
    title,
    dateLabel: frenchDate(eventDate, true),
    timeLabel: eventTime?.trim() ? eventTime.trim().slice(0, 5) : null,
    location: location?.trim() || null,
    dressCode: dressCode?.trim() || null,
    callTimeLabel: callTime?.trim() || null,
    deadlineLabel: frenchDate(deadline),
    deadlineSoon: deadlineDays >= 0 && deadlineDays <= 2,
  };
}

function reminderSubject(
  recipientUserId: number,
  recipientIsGuardian: boolean,
  subjectNames: string[],
  claims: ReminderClaim[]
): string {
  // Un événement par titre d'objet ; les personnes concernées sont réunies plus bas,
  // sans modifier les réservations (claims), qui sont enregistrées telles quelles.
  const byEvent = new Map<number, ReminderClaim>();
  for (const claim of claims) {
    if (!byEvent.has(claim.eventId)) byEvent.set(claim.eventId, claim);
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
    (a, b) =>
      a.eventDate.localeCompare(b.eventDate) || a.eventTitle.localeCompare(b.eventTitle, "fr")
  );
  const quotedTitles = events.map((event) => `« ${event.eventTitle} »`).join(" et ");
  const severalEvents = events.length > 1;
  const severalSubjects = subjectNames.length > 1;
  const people = namesList(displaySubjectNames);
  return recipientIsGuardian
    ? `Rappel : ${severalEvents || severalSubjects ? "réponses attendues" : "réponse attendue"} pour ${people} – ${quotedTitles}`
    : `${severalEvents ? "Rappel : vos réponses" : "Rappel : votre réponse"} pour ${quotedTitles}`;
}

function modelForReminder(
  reminder: Pick<
    PlannedReminder,
    "recipientUserId" | "recipientName" | "claims" | "recipientIsGuardian"
  >,
  today: string,
  otherEvents: ReminderOtherEvent[]
): ReminderEmailModel {
  const subjects = new Map<number, ReminderSubject>();
  for (const claim of reminder.claims) {
    for (const subject of claim.subjects) {
      if (!subjects.has(subject.userId)) subjects.set(subject.userId, subject);
    }
  }
  const orderedSubjects = Array.from(subjects.values()).sort((a, b) => {
    if (a.userId === reminder.recipientUserId) return -1;
    if (b.userId === reminder.recipientUserId) return 1;
    return 0;
  });
  const reminderDueEventIds = new Set(reminder.claims.map((claim) => claim.eventId));
  const sections = orderedSubjects.map((subject) => {
    const applicableClaims = reminder.claims.filter((claim) =>
      claim.subjects.some((candidate) => candidate.userId === subject.userId)
    );
    const due = Array.from(
      new Map(applicableClaims.map((claim) => [claim.eventId, claim])).values()
    )
      .sort(
        (a, b) =>
          a.eventDate.localeCompare(b.eventDate) || a.eventTitle.localeCompare(b.eventTitle, "fr")
      )
      .map((claim) => lineFromClaim(claim, today));
    const dueEventIds = new Set(due.map((event) => event.eventId));
    const others = otherEvents
      .filter(
        (event) =>
          event.subjectUserId === subject.userId &&
          !dueEventIds.has(event.eventId) &&
          !reminderDueEventIds.has(event.eventId)
      )
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate) || a.eventId - b.eventId)
      .map((event) => lineFromOther(event, today));
    const isRecipient = subject.userId === reminder.recipientUserId;
    return {
      label: isRecipient ? "Pour vous" : `Pour ${subject.name}`,
      isRecipient,
      due,
      others,
    };
  });

  return {
    preheader: "Rappel de présence : des réponses sont attendues.",
    greeting: reminder.recipientName?.trim()
      ? `Bonjour ${reminder.recipientName.trim()},`
      : "Bonjour,",
    intro: "Voici les réponses de présence à compléter pour les prochaines dates.",
    sections,
    ctaUrl: REMINDER_CTA_URL,
    ctaLabel: "Répondre maintenant",
    reason: REMINDER_REASON,
  };
}

function textEventLine(line: ReminderEventLine): string {
  const when = `${line.dateLabel}${line.timeLabel ? ` à ${line.timeLabel}` : ""}`;
  const place = line.location ? ` · ${line.location}` : "";
  const practicalInfo = [
    line.dressCode ? `Tenue : ${line.dressCode}` : null,
    line.callTimeLabel ? `Rendez-vous : ${line.callTimeLabel}` : null,
  ].filter((value): value is string => value !== null);
  const practicalInfoText = practicalInfo.length > 0 ? ` ${practicalInfo.join(" · ")}.` : "";
  return `• « ${line.title} » — ${when}${place}. Réponse attendue avant le ${line.deadlineLabel}.${practicalInfoText}`;
}

function reminderText(model: ReminderEmailModel, recipientIsGuardian: boolean): string {
  const sectionTexts = model.sections
    .map((section) =>
      [
        section.label,
        ...section.due.map(textEventLine),
        ...(section.others.length > 0
          ? ["", "Autres dates sans réponse", ...section.others.map(textEventLine)]
          : []),
      ].join("\n")
    )
    .join("\n\n");
  return [
    model.greeting,
    "",
    model.intro,
    "",
    sectionTexts,
    "",
    model.reason,
    recipientIsGuardian
      ? "Pour répondre, connectez-vous à l'espace musicien avec votre adresse e-mail :"
      : "Pour répondre, rendez-vous dans votre espace musicien :",
    model.ctaUrl,
    "",
    "À bientôt,",
    "Les Amis de l'Harmonie de Sucy-en-Brie",
  ].join("\n");
}

function refreshReminder(
  reminder: PlannedReminder,
  today: string,
  otherEvents: ReminderOtherEvent[]
): PlannedReminder {
  const subjectIds = new Set(reminder.claims.flatMap((claim) => claim.subjectUserIds));
  const relevantOtherEvents = otherEvents.filter((event) => subjectIds.has(event.subjectUserId));
  const emailModel = modelForReminder(reminder, today, relevantOtherEvents);
  return {
    ...reminder,
    today,
    emailModel,
    otherEventsBySubject: relevantOtherEvents,
    otherEventsCount: emailModel.sections.reduce(
      (count, section) => count + section.others.length,
      0
    ),
    text: reminderText(emailModel, reminder.recipientIsGuardian),
    html: renderReminderHtml(emailModel),
  };
}

function buildPlannedReminder(
  recipientUserId: number,
  recipientEmail: string,
  recipientName: string | null,
  recipientIsGuardian: boolean,
  claims: ReminderClaim[],
  today: string
): PlannedReminder {
  const sortedClaims = [...claims].sort(
    (a, b) =>
      a.eventDate.localeCompare(b.eventDate) ||
      b.stage - a.stage ||
      a.eventTitle.localeCompare(b.eventTitle, "fr")
  );
  const subjectNames: string[] = [];
  for (const claim of sortedClaims) {
    for (const name of claim.subjectNames) addUnique(subjectNames, name);
  }
  const events: string[] = [];
  for (const claim of sortedClaims) addUnique(events, claim.eventTitle);
  const stages: ReminderStage[] = [];
  for (const claim of sortedClaims) addUnique(stages, claim.stage);
  stages.sort((a, b) => b - a);
  const base: PlannedReminder = {
    recipientUserId,
    recipientEmail,
    recipientName,
    recipientIsGuardian,
    claims: sortedClaims,
    eventTitle: events.join(" ; "),
    eventDate: sortedClaims[0]?.eventDate ?? "",
    stage: stages[0] ?? 7,
    stages,
    subjectNames,
    subject: reminderSubject(recipientUserId, recipientIsGuardian, subjectNames, sortedClaims),
    text: "",
    html: "",
    emailModel: {
      preheader: "",
      greeting: "",
      intro: "",
      sections: [],
      ctaUrl: REMINDER_CTA_URL,
      ctaLabel: "Répondre maintenant",
      reason: REMINDER_REASON,
    },
    otherEventsBySubject: [],
    otherEventsCount: 0,
    today,
  };
  return refreshReminder(base, today, []);
}

/** Regroupe les enfants/événements d'un même destinataire et fabrique une clé par palier. */
export function groupReminderTargets(targets: ReminderTarget[], today: string): PlannedReminder[] {
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
        eventLocation: target.eventLocation,
        eventDressCode: target.eventDressCode,
        eventCallTime: target.eventCallTime,
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
        Array.from(recipient.claims.values()),
        today
      )
    )
    .sort((a, b) => a.recipientEmail.localeCompare(b.recipientEmail));
}

/** Ajoute les autres dates en lecture seule à un rappel, sans leur associer de claim. */
export function withOtherEvents(
  reminder: PlannedReminder,
  events: ReminderOtherEvent[],
  today = reminder.today
): PlannedReminder {
  return refreshReminder(reminder, today, events);
}

/** Reconstruit le message après qu'une exécution concurrente a réservé certaines clés. */
export function reminderWithClaims(
  reminder: PlannedReminder,
  claims: ReminderClaim[]
): PlannedReminder {
  const rebuilt = buildPlannedReminder(
    reminder.recipientUserId,
    reminder.recipientEmail,
    reminder.recipientName,
    reminder.recipientIsGuardian,
    claims,
    reminder.today
  );
  return refreshReminder(rebuilt, reminder.today, reminder.otherEventsBySubject);
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
    html: reminder.html,
    otherEventsCount: reminder.otherEventsCount,
    alreadySent,
  };
}

export function buildTestDigest(
  reminders: PlannedReminder[],
  today: string
): { subject: string; text: string; html: string } {
  const entries: ReminderDigestEntry[] = reminders.map((reminder) => ({
    recipientEmail: reminder.recipientEmail,
    recipientName: reminder.recipientName,
    subject: reminder.subject,
    text: reminder.text,
  }));
  const intro =
    reminders.length > 0
      ? `${reminders.length} rappel(s) seraient envoyés aujourd'hui si les rappels étaient activés.`
      : "Aucun rappel ne serait envoyé aujourd'hui si les rappels étaient activés.";
  const model: ReminderDigestModel = {
    preheader: "Récapitulatif des rappels de présence",
    intro,
    entries,
    adminUrl: "https://amis-harmonie-sucy.fr/admin/emails",
  };
  const sections = reminders.map(
    (reminder) =>
      `Destinataire réel : ${reminder.recipientEmail}\nObjet : ${reminder.subject}\n\n${reminder.text}`
  );
  const text = [
    `Récapitulatif des rappels de présence du ${frenchDate(today)}.`,
    "Aucun message n'a été envoyé aux destinataires réels.",
    intro,
    "",
    ...(sections.length > 0 ? sections : ["Aucun rappel n'aurait été envoyé."]),
  ].join("\n\n");
  return {
    subject: `Essai des rappels de présence — ${today}`,
    text,
    html: renderDigestHtml(model),
  };
}
