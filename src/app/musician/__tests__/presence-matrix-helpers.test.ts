import { describe, expect, it } from "vitest";
import {
  buildMusicianRows,
  countPupitre,
  formatEventDayLabel,
  getCellVisual,
  getEventDateParts,
  getShortName,
} from "../presence-matrix-helpers";
import { formatPresentOnTotal } from "../presence-format";
import type { PresenceEvent } from "../musician-types";

function createEvent(): PresenceEvent {
  return {
    id: 8,
    title: "Cérémonie du 11 novembre",
    date: "2026-11-11",
    time: "10:30",
    location: "Monument aux morts",
    address: "Place de l'Église",
    response_deadline: "2026-09-20",
    response: { status: null, comment: null, updated_at: null },
    roster: [
      {
        userId: 2,
        firstName: "Lucas",
        lastName: "Martin",
        instruments: ["Trompette"],
        primaryInstrument: "Trompette",
        status: "present",
      },
      {
        userId: 3,
        firstName: "Camille",
        lastName: "Bernard",
        instruments: ["Clarinette"],
        primaryInstrument: "Clarinette",
        status: null,
      },
    ],
    counts: { present: 1, absent: 0, noAnswer: 1, totalMembers: 2 },
  };
}

describe("presence-matrix-helpers", () => {
  it("conserve l'ordre des musiciens et leurs statuts par prestation", () => {
    const rows = buildMusicianRows([createEvent()], 2);

    expect(rows.map((row) => row.userId)).toEqual([2, 3]);
    expect(rows[0]?.isCurrentUser).toBe(true);
    expect(rows[0]?.statuses.get(8)).toBe("present");
    expect(rows[1]?.statuses.get(8)).toBeNull();
  });

  it("représente les trois états avec une forme et un libellé distincts", () => {
    expect(getCellVisual("present")).toMatchObject({ label: "Présent" });
    expect(getCellVisual("absent")).toMatchObject({ label: "Absent" });
    expect(getCellVisual(null)).toMatchObject({ label: "Sans réponse" });
    expect(getCellVisual("present").shapeClass).toContain("rounded-full");
    expect(getCellVisual("absent").shapeClass).toContain("rounded-md");
    expect(getCellVisual(null).shapeClass).toContain("border-dashed");
  });

  it("abrège « Prénom N. » en gardant le nom complet pour les cas incomplets", () => {
    expect(getShortName("Jean-Luc", "Faure")).toBe("Jean-Luc F.");
    expect(getShortName("  Éric ", " lambert ")).toBe("Éric L.");
    expect(getShortName("Camille", null)).toBe("Camille");
    expect(getShortName(null, "Bernard")).toBe("B.");
    expect(getShortName(null, null)).toBe("Anonyme");
    expect(getShortName("", "  ")).toBe("Anonyme");
  });

  it("compte les présents sur le total d'un pupitre sans jamais traiter null comme absent", () => {
    const event = createEvent();
    const rows = buildMusicianRows(
      [
        {
          ...event,
          roster: [
            ...event.roster,
            {
              userId: 4,
              firstName: "Paul",
              lastName: "Roux",
              instruments: ["Clarinette"],
              primaryInstrument: "Clarinette",
              status: "absent",
            },
          ],
        },
      ],
      2
    );
    const clarinettes = rows.filter((row) => row.primaryInstrument === "Clarinette");

    expect(countPupitre(clarinettes, 8)).toEqual({ present: 0, absent: 1, noAnswer: 1, total: 2 });
    expect(countPupitre(rows, 8)).toEqual({ present: 1, absent: 1, noAnswer: 1, total: 3 });
  });

  it("ne compte pas un musicien absent de l'effectif d'une prestation", () => {
    const rows = buildMusicianRows([createEvent()], null);

    expect(countPupitre(rows, 999)).toEqual({ present: 0, absent: 0, noAnswer: 0, total: 0 });
    expect(countPupitre([], 8)).toEqual({ present: 0, absent: 0, noAnswer: 0, total: 0 });
  });

  it("découpe une date sans dépendre du fuseau horaire", () => {
    expect(getEventDateParts("2026-11-22")).toMatchObject({
      weekday: "Dimanche",
      weekdayShort: "Dim.",
      day: 22,
      dayPadded: "22",
      monthName: "novembre",
      monthShort: "nov.",
      monthPadded: "11",
      year: 2026,
    });
    expect(getEventDateParts("2027-01-05")).toMatchObject({
      weekday: "Mardi",
      dayPadded: "05",
      monthShort: "janv.",
    });
    expect(getEventDateParts("2026-11-22T10:00:00")?.day).toBe(22);
    expect(getEventDateParts("pas une date")).toBeNull();
    expect(getEventDateParts("2026-13-01")).toBeNull();
  });

  it("n'ajoute l'année au libellé du jour que si elle diffère de l'année en cours", () => {
    expect(formatEventDayLabel("2026-11-22", 2026)).toBe("22 novembre");
    expect(formatEventDayLabel("2027-01-31", 2026)).toBe("31 janvier 2027");
    expect(formatEventDayLabel("n'importe quoi", 2026)).toBe("n'importe quoi");
  });

  it("formule les présents sur total en chiffres neutres", () => {
    expect(formatPresentOnTotal(0, 8)).toBe("0 présent sur 8");
    expect(formatPresentOnTotal(1, 8)).toBe("1 présent sur 8");
    expect(formatPresentOnTotal(12, 36)).toBe("12 présents sur 36");
  });
});
