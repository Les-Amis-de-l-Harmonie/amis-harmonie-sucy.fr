import { Check, Minus, X, type LucideIcon } from "lucide-react";
import type { PresenceStatus } from "@/db/types";
import { compareInstruments } from "@/lib/instruments";
import type { PresenceEvent } from "./musician-types";

export interface MusicianRow {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  primaryInstrument: string | null;
  isCurrentUser: boolean;
  statuses: Map<number, PresenceStatus | null>;
}

export interface CellVisual {
  Icon: LucideIcon;
  label: string;
  shapeClass: string;
}

export function getFullName(firstName: string | null, lastName: string | null): string {
  if (!firstName && !lastName) return "Anonyme";
  return [firstName, lastName].filter(Boolean).join(" ");
}

/**
 * Le tableau musicien ne doit rattacher un membre qu'à son instrument principal.
 * Le serveur applique déjà ce repli lors de la synthèse de l'effectif ; on le
 * répète ici pour rester sûr face à une réponse ancienne ou incohérente.
 */
function resolvePresencePrimaryInstrument(
  instruments: string[],
  primaryInstrument: string | null
): string | null {
  if (primaryInstrument !== null && instruments.includes(primaryInstrument)) {
    return primaryInstrument;
  }
  return instruments.slice().sort(compareInstruments)[0] ?? null;
}

/** Construit une ligne par musicien à partir des rosters de tous les événements, en
 * conservant l'ordre d'apparition fourni par l'API (déjà groupé par pupitre). Le
 * regroupement par pupitre visible dans le tableau est fait séparément par
 * `groupMembersByPupitre`, à partir de ces lignes. */
export function buildMusicianRows(
  events: PresenceEvent[],
  currentUserId: number | null
): MusicianRow[] {
  const order: number[] = [];
  const info = new Map<
    number,
    {
      firstName: string | null;
      lastName: string | null;
      instruments: string[];
      primaryInstrument: string | null;
    }
  >();
  const statuses = new Map<number, Map<number, PresenceStatus | null>>();

  for (const event of events) {
    for (const member of event.roster) {
      if (!info.has(member.userId)) {
        info.set(member.userId, {
          firstName: member.firstName,
          lastName: member.lastName,
          instruments: member.instruments,
          primaryInstrument: member.primaryInstrument,
        });
        order.push(member.userId);
      }
      let byEvent = statuses.get(member.userId);
      if (!byEvent) {
        byEvent = new Map<number, PresenceStatus | null>();
        statuses.set(member.userId, byEvent);
      }
      byEvent.set(event.id, member.status);
    }
  }

  return order.map((userId) => {
    const details = info.get(userId);
    const primaryInstrument = resolvePresencePrimaryInstrument(
      details?.instruments ?? [],
      details?.primaryInstrument ?? null
    );
    return {
      userId,
      firstName: details?.firstName ?? null,
      lastName: details?.lastName ?? null,
      // Une seule valeur est conservée : elle sert à la fois à l'affichage, au
      // regroupement et donc au compte affiché par pupitre.
      instruments: primaryInstrument === null ? [] : [primaryInstrument],
      primaryInstrument,
      isCurrentUser: userId === currentUserId,
      statuses: statuses.get(userId) ?? new Map<number, PresenceStatus | null>(),
    };
  });
}

/**
 * « Prénom N. » : le tableau mobile n'a de place que pour un nom très court.
 * Le nom complet reste disponible pour les lecteurs d'écran et en infobulle.
 */
export function getShortName(firstName: string | null, lastName: string | null): string {
  const first = firstName?.trim() ?? "";
  const lastInitial = Array.from(lastName?.trim() ?? "")[0]?.toLocaleUpperCase("fr-FR") ?? "";
  if (!first && !lastInitial) return "Anonyme";
  if (!lastInitial) return first;
  return first ? `${first} ${lastInitial}.` : `${lastInitial}.`;
}

export interface PupitreCounts {
  present: number;
  absent: number;
  noAnswer: number;
  /** Musiciens du pupitre attendus à cette prestation. */
  total: number;
}

/**
 * Décompte neutre d'un pupitre pour une prestation (« 3/6 » = 3 présents sur 6).
 * Un musicien qui n'apparaît pas dans l'effectif de cette prestation n'est pas compté ;
 * `status: null` compte comme « sans réponse », jamais comme absent.
 */
export function countPupitre(members: MusicianRow[], eventId: number): PupitreCounts {
  const counts: PupitreCounts = { present: 0, absent: 0, noAnswer: 0, total: 0 };
  for (const member of members) {
    if (!member.statuses.has(eventId)) continue;
    counts.total += 1;
    const status = member.statuses.get(eventId) ?? null;
    if (status === "present") counts.present += 1;
    else if (status === "absent") counts.absent += 1;
    else counts.noAnswer += 1;
  }
  return counts;
}

const WEEKDAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"] as const;
const WEEKDAYS_SHORT = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."] as const;
const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;
const MONTHS_SHORT = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
] as const;

export interface EventDateParts {
  weekday: string;
  weekdayShort: string;
  day: number;
  /** « 22 » ou « 05 », pour les formats à deux chiffres. */
  dayPadded: string;
  monthName: string;
  monthShort: string;
  monthPadded: string;
  year: number;
}

/**
 * Découpe une date `AAAA-MM-JJ` sans passer par un fuseau horaire : le jour de la
 * semaine ne doit jamais dépendre de l'appareil de la personne qui regarde.
 */
export function getEventDateParts(dateStr: string): EventDateParts | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const monthName = MONTHS[monthIndex];
  const monthShort = MONTHS_SHORT[monthIndex];
  if (monthName === undefined || monthShort === undefined) return null;
  const weekdayIndex = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  return {
    weekday: WEEKDAYS[weekdayIndex] ?? "",
    weekdayShort: WEEKDAYS_SHORT[weekdayIndex] ?? "",
    day,
    dayPadded: String(day).padStart(2, "0"),
    monthName,
    monthShort,
    monthPadded: String(monthIndex + 1).padStart(2, "0"),
    year,
  };
}

/** « 22 novembre » (l'année n'est ajoutée que si elle diffère de l'année en cours). */
export function formatEventDayLabel(dateStr: string, currentYear: number): string {
  const parts = getEventDateParts(dateStr);
  if (!parts) return dateStr;
  const base = `${parts.day} ${parts.monthName}`;
  return parts.year === currentYear ? base : `${base} ${parts.year}`;
}

/** Les trois états se distinguent par la forme ET l'icône, pas seulement la couleur :
 * cercle plein + coche pour présent, carré plein + croix pour absent, cercle en
 * pointillés + tiret pour sans réponse. */
export function getCellVisual(status: PresenceStatus | null): CellVisual {
  if (status === "present") {
    return {
      Icon: Check,
      label: "Présent",
      shapeClass: "rounded-full bg-success text-success-foreground shadow-sm",
    };
  }
  if (status === "absent") {
    return {
      Icon: X,
      label: "Absent",
      shapeClass: "rounded-md bg-destructive text-destructive-foreground shadow-sm",
    };
  }
  return {
    Icon: Minus,
    label: "Sans réponse",
    shapeClass:
      "rounded-full border-[1.5px] border-dashed border-muted-foreground/70 text-muted-foreground",
  };
}
