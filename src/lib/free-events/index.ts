import { RENCONTRE_HARMONIES_2026 } from "./rencontre-harmonies-2026";

import type { FreeEventConfig } from "./rencontre-harmonies-2026";

export * from "./rencontre-harmonies-2026";

/** Événements gratuits sur réservation. Le plus récent en premier. */
export const FREE_EVENTS: FreeEventConfig[] = [RENCONTRE_HARMONIES_2026];

export function getFreeEvent(slug: string): FreeEventConfig | undefined {
  return FREE_EVENTS.find((event) => event.slug === slug);
}
