import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CLOSE_DEADLINE_DAYS, daysBetween, getDeadlineTone, todayIso } from "../presence-deadline";

describe("presence-deadline", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calcule la date du jour et l'écart entre deux dates", () => {
    expect(todayIso()).toBe("2026-09-06");
    expect(daysBetween("2026-09-06", "2026-09-20")).toBe(14);
  });

  it("retourne un ton neutre quand aucune date limite n'est fixée", () => {
    expect(getDeadlineTone(null, false)).toEqual({
      label: "Pas de date limite fixée",
      tone: "muted",
    });
  });

  it("signale une date proche dans le seuil de quatorze jours", () => {
    expect(CLOSE_DEADLINE_DAYS).toBe(14);
    expect(getDeadlineTone("2026-09-20", false).tone).toBe("warning");
  });

  it("distingue une échéance dépassée selon que la réponse existe", () => {
    expect(getDeadlineTone("2026-09-05", false).tone).toBe("danger");
    expect(getDeadlineTone("2026-09-05", true).tone).toBe("muted");
  });
});
