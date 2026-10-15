import { describe, expect, it } from "vitest";
import { getFreeEvent } from "@/lib/free-events";
import { buildConfirmationEmail } from "@/lib/free-events/emails";

describe("contenu public des événements gratuits", () => {
  it("garde les formulations approuvées et le chemin imprimé en QR code", () => {
    const event = getFreeEvent("rencontre-harmonies-2026");
    expect(event).toBeDefined();
    expect(event?.path).toBe("/rencontre-harmonies-2026");
    expect(event?.admissionLabel).toBe("Entrée gratuite sur réservation");
    const email = buildConfirmationEmail(event!, { firstName: "Camille", partySize: 2 });
    const content =
      `${JSON.stringify(event)} ${email.subject} ${email.text} ${email.html}`.toLowerCase();
    expect(content).not.toContain("chapeau");
    expect(content).not.toContain("quête");
    expect(content).not.toContain("obligatoire");
    expect(JSON.stringify(event)).toContain("Entrée gratuite sur réservation");
  });
});
