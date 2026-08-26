import type { Event } from "@/db/types";

/**
 * Requêtes de lecture publique de la table `events`.
 *
 * Depuis la migration 0013, `events` contient À LA FOIS les événements publics
 * et les prestations internes, distingués par la colonne `is_public`. Toute
 * lecture destinée au site public DOIT donc filtrer sur `is_public = 1`, sans
 * quoi les prestations internes fuitent vers les visiteurs.
 *
 * Ces requêtes sont regroupées ici plutôt qu'écrites en ligne parce qu'un filtre
 * inséré directement dans un fichier de routage peut disparaître silencieusement
 * lors d'une réécriture : c'est précisément ce qui est arrivé une fois.
 * `src/lib/__tests__/public-events.test.ts` verrouille leur contenu.
 *
 * Deux lectures de `events` ne sont VOLONTAIREMENT pas filtrées et ne figurent
 * donc pas ici :
 *  - `src/app/api/admin/r2-cleanup.ts` : filtrer y classerait les images des
 *    événements internes comme orphelines et les supprimerait définitivement ;
 *  - `src/app/admin/Dashboard.tsx` : compteur d'administration, pas une surface
 *    publique.
 */

/**
 * Liste de colonnes explicite pour l'API publique `/api/events`.
 *
 * Ne pas remplacer par `SELECT *` : la réponse exposerait alors `is_public`,
 * `presence_required`, `address` et `response_deadline`, c'est-à-dire
 * l'organisation interne des prestations.
 *
 * `is_past` est une colonne héritée (`migrations/0001_initial.sql`), absente de
 * `schema.sql` et inutilisée dans `src/` : elle est conservée uniquement pour que
 * la réponse JSON publique garde exactement la même forme qu'avant la migration.
 */
export const PUBLIC_EVENTS_API_QUERY =
  "SELECT id, title, image, location, description, date, time, price, is_past, " +
  "details_link, reservation_link, created_at " +
  "FROM events WHERE is_public = 1 ORDER BY date ASC";

/** Événements affichés sur la page d'accueil. */
export const PUBLIC_EVENTS_HOME_QUERY =
  "SELECT * FROM events WHERE is_public = 1 ORDER BY date ASC";

/** Événements à venir proposés à la réservation sur la page billetterie. */
export const PUBLIC_EVENTS_BILLETTERIE_QUERY =
  "SELECT * FROM events WHERE date >= ? AND reservation_link IS NOT NULL " +
  "AND is_public = 1 ORDER BY date ASC";

/** Événements publics à venir référencés dans le plan du site. */
export const PUBLIC_EVENTS_SITEMAP_QUERY =
  "SELECT id, created_at FROM events WHERE is_public = 1 AND date >= date('now') " +
  "ORDER BY date DESC";

/**
 * Forme exacte d'une ligne renvoyée par `PUBLIC_EVENTS_API_QUERY`.
 *
 * Typer cette requête avec `Event` serait un mensonge : les quatre colonnes
 * internes ne sont pas sélectionnées (elles vaudraient `undefined` à l'exécution
 * tout en étant déclarées présentes), et `is_past`, qui l'est, resterait
 * invisible pour TypeScript.
 */
export type PublicEventRow = Omit<
  Event,
  "is_public" | "presence_required" | "address" | "response_deadline"
> & { is_past: number | null };

/** Toutes les requêtes de lecture publique, pour les tests de non-régression. */
export const PUBLIC_EVENT_QUERIES = [
  PUBLIC_EVENTS_API_QUERY,
  PUBLIC_EVENTS_HOME_QUERY,
  PUBLIC_EVENTS_BILLETTERIE_QUERY,
  PUBLIC_EVENTS_SITEMAP_QUERY,
] as const;
