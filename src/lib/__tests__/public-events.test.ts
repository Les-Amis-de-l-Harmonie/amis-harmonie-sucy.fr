// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_EVENT_QUERIES,
  PUBLIC_EVENTS_API_QUERY,
  PUBLIC_EVENTS_BILLETTERIE_QUERY,
  PUBLIC_EVENTS_HOME_QUERY,
  PUBLIC_EVENTS_SITEMAP_QUERY,
} from "../public-events";

// Depuis la migration 0013, la table `events` contient à la fois les événements
// publics et les prestations internes. Ces tests verrouillent le filtre qui les
// sépare : il avait déjà disparu une fois lors d'une réécriture de `worker.tsx`,
// sans qu'aucun test ne s'en aperçoive.
describe("requêtes de lecture publique des événements", () => {
  it("filtre toujours sur is_public = 1", () => {
    for (const query of PUBLIC_EVENT_QUERIES) {
      expect(query).toContain("is_public = 1");
    }
  });

  it("n'utilise jamais SELECT * pour l'API publique", () => {
    // « SELECT * » exposerait is_public, presence_required, address et
    // response_deadline aux visiteurs anonymes.
    expect(PUBLIC_EVENTS_API_QUERY).not.toContain("SELECT *");
  });

  it("n'expose aucune colonne interne dans l'API publique", () => {
    for (const column of ["presence_required", "address", "response_deadline"]) {
      expect(PUBLIC_EVENTS_API_QUERY).not.toContain(column);
    }
    // `is_public` n'apparaît que dans la clause WHERE, jamais dans les colonnes.
    expect(PUBLIC_EVENTS_API_QUERY.split("FROM events")[0]).not.toContain("is_public");
  });

  it("conserve la forme historique de la réponse publique", () => {
    // `is_past` est une colonne héritée et inutilisée, mais « SELECT * » la
    // renvoyait avant la migration : la retirer casserait les consommateurs
    // externes de /api/events.
    for (const column of [
      "id",
      "title",
      "image",
      "location",
      "description",
      "date",
      "time",
      "price",
      "is_past",
      "details_link",
      "reservation_link",
      "created_at",
    ]) {
      expect(PUBLIC_EVENTS_API_QUERY).toContain(column);
    }
  });

  it("conserve les critères propres à chaque page publique", () => {
    expect(PUBLIC_EVENTS_HOME_QUERY).toContain("ORDER BY date ASC");
    expect(PUBLIC_EVENTS_BILLETTERIE_QUERY).toContain("reservation_link IS NOT NULL");
    expect(PUBLIC_EVENTS_BILLETTERIE_QUERY).toContain("date >= ?");
    // `events` n'a pas de colonne `updated_at` : la lire ferait échouer la requête.
    expect(PUBLIC_EVENTS_SITEMAP_QUERY).not.toContain("updated_at");
    expect(PUBLIC_EVENTS_SITEMAP_QUERY).toContain("created_at");
  });

  it("utilise les requêtes partagées dans tous les points d'accès publics", () => {
    // Le filtre a déjà disparu silencieusement lors d'une réécriture de worker.tsx :
    // cette vérification empêche qu'une requête inline réintroduise la fuite.
    const publicSources = [
      "src/worker.tsx",
      "src/app/pages/Home.tsx",
      "src/app/pages/Billetterie.tsx",
      "src/lib/sitemap.ts",
    ];

    for (const source of publicSources) {
      expect(readFileSync(resolve(__dirname, "../../..", source), "utf8")).not.toContain(
        "FROM events"
      );
    }
  });
});
