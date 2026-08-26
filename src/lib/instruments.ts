import { HARMONIE_INSTRUMENTS } from "@/db/types";

// HARMONIE_INSTRUMENTS se termine par « Chef d'orchestre » puis « Chef adjoint » :
// c'est déjà l'ordre de priorité historique (0 puis 1). Ne pas inverser.
const leadershipInstruments = HARMONIE_INSTRUMENTS.slice(-2);
const percussionInstrument = HARMONIE_INSTRUMENTS.find((instrument) =>
  instrument.toLowerCase().startsWith("percussion")
);
const remainingInstruments = HARMONIE_INSTRUMENTS.filter(
  (instrument) => !leadershipInstruments.includes(instrument) && instrument !== percussionInstrument
).sort((a, b) => a.localeCompare(b, "fr"));

/** Instruments in the order used by the musician-facing lists. */
export const ORDERED_HARMONIE_INSTRUMENTS: readonly string[] = [
  ...leadershipInstruments,
  ...(percussionInstrument ? [percussionInstrument] : []),
  ...remainingInstruments,
];

const priorityByInstrument = new Map(
  ORDERED_HARMONIE_INSTRUMENTS.slice(0, 3).map((instrument, priority) => [
    instrument.toLowerCase(),
    priority,
  ])
);

/** Returns the legacy priority, including its 999 fallback for other instruments. */
export function getInstrumentPriority(name: string): number {
  return priorityByInstrument.get(name.toLowerCase()) ?? 999;
}

/** Compares instruments with the legacy priority and French locale tie-breaker. */
export function compareInstruments(a: string, b: string): number {
  const priorityA = getInstrumentPriority(a);
  const priorityB = getInstrumentPriority(b);
  if (priorityA !== priorityB) return priorityA - priorityB;
  return a.localeCompare(b, "fr");
}

export const INSTRUMENT_WITHOUT_SECTION_LABEL = "Sans pupitre renseigné";
