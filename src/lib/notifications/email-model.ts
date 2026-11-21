/**
 * Données d'un e-mail de rappel de présence, indépendantes de sa mise en forme.
 * Calculées par planning.ts (lane logique) et rendues en HTML par
 * emails/render-reminder-email.ts (modèle MJML aux couleurs du site).
 */

/** Une date de l'agenda, déjà formatée en français pour l'affichage. */
export interface ReminderEventLine {
  eventId: number;
  title: string;
  /** Ex. « samedi 12 décembre 2026 ». */
  dateLabel: string;
  /** Ex. « 14:00 » ; null si l'heure n'est pas connue. */
  timeLabel: string | null;
  location: string | null;
  dressCode: string | null;
  callTimeLabel: string | null;
  /** Ex. « 23 novembre 2026 » : date limite de réponse (ou date de l'événement à défaut). */
  deadlineLabel: string;
  /** La date limite tombe dans les 2 jours (affichage plus appuyé). */
  deadlineSoon: boolean;
}

/** Ce qui concerne une personne : le destinataire lui-même (« vous ») ou un enfant. */
export interface ReminderEmailSection {
  /** « Pour vous » ou « Pour Jules ». */
  label: string;
  isRecipient: boolean;
  /** Dates qui déclenchent ce rappel (palier 7 ou 2 jours). Jamais vide. */
  due: ReminderEventLine[];
  /** Toutes les autres dates à venir encore sans réponse pour cette personne. */
  others: ReminderEventLine[];
}

export interface ReminderEmailModel {
  /** Texte de prévisualisation (preheader) affiché par les messageries. */
  preheader: string;
  /** « Bonjour Aurélie, » ou « Bonjour, ». */
  greeting: string;
  /** Une phrase d'introduction. */
  intro: string;
  /** Une section par personne concernée, le destinataire en premier s'il est concerné. */
  sections: ReminderEmailSection[];
  ctaUrl: string;
  ctaLabel: string;
  /** Pourquoi la personne reçoit ce message. */
  reason: string;
}

/** Une ligne du récapitulatif d'essai (mode Essai). */
export interface ReminderDigestEntry {
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  text: string;
}

export interface ReminderDigestModel {
  preheader: string;
  /** Ex. « 6 rappels partiraient aujourd'hui si les rappels étaient activés. » */
  intro: string;
  entries: ReminderDigestEntry[];
  adminUrl: string;
}
