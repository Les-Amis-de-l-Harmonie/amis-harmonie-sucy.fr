import { describe, expect, it } from "vitest";
import { INSTRUMENT_WITHOUT_SECTION_LABEL } from "../instruments";
import { summarisePresence, type PresenceRow } from "../presence";

function row(
  userId: number,
  firstName: string | null,
  lastName: string | null,
  instrument: string | null,
  status: PresenceRow["status"],
  statusChangedAt: string | null = null
): PresenceRow {
  return { userId, firstName, lastName, instrument, status, statusChangedAt };
}

describe("summarisePresence", () => {
  it("counts every member without an answer as no answer", () => {
    const summary = summarisePresence(
      [
        row(1, "Alice", "Martin", "Flûte traversière", null),
        row(2, "Benoît", "Durand", "Trombone", null),
      ],
      "2026-09-01"
    );

    expect(summary.totalMembers).toBe(2);
    expect(summary.noAnswer).toBe(2);
    expect(summary.present).toBe(0);
    expect(summary.absent).toBe(0);
    expect(summary.responseRate).toBe(0);
  });

  it("reports a complete present response", () => {
    const summary = summarisePresence(
      [
        row(1, "Alice", "Martin", "Flûte traversière", "present", "2026-08-30 10:00:00"),
        row(2, "Benoît", "Durand", "Trombone", "present", "2026-08-30 11:00:00"),
      ],
      "2026-09-01"
    );

    expect(summary.responseRate).toBe(1);
    expect(summary.nonResponders).toEqual([]);
  });

  it("keeps mixed response counts and pupitre breakdowns distinct", () => {
    const summary = summarisePresence(
      [
        row(1, "Alice", "Martin", "Flûte traversière", "present"),
        row(2, "Benoît", "Durand", "Trombone", "absent"),
        row(3, "Claire", "Bernard", null, null),
      ],
      null
    );

    expect(summary.totalMembers).toBe(3);
    expect(summary.present).toBe(1);
    expect(summary.absent).toBe(1);
    expect(summary.noAnswer).toBe(1);
    expect(summary.responseRate).toBe(2 / 3);
    expect(summary.nonResponders.map((member) => member.userId)).toEqual([3]);
    expect(summary.byInstrument).toEqual([
      expect.objectContaining({
        instrument: "Flûte traversière",
        present: 1,
        absent: 0,
        noAnswer: 0,
      }),
      expect.objectContaining({ instrument: "Trombone", present: 0, absent: 1, noAnswer: 0 }),
      expect.objectContaining({
        instrument: INSTRUMENT_WITHOUT_SECTION_LABEL,
        present: 0,
        absent: 0,
        noAnswer: 1,
      }),
    ]);
  });

  it("counts a multi-instrument musician once overall and in both pupitres", () => {
    const summary = summarisePresence(
      [
        row(1, "Alice", "Martin", "Trombone", "present"),
        row(1, "Alice", "Martin", "Trompette", "present"),
      ],
      null
    );

    expect(summary.totalMembers).toBe(1);
    expect(summary.responseRate).toBe(1);
    expect(summary.byInstrument).toHaveLength(2);
    expect(summary.byInstrument.map((breakdown) => breakdown.present)).toEqual([1, 1]);
    expect(summary.byInstrument[0]?.members[0]?.instruments).toEqual(["Trombone", "Trompette"]);
  });

  it("conserve un ordre nominatif stable dans chaque pupitre", () => {
    const summary = summarisePresence(
      [
        row(1, "Zoé", "Martin", "Trombone", null),
        row(2, "Alice", "Bernard", "Trombone", null),
        row(3, "Benoît", "Bernard", "Trombone", null),
      ],
      null
    );

    expect(summary.byInstrument[0]?.members.map((member) => member.userId)).toEqual([2, 3, 1]);
  });

  it("returns a finite zero response rate for empty input", () => {
    const summary = summarisePresence([], null);

    expect(summary.totalMembers).toBe(0);
    expect(summary.responseRate).toBe(0);
    expect(Number.isNaN(summary.responseRate)).toBe(false);
  });

  it("flags changes after the deadline but not changes made on deadline day", () => {
    const summary = summarisePresence(
      [
        row(1, "Alice", "Martin", "Trombone", "present", "2026-09-02 09:00:00"),
        row(2, "Benoît", "Durand", "Trompette", "present", "2026-09-01 14:30:00"),
      ],
      "2026-09-01"
    );

    expect(summary.lateChanges.map((member) => member.userId)).toEqual([1]);
  });
});
