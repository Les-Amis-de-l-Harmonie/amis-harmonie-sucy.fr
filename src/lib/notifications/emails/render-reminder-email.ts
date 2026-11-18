import type {
  ReminderDigestEntry,
  ReminderDigestModel,
  ReminderEmailModel,
  ReminderEmailSection,
  ReminderEventLine,
} from "../email-model";
import { PRESENCE_DIGEST_HTML } from "./presence-digest-html";
import { PRESENCE_REMINDER_HTML } from "./presence-reminder-html";

/**
 * Rendu HTML des e-mails de rappel de présence.
 *
 * Les cadres sont des modèles MJML compilés au build (npm run emails:build) :
 * presence-reminder.mjml et presence-digest.mjml. Ici on ne fait que remplir des
 * `{{emplacements}}` : les valeurs simples sont échappées, et les blocs répétés
 * (cartes par personne, lignes d'événement, entrées du récapitulatif) sont des
 * fragments HTML en ligne construits avec des valeurs elles aussi échappées.
 */

// Couleurs du site (src/app/styles.css), assombries pour le texte : voir le .mjml.
const INK = "#1b2340";
const INK_SOFT = "#2e3550";
const MUTED = "#5d5d5d";
const LAVENDER = "#a2b0d8";
const LAVENDER_TINT = "#eef2fc";
const LAVENDER_BORDER = "#d6def3";
const URGENT_TEXT = "#7a4300";
const URGENT_BG = "#fff3df";
const URGENT_BORDER = "#e0a24a";
const FONT = "'Plus Jakarta Sans','Segoe UI',Helvetica,Arial,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Seuls les liens http(s) deviennent des boutons : tout le reste est neutralisé. */
function safeUrl(value: string): string {
  return /^https?:\/\//i.test(value.trim()) ? value.trim() : "#";
}

/**
 * Remplit les `{{clés}}` en un seul passage : une valeur injectée n'est jamais relue,
 * donc un titre d'événement contenant « {{reason}} » reste du texte.
 */
function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

function joinParts(parts: (string | null | undefined)[], separator: string): string {
  return parts.filter((part): part is string => !!part && part.trim() !== "").join(separator);
}

// --- Rappel : cartes par personne -------------------------------------------------

function dueLineHtml(line: ReminderEventLine): string {
  const when = joinParts(
    [line.timeLabel ? `${line.dateLabel} à ${line.timeLabel}` : line.dateLabel, line.location],
    " · "
  );
  const deadline = `Réponse attendue avant le ${line.deadlineLabel}`;
  const deadlineHtml = line.deadlineSoon
    ? `<span style="display:inline-block;margin:6px 0 0;padding:3px 10px;border-radius:999px;background:${URGENT_BG};border:1px solid ${URGENT_BORDER};color:${URGENT_TEXT};font-size:14px;line-height:20px;font-weight:700;">${escapeHtml(deadline)}</span>`
    : `<span style="display:inline-block;margin:6px 0 0;font-size:14px;line-height:20px;font-weight:600;color:${INK_SOFT};">${escapeHtml(deadline)}</span>`;
  const accent = line.deadlineSoon ? URGENT_BORDER : LAVENDER;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;"><tr><td style="border-left:4px solid ${accent};padding:2px 0 2px 12px;font-family:${FONT};"><div style="font-size:17px;line-height:24px;font-weight:800;color:${INK};">${escapeHtml(line.title)}</div><div style="font-size:14px;line-height:21px;color:${INK_SOFT};">${escapeHtml(when)}</div>${deadlineHtml}</td></tr></table>`;
}

function otherLineHtml(line: ReminderEventLine): string {
  const when = joinParts(
    [line.timeLabel ? `${line.dateLabel} à ${line.timeLabel}` : line.dateLabel, line.location],
    " · "
  );
  return `<tr><td width="14" valign="top" style="padding:3px 0 0;font-family:${FONT};font-size:14px;line-height:20px;color:${LAVENDER};">&bull;</td><td style="padding:3px 0;font-family:${FONT};font-size:14px;line-height:20px;color:${INK_SOFT};"><strong style="color:${INK};">${escapeHtml(line.title)}</strong> · ${escapeHtml(when)}<br /><span style="font-size:13px;color:${MUTED};">Réponse avant le ${escapeHtml(line.deadlineLabel)}</span></td></tr>`;
}

function sectionHtml(section: ReminderEmailSection): string {
  const due = section.due.map(dueLineHtml).join("");
  const others =
    section.others.length > 0
      ? `<div style="margin:6px 0 0;padding:12px 0 0;border-top:1px solid ${LAVENDER_BORDER};"><div style="margin:0 0 4px;font-family:${FONT};font-size:12px;line-height:18px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:${MUTED};">Autres dates sans réponse</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${section.others.map(otherLineHtml).join("")}</table></div>`
      : "";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border:1px solid ${LAVENDER_BORDER};border-radius:12px;background:#ffffff;"><tr><td style="padding:10px 16px;background:${LAVENDER_TINT};border-radius:12px 12px 0 0;font-family:${FONT};font-size:15px;line-height:22px;font-weight:800;color:${INK};">${escapeHtml(section.label)}</td></tr><tr><td style="padding:16px 16px 8px;">${due}${others}</td></tr></table>`;
}

export function renderReminderHtml(model: ReminderEmailModel): string {
  return fillTemplate(PRESENCE_REMINDER_HTML, {
    preheader: escapeHtml(model.preheader),
    greeting: escapeHtml(model.greeting),
    intro: escapeHtml(model.intro),
    sections: model.sections.map(sectionHtml).join(""),
    ctaUrl: escapeHtml(safeUrl(model.ctaUrl)),
    ctaLabel: escapeHtml(model.ctaLabel),
    reason: escapeHtml(model.reason),
  });
}

// --- Récapitulatif d'essai ---------------------------------------------------------

function digestEntryHtml(entry: ReminderDigestEntry): string {
  const who = entry.recipientName
    ? `${escapeHtml(entry.recipientName)} <span style="font-weight:400;color:${MUTED};">&lt;${escapeHtml(entry.recipientEmail)}&gt;</span>`
    : escapeHtml(entry.recipientEmail);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;border:1px solid ${LAVENDER_BORDER};border-radius:12px;background:#ffffff;"><tr><td style="padding:10px 16px;background:${LAVENDER_TINT};border-radius:12px 12px 0 0;font-family:${FONT};font-size:14px;line-height:20px;font-weight:800;color:${INK};word-break:break-word;">${who}</td></tr><tr><td style="padding:12px 16px 14px;font-family:${FONT};"><div style="margin:0 0 8px;font-size:15px;line-height:22px;font-weight:700;color:${INK};">${escapeHtml(entry.subject)}</div><div style="font-size:14px;line-height:21px;color:${INK_SOFT};white-space:pre-wrap;word-break:break-word;">${escapeHtml(entry.text)}</div></td></tr></table>`;
}

export function renderDigestHtml(model: ReminderDigestModel): string {
  return fillTemplate(PRESENCE_DIGEST_HTML, {
    preheader: escapeHtml(model.preheader),
    intro: escapeHtml(model.intro),
    entries:
      model.entries.length > 0
        ? model.entries.map(digestEntryHtml).join("")
        : `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:22px;color:${MUTED};">Aucun rappel à envoyer aujourd'hui.</p>`,
    adminUrl: escapeHtml(safeUrl(model.adminUrl)),
  });
}
