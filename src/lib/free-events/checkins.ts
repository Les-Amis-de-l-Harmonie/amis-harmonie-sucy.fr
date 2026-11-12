/**
 * Pointage à l'entrée des événements gratuits (jour J).
 *
 * Contrat partagé entre l'API `/api/admin/reservations/checkins` et l'écran
 * `/admin/reservations/accueil`. Données pures : importable côté client et serveur,
 * aucun import de `cloudflare:workers` ici.
 *
 * Règles de concurrence (plusieurs téléphones) :
 * - pointer une réservation = « passer de `from` à `to` » ; le serveur refuse (409) si la
 *   valeur actuelle n'est plus `from`, pour ne jamais perdre ni compter deux fois un groupe ;
 * - les entrées sans réservation sont des ajouts purs (`delta`), sans vérification ;
 * - chaque requête porte un `opId` unique généré par le téléphone : un renvoi n'est
 *   jamais compté deux fois.
 */

export const CHECKIN_API = "/api/admin/reservations/checkins";
export const CHECKIN_PAGE = "/admin/reservations/accueil";
export const CHECKIN_POLL_INTERVAL_MS = 5_000;
/** Au-delà, l'écran signale que la liste n'est plus à jour. */
export const CHECKIN_STALE_AFTER_MS = 30_000;
/** Durée d'affichage du bouton « Annuler » après un pointage. */
export const CHECKIN_UNDO_WINDOW_MS = 10_000;
/** Valeur maximale du nombre de personnes pointées sur une réservation. */
export const CHECKIN_MAX_COUNT = 99;
/** Variation maximale du compteur sans réservation en une seule action. */
export const WALK_IN_MAX_DELTA = 20;
/** Seuil d'alerte de la jauge de la salle (part de la capacité). */
export const CAPACITY_ALERT_RATIO = 0.9;
/** Format accepté pour `opId` (compatible avec `crypto.randomUUID()`). */
export const OP_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export interface CheckinEntry {
  /** Horodatage ISO 8601 en UTC. */
  at: string;
  /** Variation : +2, −1… */
  delta: number;
  /** E-mail de l'admin qui a pointé. */
  by: string | null;
}

export interface CheckinReservation {
  id: number;
  lastName: string | null;
  firstName: string | null;
  /** E-mail complet, pour la recherche ; à afficher masqué avec `maskEmail()`. */
  email: string | null;
  partySize: number;
  status: "active" | "cancelled";
  /** Somme des pointages ; peut dépasser `partySize`. */
  checkedIn: number;
  /** Historique des pointages, du plus ancien au plus récent. */
  history: CheckinEntry[];
}

export interface CheckinTotals {
  /** Nombre de réservations actives. */
  reservations: number;
  /** Places des réservations actives. */
  reservedPlaces: number;
  /** Réservations (actives ou annulées) avec au moins une personne pointée. */
  reservationsArrived: number;
  /** Personnes pointées sur des réservations (actives ou annulées). */
  checkedIn: number;
  /** Entrées sans réservation. */
  walkIns: number;
  /** `checkedIn + walkIns`. */
  inHall: number;
}

/** Réponse de `GET CHECKIN_API?eventSlug=…`. Les réservations anonymisées sont exclues. */
export interface CheckinPayload {
  /** Heure du serveur, ISO 8601 UTC. */
  serverTime: string;
  event: { slug: string; title: string; capacity: number | null };
  reservations: CheckinReservation[];
  totals: CheckinTotals;
}

/** `POST CHECKIN_API` : passer une réservation de `from` à `to` personnes présentes. */
export interface ReservationCheckinRequest {
  kind: "reservation";
  eventSlug: string;
  opId: string;
  reservationId: number;
  /** Valeur affichée sur le téléphone au moment de l'action (0…CHECKIN_MAX_COUNT). */
  from: number;
  /** Nouvelle valeur voulue (0…CHECKIN_MAX_COUNT). */
  to: number;
}

/** `POST CHECKIN_API` : ajouter (ou retirer) des entrées sans réservation. */
export interface WalkInCheckinRequest {
  kind: "walk-in";
  eventSlug: string;
  opId: string;
  /** Entier non nul entre −WALK_IN_MAX_DELTA et WALK_IN_MAX_DELTA. */
  delta: number;
}

export type CheckinRequest = ReservationCheckinRequest | WalkInCheckinRequest;

/**
 * 200. `duplicate` vaut true quand `opId` avait déjà été enregistré (renvoi) ;
 * `from === to` est accepté sans rien écrire.
 */
export interface ReservationCheckinSuccess {
  success: true;
  reservationId: number;
  checkedIn: number;
  history: CheckinEntry[];
  duplicate: boolean;
}

/** 409 : la valeur a changé entre-temps (autre téléphone). Rien n'a été écrit. */
export interface ReservationCheckinConflict {
  error: string;
  conflict: "reservation";
  reservationId: number;
  checkedIn: number;
  history: CheckinEntry[];
}

/** 200. */
export interface WalkInCheckinSuccess {
  success: true;
  walkIns: number;
  duplicate: boolean;
}

/** 409 : le compteur passerait sous zéro. Rien n'a été écrit. */
export interface WalkInCheckinConflict {
  error: string;
  conflict: "walk-in";
  walkIns: number;
}

/* Autres réponses : 400 `{ error, fields? }`, 401 `{ error }`, 404 `{ error }`,
   405 `{ error }`, 500 `{ error }`. */

export type CheckinState = "none" | "partial" | "complete" | "over";

export function getCheckinState(checkedIn: number, partySize: number): CheckinState {
  if (checkedIn <= 0) return "none";
  if (checkedIn < partySize) return "partial";
  if (checkedIn === partySize) return "complete";
  return "over";
}

/** `jeanne.dupont@gmail.com` → `j•••@gmail.com`. */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at <= 0) return "•••";
  return `${email.charAt(0)}•••${email.slice(at)}`;
}

/** Minuscules, sans accents, tirets et apostrophes remplacés par des espaces. */
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[-'’‘`.,_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Chaque mot de la recherche doit apparaître dans le nom, le prénom ou l'e-mail,
 * dans n'importe quel ordre. Une recherche vide correspond à tout.
 */
export function matchesCheckinSearch(
  reservation: Pick<CheckinReservation, "lastName" | "firstName" | "email">,
  query: string
): boolean {
  const tokens = normalizeSearchText(query).split(" ").filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalizeSearchText(
    [reservation.lastName, reservation.firstName, reservation.email].filter(Boolean).join(" ")
  );
  const compactHaystack = haystack.replaceAll(" ", "");
  return tokens.every((token) => haystack.includes(token) || compactHaystack.includes(token));
}
