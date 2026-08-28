import { describe, expect, it } from "vitest";
import {
  compareInstruments,
  getInstrumentPriority,
  isLeadershipInstrument,
  ORDERED_HARMONIE_INSTRUMENTS,
  resolvePrimaryFromRows,
  validateHarmonieInstruments,
} from "../instruments";

describe("instruments", () => {
  it("conserve l'ordre de priorité historique", () => {
    expect(getInstrumentPriority("Chef d'orchestre")).toBe(0);
    expect(getInstrumentPriority("Chef adjoint")).toBe(1);
    expect(getInstrumentPriority("Percussions")).toBe(2);
    expect(getInstrumentPriority("Trombone")).toBe(999);
    expect(ORDERED_HARMONIE_INSTRUMENTS.slice(0, 3)).toEqual([
      "Chef d'orchestre",
      "Chef adjoint",
      "Percussions",
    ]);
  });

  it("compare sans tenir compte de la casse et respecte les priorités", () => {
    expect(getInstrumentPriority("chef d'orchestre")).toBe(0);
    expect(compareInstruments("Chef d'orchestre", "Chef adjoint")).toBeLessThan(0);
    expect(compareInstruments("Chef adjoint", "Percussions")).toBeLessThan(0);
    expect(compareInstruments("Percussions", "Trombone")).toBeLessThan(0);
  });

  it("reconnaît les deux rôles de direction avec les deux apostrophes et toute casse", () => {
    expect(isLeadershipInstrument("CHEF D'ORCHESTRE")).toBe(true);
    expect(isLeadershipInstrument("chef d’orchestre")).toBe(true);
    expect(isLeadershipInstrument("CHEF ADJOINT")).toBe(true);
    expect(isLeadershipInstrument("Trompette")).toBe(false);
  });

  it("valide les instruments déclarés et déduit le principal", () => {
    expect(validateHarmonieInstruments([], "Cor")).toEqual({ instruments: [], primary: null });
    expect(validateHarmonieInstruments(["Cor"], "Trompette")).toEqual({
      instruments: ["Cor"],
      primary: "Cor",
    });
    expect(validateHarmonieInstruments(["Cor", "Trompette"], "Trompette")).toEqual({
      instruments: ["Cor", "Trompette"],
      primary: "Trompette",
    });
    expect(validateHarmonieInstruments(undefined, "Cor")).toBeNull();
  });

  it("refuse un principal absent et déduplique les instruments après nettoyage", () => {
    expect(validateHarmonieInstruments(["Cor", "Trompette"], null)).toEqual(
      expect.stringContaining("instrument principal")
    );
    expect(validateHarmonieInstruments(["Cor", "Trompette"], "Clarinette")).toEqual(
      expect.stringContaining("instrument principal")
    );
    expect(validateHarmonieInstruments(["Cor", " Cor "], null)).toEqual({
      instruments: ["Cor"],
      primary: "Cor",
    });
  });

  it("résout le principal marqué avec un repli déterministe", () => {
    expect(
      resolvePrimaryFromRows([
        { instrument_name: "Trompette", is_primary: 1 },
        { instrument_name: "Clarinette", is_primary: 1 },
      ])
    ).toBe("Clarinette");
    expect(
      resolvePrimaryFromRows([
        { instrument_name: "Trompette", is_primary: 0 },
        { instrument_name: "Clarinette", is_primary: 0 },
      ])
    ).toBe("Clarinette");
    expect(resolvePrimaryFromRows([])).toBeNull();
  });
});
