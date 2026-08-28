import { describe, expect, it } from "vitest";
import { summarisePresence, type PresenceRow } from "../presence";

function row(
  userId: number,
  firstName: string | null,
  lastName: string | null,
  instrument: string | null,
  status: PresenceRow["status"],
  isPrimary: number | null = 0
): PresenceRow {
  return { userId, firstName, lastName, instrument, isPrimary, status, statusChangedAt: null };
}

describe("summarisePresence", () => {
  it("compte chaque membre sans réponse", () => {
    const summary = summarisePresence([
      row(1, "Alice", "Martin", "Flûte traversière", null),
      row(2, "Benoît", "Durand", "Trombone", null),
    ]);

    expect(summary.totalMembers).toBe(2);
    expect(summary.noAnswer).toBe(2);
    expect(summary.present).toBe(0);
    expect(summary.absent).toBe(0);
    expect(summary.members.map((member) => member.userId)).toEqual([2, 1]);
  });

  it("conserve les comptes de présence et les instruments principaux", () => {
    const summary = summarisePresence([
      row(1, "Alice", "Martin", "Trompette", "present", 1),
      row(1, "Alice", "Martin", "Trombone", "present"),
      row(2, "Benoît", "Durand", "Trombone", "absent"),
      row(3, "Claire", "Bernard", null, null),
    ]);

    expect(summary.totalMembers).toBe(3);
    expect(summary.present).toBe(1);
    expect(summary.absent).toBe(1);
    expect(summary.noAnswer).toBe(1);
    expect(summary.members.find((member) => member.userId === 1)).toEqual(
      expect.objectContaining({
        instruments: ["Trombone", "Trompette"],
        primaryInstrument: "Trompette",
      })
    );
    expect(summary.members.find((member) => member.userId === 3)?.primaryInstrument).toBeNull();
  });

  it("retombe sur le premier instrument quand aucun principal n'est marqué", () => {
    const summary = summarisePresence([
      row(1, "Alice", "Martin", "Trompette", null),
      row(1, "Alice", "Martin", "Clarinette", null),
    ]);

    expect(summary.members[0]?.primaryInstrument).toBe("Clarinette");
  });

});
