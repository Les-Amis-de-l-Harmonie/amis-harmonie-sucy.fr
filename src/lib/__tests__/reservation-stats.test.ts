import { describe, expect, it } from "vitest";
import { RENCONTRE_HARMONIES_2026 } from "@/lib/free-events";
import { computeReservationStats } from "@/lib/free-events/stats";

import type { ReservationStatsRow } from "@/lib/free-events/stats";

const NOW = new Date("2026-10-21T12:00:00.000Z");

function reservation(overrides: Partial<ReservationStatsRow> = {}): ReservationStatsRow {
  return {
    party_size: 2,
    interests: '["harmonie-sucy"]',
    source: "affiche",
    newsletter_opt_in: 0,
    unsubscribed_at: null,
    status: "active",
    origin: "web",
    has_email: 1,
    confirmation_sent_at: null,
    has_confirmation_error: 0,
    anonymized_at: null,
    created_at: "2026-10-21 10:00:00",
    ...overrides,
  };
}

describe("computeReservationStats", () => {
  it("calcule les totaux et exclut les réservations annulées des ventilations", () => {
    const stats = computeReservationStats(
      RENCONTRE_HARMONIES_2026,
      [
        reservation({ party_size: 2 }),
        reservation({ party_size: 4, status: "cancelled", origin: "admin" }),
      ],
      NOW
    );

    expect(stats.totals).toEqual({
      reservations: 1,
      places: 2,
      averagePartySize: 2,
      cancelledReservations: 1,
      cancelledPlaces: 4,
      allReservations: 2,
    });
    expect(stats.byOrigin).toEqual({
      web: { reservations: 1, places: 2 },
      admin: { reservations: 0, places: 0 },
    });
    expect(stats.byPartySize).toMatchObject({ "1": 0, "2": 1, "4": 0 });
  });

  it("compte les choix multiples, les cases sans réponse et les codes inconnus", () => {
    const stats = computeReservationStats(
      RENCONTRE_HARMONIES_2026,
      [
        reservation({ interests: '["harmonie-sucy","villecresnes"]', source: "affiche" }),
        reservation({ interests: "[]", source: null, party_size: 1 }),
        reservation({ interests: '["choix-inconnu"]', source: "source-inconnue" }),
      ],
      NOW
    );

    expect(stats.byInterest["harmonie-sucy"]).toEqual({
      label: "Harmonie Municipale de Sucy-en-Brie",
      reservations: 1,
      places: 2,
    });
    expect(stats.byInterest.villecresnes.reservations).toBe(1);
    expect(stats.byInterest.none).toMatchObject({
      label: "Aucun choix",
      reservations: 1,
      places: 1,
    });
    expect(stats.byInterest["choix-inconnu"]).toMatchObject({
      label: "choix-inconnu",
      reservations: 1,
    });
    expect(stats.bySource.none).toMatchObject({ label: "Non renseigné", reservations: 1 });
    expect(stats.bySource["source-inconnue"]).toMatchObject({
      label: "source-inconnue",
      reservations: 1,
    });
    expect(stats.bySource.affiche.label).toBe("Affiche ou flyer");
  });

  it("répartit les confirmations et les consentements newsletter", () => {
    const stats = computeReservationStats(
      RENCONTRE_HARMONIES_2026,
      [
        reservation({
          newsletter_opt_in: 1,
          confirmation_sent_at: "2026-10-21T10:00:00Z",
        }),
        // Désinscription depuis l'admin : newsletter_opt_in repasse à 0.
        reservation({ newsletter_opt_in: 0, unsubscribed_at: "2026-10-21T11:00:00Z" }),
        reservation({ has_confirmation_error: 1 }),
        reservation({ has_email: 0 }),
      ],
      NOW
    );

    expect(stats.newsletter).toEqual({
      optIns: 1,
      optInPlaces: 2,
      unsubscribed: 1,
      optInRate: 0.25,
    });
    expect(stats.confirmations).toEqual({ sent: 1, failed: 1, notSent: 1, withoutEmail: 1 });
  });

  it("regroupe les dates à Paris et calcule les cumuls ainsi que les fenêtres récentes", () => {
    const stats = computeReservationStats(
      RENCONTRE_HARMONIES_2026,
      [
        reservation({ created_at: "2026-10-20 23:30:00", party_size: 2 }),
        reservation({ created_at: "2026-10-21T09:00:00Z", party_size: 3, origin: "admin" }),
        reservation({ created_at: "2026-10-13 11:59:59", party_size: 1 }),
      ],
      NOW
    );

    expect(stats.byDay).toEqual([
      {
        date: "2026-10-13",
        reservations: 1,
        places: 1,
        cumulativeReservations: 1,
        cumulativePlaces: 1,
      },
      {
        date: "2026-10-21",
        reservations: 2,
        places: 5,
        cumulativeReservations: 3,
        cumulativePlaces: 6,
      },
    ]);
    expect(stats.recent).toEqual({
      last24Hours: { reservations: 2, places: 5 },
      last7Days: { reservations: 2, places: 5 },
    });
    expect(stats.firstReservationAt).toBe("2026-10-13T11:59:59.000Z");
    expect(stats.lastReservationAt).toBe("2026-10-21T09:00:00.000Z");
  });

  it("renvoie des zéros et des dates nulles lorsque la liste est vide", () => {
    const stats = computeReservationStats(RENCONTRE_HARMONIES_2026, [], NOW);

    expect(stats.totals).toEqual({
      reservations: 0,
      places: 0,
      averagePartySize: 0,
      cancelledReservations: 0,
      cancelledPlaces: 0,
      allReservations: 0,
    });
    expect(stats.newsletter.optInRate).toBe(0);
    expect(stats.byDay).toEqual([]);
    expect(stats.firstReservationAt).toBeNull();
    expect(stats.lastReservationAt).toBeNull();
    expect(JSON.stringify(stats)).not.toContain("NaN");
  });
});
