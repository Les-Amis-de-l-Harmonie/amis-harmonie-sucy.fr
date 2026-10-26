import { isEventClosed } from "./rencontre-harmonies-2026";

import type { FreeEventConfig } from "./rencontre-harmonies-2026";
import type { FreeReservationOrigin, FreeReservationStatus } from "@/db/types";

export interface ReservationStatsRow {
  party_size: number;
  interests: string;
  source: string | null;
  newsletter_opt_in: number;
  unsubscribed_at: string | null;
  status: FreeReservationStatus;
  origin: FreeReservationOrigin;
  has_email: number;
  confirmation_sent_at: string | null;
  has_confirmation_error: number;
  anonymized_at: string | null;
  created_at: string;
}

interface ReservationPlacesCount {
  reservations: number;
  places: number;
}

interface LabeledReservationPlacesCount extends ReservationPlacesCount {
  label: string;
}

export interface ReservationStats {
  event: {
    slug: string;
    title: string;
    startsAt: string;
    closesAt: string;
    closed: boolean;
  };
  generatedAt: string;
  totals: {
    reservations: number;
    places: number;
    averagePartySize: number;
    cancelledReservations: number;
    cancelledPlaces: number;
    allReservations: number;
  };
  newsletter: {
    optIns: number;
    optInPlaces: number;
    unsubscribed: number;
    optInRate: number;
  };
  confirmations: {
    sent: number;
    failed: number;
    notSent: number;
    withoutEmail: number;
  };
  byOrigin: Record<FreeReservationOrigin, ReservationPlacesCount>;
  byPartySize: Record<string, number>;
  byInterest: Record<string, LabeledReservationPlacesCount>;
  bySource: Record<string, LabeledReservationPlacesCount>;
  byDay: Array<{
    date: string;
    reservations: number;
    places: number;
    cumulativeReservations: number;
    cumulativePlaces: number;
  }>;
  recent: {
    last24Hours: ReservationPlacesCount;
    last7Days: ReservationPlacesCount;
  };
  firstReservationAt: string | null;
  lastReservationAt: string | null;
}

function parseInterests(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((item): item is string => typeof item === "string"))]
      : [];
  } catch {
    return [];
  }
}

function parseCreatedAt(value: string): Date {
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  const withUtc = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized) ? normalized : `${normalized}Z`;
  return new Date(withUtc);
}

function parisCalendarDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: "year" | "month" | "day") =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function increment(aggregate: ReservationPlacesCount, partySize: number): void {
  aggregate.reservations += 1;
  aggregate.places += partySize;
}

