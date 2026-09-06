import { describe, expect, it } from "vitest";
import { getMembershipAlerts } from "../MembershipAlerts";

describe("getMembershipAlerts", () => {
  it("signale l'absence d'adhésion", () => {
    const alerts = getMembershipAlerts({ adhesion_2026_2027: 0 });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      key: "adhesion",
      href: "/adhesion",
      cta: "Adhérer",
    });
  });

  it("signale l'assurance non déclarée pour un adhérent", () => {
    const alerts = getMembershipAlerts({ adhesion_2026_2027: 1, insurance_complete: false });

    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      key: "assurance",
      href: "/musician/assurance",
      cta: "Compléter",
    });
  });

  it("ne signale rien quand l'adhésion et l'assurance sont en ordre", () => {
    expect(getMembershipAlerts({ adhesion_2026_2027: 1, insurance_complete: true })).toEqual([]);
  });
});
