import { describe, expect, it } from "vitest";
import { canAnswerPresenceOnlineWithConfig } from "@/lib/presence-beta";

describe("canAnswerPresenceOnlineWithConfig", () => {
  it("compare les adresses des testeurs sans tenir compte de la casse ni des espaces", () => {
    expect(
      canAnswerPresenceOnlineWithConfig("  LeDucMaxime@Gmail.com ", true, [
        "leducmaxime@gmail.com",
      ])
    ).toBe(true);
  });

  it("autorise tous les comptes quand la bêta est désactivée", () => {
    expect(canAnswerPresenceOnlineWithConfig("musicien@example.fr", false, [])).toBe(true);
    expect(canAnswerPresenceOnlineWithConfig(null, false, [])).toBe(true);
  });

  it("refuse les comptes absents de la liste des testeurs pendant la bêta", () => {
    expect(canAnswerPresenceOnlineWithConfig("musicien@example.fr", true, ["testeur@example.fr"]))
      .toBe(false);
  });
});
