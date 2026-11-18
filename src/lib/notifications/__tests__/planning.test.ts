import { describe, expect, it } from "vitest";
import { dueReminderStages, groupReminderTargets } from "../planning";
import type { ReminderTarget } from "../types";

function target(overrides: Partial<ReminderTarget> = {}): ReminderTarget {
  return {
    eventId: 1,
    eventTitle: "Concert",
    eventDate: "2099-06-10",
    eventTime: "20:00",
    eventLocation: "Salle des fêtes",
    responseDeadline: "2099-06-10",
    stage: 7,
    recipientUserId: 10,
    recipientEmail: "parent@example.test",
    recipientName: "Aurélie",
    recipientIsGuardian: true,
    subjectUserId: 1,
    subjectName: "Jules",
    ...overrides,
  };
}

describe("paliers des rappels de présence", () => {
  it("calcule les fenêtres en utilisant la date de Paris fournie", () => {
    expect(dueReminderStages("2099-06-10", "2099-06-10", "2099-06-05")).toEqual([7]);
    expect(dueReminderStages("2099-06-10", "2099-06-10", "2099-06-08")).toEqual([2]);
    expect(dueReminderStages("2099-06-10", null, "2099-06-10")).toEqual([2]);
    expect(dueReminderStages("2099-06-10", "2099-06-10", "2099-06-11")).toEqual([]);
  });

  it("regroupe les deux enfants d'un parent dans un message et une clé commune", () => {
    const [reminder] = groupReminderTargets(
      [target(), target({ eventId: 1, subjectUserId: 2, subjectName: "Emilie" })],
      "2099-06-05"
    );

    expect(reminder?.claims).toHaveLength(1);
    expect(reminder?.claims[0]?.dedupeKey).toBe("presence:1:7:10");
    expect(reminder?.claims[0]?.subjectUserIds).toEqual([1, 2]);
    expect(reminder?.subject).toContain("Jules et Emilie");
    expect(reminder?.text).toContain("Pour Jules");
    expect(reminder?.text).toContain("Pour Emilie");
  });

  it("regroupe les paliers 7 et 2 du même parent en un e-mail avec deux clés", () => {
    const [reminder] = groupReminderTargets(
      [
        target({
          eventId: 1,
          eventTitle: "Concert",
          stage: 7,
          subjectUserId: 1,
          subjectName: "Jules",
        }),
        target({
          eventId: 2,
          eventTitle: "Sortie",
          eventDate: "2099-06-06",
          responseDeadline: "2099-06-06",
          stage: 2,
          subjectUserId: 2,
          subjectName: "Emilie",
        }),
      ],
      "2099-06-05"
    );

    expect(reminder?.stages).toEqual([7, 2]);
    expect(reminder?.claims.map((claim) => claim.dedupeKey)).toEqual([
      "presence:2:2:10",
      "presence:1:7:10",
    ]);
    expect(reminder?.subjectNames).toEqual(expect.arrayContaining(["Jules", "Emilie"]));
  });

  it("parle de « vous » quand le destinataire est aussi un musicien concerné", () => {
    const [reminder] = groupReminderTargets(
      [
        target({
          recipientIsGuardian: false,
          subjectUserId: 10,
          subjectName: "Sam",
        }),
        target({ subjectUserId: 2, subjectName: "Jules" }),
      ],
      "2099-06-05"
    );

    expect(reminder?.subject).toContain("vous et Jules");
    expect(reminder?.emailModel.sections.map((section) => section.label)).toEqual([
      "Pour vous",
      "Pour Jules",
    ]);
    expect(reminder?.subjectNames).toEqual(["Sam", "Jules"]);
  });
});
