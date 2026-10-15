/**
 * Types et petites fonctions partagées par l'écran des réservations gratuites
 * (liste du Bureau et liste d'entrée imprimable). Contrat : voir l'API admin
 * `/api/admin/reservations`.
 */

export type ReservationStatus = "active" | "cancelled";
export type ReservationOrigin = "web" | "admin";

export interface AdminReservation {
  id: number;
  lastName: string | null;
  firstName: string | null;
  email: string | null;
  partySize: number;
  interests: string[];
  source: string | null;
  newsletterOptIn: boolean;
  status: ReservationStatus;
  origin: ReservationOrigin;
  confirmationSentAt: string | null;
  confirmationError: string | null;
  createdAt: string;
  updatedAt: string;
  anonymizedAt: string | null;
}

export interface BreakdownEntry {
  reservations: number;
  places: number;
}

export interface ReservationStats {
  reservations: number;
  places: number;
  newsletterOptIns: number;
  cancelled: number;
  confirmationErrors: number;
  byInterest: Record<string, BreakdownEntry>;
  bySource: Record<string, BreakdownEntry>;
}

export interface ReservationsPayload {
  stats: ReservationStats;
  reservations: AdminReservation[];
}

export type ConfirmationState = "sent" | "error" | "none";

export const ANONYMIZED_LABEL = "(anonymisé)";

const collator = new Intl.Collator("fr", { sensitivity: "base" });

/** Comparaison française insensible aux accents et à la casse. */
export function compareFr(a: string, b: string): number {
  return collator.compare(a, b);
}

/** Tri nom puis prénom ; les lignes sans nom (anonymisées) passent en dernier. */
export function compareByName(
  a: Pick<AdminReservation, "lastName" | "firstName">,
  b: Pick<AdminReservation, "lastName" | "firstName">
): number {
  const aEmpty = !a.lastName && !a.firstName;
  const bEmpty = !b.lastName && !b.firstName;
  if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
  return (
    compareFr(a.lastName ?? "", b.lastName ?? "") || compareFr(a.firstName ?? "", b.firstName ?? "")
  );
}

/** Réservations actives, triées pour la liste d'entrée. */
export function buildAttendeeList(reservations: AdminReservation[]): AdminReservation[] {
  return reservations.filter((r) => r.status === "active").sort(compareByName);
}

/** Lettre d'initiale (sans accent, en majuscule) pour les séparateurs de la liste imprimée. */
export function getInitial(lastName: string | null): string {
  const first = (lastName ?? "").trim().normalize("NFD").replace(/\p{M}/gu, "").charAt(0);
  return first ? first.toUpperCase() : "#";
}

export function getConfirmationState(r: AdminReservation): ConfirmationState {
  if (r.confirmationError) return "error";
  if (r.confirmationSentAt) return "sent";
  return "none";
}

export function getDisplayName(r: Pick<AdminReservation, "lastName" | "firstName">): string {
  const name = [r.firstName, r.lastName].filter(Boolean).join(" ");
  return name || ANONYMIZED_LABEL;
}

/** Les dates de D1 sont `YYYY-MM-DD HH:MM:SS` en UTC. */
export function parseDbDate(value: string): Date {
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value;
  return new Date(iso);
}

export function formatDateTimeFr(value: string): string {
  const date = parseDbDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPlaces(n: number): string {
  return `${n} place${n > 1 ? "s" : ""}`;
}

export function matchesSearch(r: AdminReservation, term: string): boolean {
  const needle = term.trim().toLocaleLowerCase("fr");
  if (!needle) return true;
  return [r.lastName, r.firstName, r.email]
    .filter((v): v is string => Boolean(v))
    .some((v) => v.toLocaleLowerCase("fr").includes(needle));
}

/** Lit le message d'erreur `{ error }` d'une réponse de l'API, ou renvoie le message par défaut. */
export async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "error" in body) {
      const message = (body as { error?: unknown }).error;
      if (typeof message === "string" && message) return message;
    }
  } catch {
    // corps vide ou illisible : message par défaut
  }
  return fallback;
}
