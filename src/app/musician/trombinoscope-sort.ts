import { getInstrumentPriority } from "@/lib/instruments";

export type TrombinoscopeSort = "name" | "seniority" | "instrument";

export interface TrombinoscopeEntry {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  avatar: string | null;
  harmonie_start_date: string | null;
  instruments: string[];
  image_consent: number;
}

export interface Anciennete {
  dateLabel: string;
  durationLabel: string | null;
}

export function getAnciennete(startDate: string | null, now = new Date()): Anciennete | null {
  if (!startDate) return null;

  const start = new Date(startDate);
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();

  if (now.getDate() < start.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} an${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} mois`);

  return {
    dateLabel: start.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    durationLabel: parts.length > 0 ? `(${parts.join(" et ")})` : null,
  };
}

function compareNames(a: TrombinoscopeEntry, b: TrombinoscopeEntry): number {
  const lastNameA = (a.last_name || "").toLowerCase();
  const lastNameB = (b.last_name || "").toLowerCase();
  if (lastNameA !== lastNameB) return lastNameA.localeCompare(lastNameB, "fr");

  const firstNameA = (a.first_name || "").toLowerCase();
  const firstNameB = (b.first_name || "").toLowerCase();
  return firstNameA.localeCompare(firstNameB, "fr");
}

export function compareTrombinoscopeEntries(
  a: TrombinoscopeEntry,
  b: TrombinoscopeEntry,
  sortBy: TrombinoscopeSort
): number {
  if (sortBy === "name") return compareNames(a, b);

  if (sortBy === "seniority") {
    if (!a.harmonie_start_date && !b.harmonie_start_date) return 0;
    if (!a.harmonie_start_date) return 1;
    if (!b.harmonie_start_date) return -1;
    return a.harmonie_start_date.localeCompare(b.harmonie_start_date);
  }

  const aHasInstruments = a.instruments.length > 0;
  const bHasInstruments = b.instruments.length > 0;
  if (aHasInstruments !== bHasInstruments) return aHasInstruments ? -1 : 1;
  if (!aHasInstruments) return compareNames(a, b);

  const priorityA = Math.min(...a.instruments.map(getInstrumentPriority));
  const priorityB = Math.min(...b.instruments.map(getInstrumentPriority));
  if (priorityA !== priorityB) return priorityA - priorityB;

  const bestInstrumentA = a.instruments.reduce((best, instrument) =>
    getInstrumentPriority(instrument) < getInstrumentPriority(best) ? instrument : best
  );
  const bestInstrumentB = b.instruments.reduce((best, instrument) =>
    getInstrumentPriority(instrument) < getInstrumentPriority(best) ? instrument : best
  );
  if (bestInstrumentA !== bestInstrumentB) {
    return bestInstrumentA.localeCompare(bestInstrumentB, "fr");
  }

  return compareNames(a, b);
}

export function sortTrombinoscopeEntries(
  entries: TrombinoscopeEntry[],
  sortBy: TrombinoscopeSort
): TrombinoscopeEntry[] {
  return [...entries].sort((a, b) => compareTrombinoscopeEntries(a, b, sortBy));
}
