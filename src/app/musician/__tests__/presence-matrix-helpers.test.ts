import { describe, expect, it } from "vitest";
import { getCellVisual, buildMusicianRows } from "../presence-matrix-helpers";
import type { PresenceEvent } from "../PresenceCard";

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
});