function incrementLabeled(
  aggregate: Record<string, LabeledReservationPlacesCount>,
  key: string,
  label: string,
  partySize: number
): void {
  aggregate[key] ??= { label, reservations: 0, places: 0 };
  increment(aggregate[key], partySize);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function computeReservationStats(
  event: FreeEventConfig,
  rows: ReservationStatsRow[],
  now: Date = new Date()
): ReservationStats {
  const active = rows.filter((row) => row.status === "active");
  const cancelled = rows.filter((row) => row.status === "cancelled");
  const places = active.reduce((sum, row) => sum + row.party_size, 0);
  const cancelledPlaces = cancelled.reduce((sum, row) => sum + row.party_size, 0);
  const optIns = active.filter(
    (row) => row.newsletter_opt_in === 1 && row.unsubscribed_at === null
  );

  const byOrigin: ReservationStats["byOrigin"] = {
    web: { reservations: 0, places: 0 },
    admin: { reservations: 0, places: 0 },
  };
  const byPartySize: Record<string, number> = {};
  for (let size = 1; size <= event.form.maxPartySize; size += 1) {
    byPartySize[String(size)] = 0;
  }

  const byInterest: ReservationStats["byInterest"] = {
    none: { label: "Aucun choix", reservations: 0, places: 0 },
  };
  for (const interest of event.form.interests) {
    byInterest[interest.code] = { label: interest.label, reservations: 0, places: 0 };
  }

  const bySource: ReservationStats["bySource"] = {
    none: { label: "Non renseigné", reservations: 0, places: 0 },
  };
  for (const source of event.form.sources) {
    bySource[source.code] = { label: source.label, reservations: 0, places: 0 };
  }

  const byDate = new Map<string, ReservationPlacesCount>();
  const last24Hours: ReservationPlacesCount = { reservations: 0, places: 0 };
  const last7Days: ReservationPlacesCount = { reservations: 0, places: 0 };
  const nowMs = now.getTime();
  let firstCreatedAt: Date | null = null;
  let lastCreatedAt: Date | null = null;

  for (const row of active) {
    byOrigin[row.origin] ??= { reservations: 0, places: 0 };
    increment(byOrigin[row.origin], row.party_size);
    const partySizeKey = String(row.party_size);
    byPartySize[partySizeKey] = (byPartySize[partySizeKey] ?? 0) + 1;

    const interests = parseInterests(row.interests);
    if (interests.length === 0) {
      incrementLabeled(byInterest, "none", "Aucun choix", row.party_size);
    } else {
      for (const code of interests) {
        const label = event.form.interests.find((item) => item.code === code)?.label ?? code;
        incrementLabeled(byInterest, code, label, row.party_size);
      }
    }

    const source = row.source ?? "none";
    const sourceLabel =
      source === "none"
        ? "Non renseigné"
        : (event.form.sources.find((item) => item.code === source)?.label ?? source);
    incrementLabeled(bySource, source, sourceLabel, row.party_size);

    const createdAt = parseCreatedAt(row.created_at);
    const createdAtMs = createdAt.getTime();
    const date = parisCalendarDate(createdAt);
    const daily = byDate.get(date) ?? { reservations: 0, places: 0 };
    increment(daily, row.party_size);
    byDate.set(date, daily);

    if (createdAtMs >= nowMs - 24 * 60 * 60 * 1000 && createdAtMs <= nowMs) {
      increment(last24Hours, row.party_size);
    }
    if (createdAtMs >= nowMs - 7 * 24 * 60 * 60 * 1000 && createdAtMs <= nowMs) {
      increment(last7Days, row.party_size);
    }

    if (firstCreatedAt === null || createdAtMs < firstCreatedAt.getTime())
      firstCreatedAt = createdAt;
    if (lastCreatedAt === null || createdAtMs > lastCreatedAt.getTime()) lastCreatedAt = createdAt;
  }

  let cumulativeReservations = 0;
  let cumulativePlaces = 0;
  const byDay = [...byDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, daily]) => {
      cumulativeReservations += daily.reservations;
      cumulativePlaces += daily.places;
      return {
        date,
        ...daily,
        cumulativeReservations,
        cumulativePlaces,
      };
    });

  return {
    event: {
      slug: event.slug,
      title: event.title,
      startsAt: event.startsAt,
      closesAt: event.closesAt,
      closed: isEventClosed(event, now),
    },
    generatedAt: now.toISOString(),
    totals: {
      reservations: active.length,
      places,
      averagePartySize: active.length === 0 ? 0 : round(places / active.length, 2),
      cancelledReservations: cancelled.length,
      cancelledPlaces,
      allReservations: rows.length,
    },
    newsletter: {
      optIns: optIns.length,
      optInPlaces: optIns.reduce((sum, row) => sum + row.party_size, 0),
      // Une désinscription depuis l'admin remet newsletter_opt_in à 0 et date unsubscribed_at.
      unsubscribed: active.filter((row) => row.unsubscribed_at !== null).length,
      optInRate: active.length === 0 ? 0 : round(optIns.length / active.length, 3),
    },
    confirmations: {
      sent: active.filter((row) => row.confirmation_sent_at !== null).length,
      failed: active.filter((row) => row.has_confirmation_error === 1).length,
      notSent: active.filter(
        (row) =>
          row.has_email === 1 &&
          row.confirmation_sent_at === null &&
          row.has_confirmation_error !== 1
      ).length,
      withoutEmail: active.filter((row) => row.has_email === 0).length,
    },
    byOrigin,
    byPartySize,
    byInterest,
    bySource,
    byDay,
    recent: { last24Hours, last7Days },
    firstReservationAt: firstCreatedAt?.toISOString() ?? null,
    lastReservationAt: lastCreatedAt?.toISOString() ?? null,
  };
}
