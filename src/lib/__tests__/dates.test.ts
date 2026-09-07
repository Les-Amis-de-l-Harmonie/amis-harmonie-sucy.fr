import { describe, it, expect } from "vitest";
import { isEventPast, formatDateFrench, formatDateShort, formatDateLong } from "../dates";

describe("isEventPast", () => {
  it("returns true for past dates", () => {
    const pastDate = "2020-01-01";
    expect(isEventPast(pastDate)).toBe(true);
  });

  it("returns false for future dates", () => {
    const futureDate = "2030-12-31";
    expect(isEventPast(futureDate)).toBe(false);
  });

  it("returns false for today", () => {
    // La date de référence doit être construite à partir des composantes
    // *locales*, pas via toISOString() : `isEventPast` compare à minuit local,
    // et toISOString() renvoie la date UTC. Aux fuseaux en avance sur UTC, les
    // deux divergent entre minuit et le décalage horaire (00h00-02h00 en CEST),
    // ce qui faisait échouer ce test chaque nuit.
    const today = new Date();
    const todayStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
    expect(isEventPast(todayStr)).toBe(false);
  });
});

describe("formatDateFrench", () => {
  it("formats date with day name in French", () => {
    const result = formatDateFrench("2024-01-15");
    expect(result).toMatch(
      /^(Lundi|Mardi|Mercredi|Jeudi|Vendredi|Samedi|Dimanche) \d{2} \w+ \d{4}$/
    );
  });

  it("includes month name in French", () => {
    const result = formatDateFrench("2024-01-15");
    expect(result).toContain("janvier");
  });

  it("pads day with zero", () => {
    const result = formatDateFrench("2024-01-05");
    expect(result).toContain("05");
  });
});

describe("formatDateShort", () => {
  it("formats date in French short format", () => {
    const result = formatDateShort("2024-01-15");
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("uses French locale", () => {
    const result = formatDateShort("2024-01-15");
    expect(result).toBe("15/01/2024");
  });
});

describe("formatDateLong", () => {
  it("formats date in French long format without day name", () => {
    const result = formatDateLong("2024-01-15");
    expect(result).toMatch(/^\d{1,2} \w+ \d{4}$/);
  });

  it("returns — for null input", () => {
    const result = formatDateLong(null);
    expect(result).toBe("—");
  });

  it("includes month name in French", () => {
    const result = formatDateLong("2024-01-15");
    expect(result).toContain("janvier");
  });
});
