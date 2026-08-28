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

/** Indique si un instrument correspond à l'un des deux rôles de direction. */
export function isLeadershipInstrument(name: string): boolean {
  const normalisedName = name.toLowerCase().replaceAll("’", "'");
  return ORDERED_HARMONIE_INSTRUMENTS.slice(0, 2).some(
    (instrument) => instrument.toLowerCase().replaceAll("’", "'") === normalisedName
  );
}

/**
 * Résout l'instrument principal tel qu'un formulaire doit l'afficher.
 *
 * 0 instrument -> pas de principal. 1 -> automatique. 2+ -> doit faire partie des
 * instruments sélectionnés, sinon on renvoie `null` pour redemander le choix : c'est
 * ce `null` qui empêche d'enregistrer un pupitre fantôme.
 *
 * Ne pas confondre avec la résolution côté lecture (`src/lib/presence.ts`), qui retombe
 * volontairement sur le premier instrument détenu pour ne jamais laisser un membre
 * sans pupitre dans les tableaux.
 */
export function resolveDeclaredPrimaryInstrument(
  instruments: string[],
  primary: string | null | undefined
): string | null {
  if (instruments.length === 0) return null;
  if (instruments.length === 1) return instruments[0] ?? null;
  return primary && instruments.includes(primary) ? primary : null;
}

export interface HarmonieInstrumentValidation {
  instruments: string[];
  primary: string | null;
}

export function validateHarmonieInstruments(
  instruments: string[] | undefined,
  requestedPrimary: string | null | undefined
): HarmonieInstrumentValidation | string | null {
  if (instruments === undefined) return null;

  const cleanedInstruments: string[] = [];
  const seen = new Set<string>();
  for (const instrument of instruments) {
    const cleanedInstrument = instrument?.trim();
    if (cleanedInstrument && !seen.has(cleanedInstrument)) {
      seen.add(cleanedInstrument);
      cleanedInstruments.push(cleanedInstrument);
    }
  }

  if (cleanedInstruments.length === 0) return { instruments: [], primary: null };
  if (cleanedInstruments.length === 1) {
    return { instruments: cleanedInstruments, primary: cleanedInstruments[0] ?? null };
  }

  const primary = requestedPrimary?.trim() || null;
  if (primary === null || !cleanedInstruments.includes(primary)) {
    return "Avec au moins deux instruments, l'instrument principal est obligatoire et doit faire partie des instruments déclarés.";
  }
  return { instruments: cleanedInstruments, primary };
}

export function resolvePrimaryFromRows(
  rows: Array<{ instrument_name: string; is_primary: number }>
): string | null {
  const instruments = rows.map((row) => row.instrument_name).sort(compareInstruments);
  return (
    rows
      .filter((row) => row.is_primary === 1)
      .map((row) => row.instrument_name)
      .sort(compareInstruments)[0] ??
    instruments[0] ??
    null
  );
}

/** Compares instruments with the legacy priority and French locale tie-breaker. */
export function compareInstruments(a: string, b: string): number {
  const priorityA = getInstrumentPriority(a);
  const priorityB = getInstrumentPriority(b);
  if (priorityA !== priorityB) return priorityA - priorityB;
  return a.localeCompare(b, "fr");
}

export const INSTRUMENT_WITHOUT_SECTION_LABEL = "Sans pupitre renseigné";
