import { describe, expect, it } from "vitest";
import {
  buildAttendeeList,
  compareByName,
  formatDateTimeFr,
  getConfirmationState,
  getInitial,
  matchesSearch,
} from "../reservations-utils";
import type { AdminReservation } from "../reservations-utils";

function make(partial: Partial<AdminReservation> & { id: number }): AdminReservation {
  return {
    lastName: "Dupont",
    firstName: "Marie",
    email: null,
    partySize: 2,
    interests: [],
    source: null,
    newsletterOptIn: false,
    status: "active",
    origin: "web",
    confirmationSentAt: null,
    confirmationError: null,
    createdAt: "2026-10-20 10:00:00",
    updatedAt: "2026-10-20 10:00:00",
    anonymizedAt: null,
    ...partial,
  };
}

describe("liste d'entrée", () => {
  it("trie par nom puis prénom sans tenir compte des accents ni de la casse", () => {
    const list = buildAttendeeList([
      make({ id: 1, lastName: "Zola", firstName: "Émile" }),
      make({ id: 2, lastName: "Étienne", firstName: "Paul" }),
      make({ id: 3, lastName: "dupont", firstName: "Zoé" }),
      make({ id: 4, lastName: "Dupont", firstName: "Anne" }),
    ]);
    expect(list.map((r) => r.id)).toEqual([4, 3, 2, 1]);
  });

  it("ne garde que les réservations actives", () => {
    const list = buildAttendeeList([make({ id: 1 }), make({ id: 2, status: "cancelled" })]);
    expect(list.map((r) => r.id)).toEqual([1]);
  });

  it("place les lignes anonymisées en dernier", () => {
    const anon = make({ id: 1, lastName: null, firstName: null });
    const normal = make({ id: 2, lastName: "Zola" });
    expect(compareByName(anon, normal)).toBeGreaterThan(0);
    expect(buildAttendeeList([anon, normal]).map((r) => r.id)).toEqual([2, 1]);
  });

  it("donne l'initiale sans accent, ou # si le nom est vide", () => {
    expect(getInitial("Étienne")).toBe("E");
    expect(getInitial("  ôdile")).toBe("O");
    expect(getInitial(null)).toBe("#");
  });
});

describe("liste des réservations", () => {
  it("cherche dans le nom, le prénom et l'e-mail", () => {
    const r = make({ id: 1, email: "marie.dupont@example.org" });
    expect(matchesSearch(r, "DUPO")).toBe(true);
    expect(matchesSearch(r, "example.org")).toBe(true);
    expect(matchesSearch(r, "martin")).toBe(false);
    expect(matchesSearch(r, "  ")).toBe(true);
  });

  it("déduit l'état de la confirmation", () => {
    expect(getConfirmationState(make({ id: 1 }))).toBe("none");
    expect(getConfirmationState(make({ id: 1, confirmationSentAt: "2026-10-20 10:00:00" }))).toBe(
      "sent"
    );
    expect(getConfirmationState(make({ id: 1, confirmationError: "boom" }))).toBe("error");
  });

  it("affiche les dates de la base en heure de Paris", () => {
    expect(formatDateTimeFr("2026-11-14 14:30:00")).toContain("15:30");
    expect(formatDateTimeFr("n'importe quoi")).toBe("—");
  });
});
