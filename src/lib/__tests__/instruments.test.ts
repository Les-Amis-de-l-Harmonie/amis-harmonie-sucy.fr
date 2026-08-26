import { describe, expect, it } from "vitest";
import {
  compareInstruments,
  getInstrumentPriority,
  ORDERED_HARMONIE_INSTRUMENTS,
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
});
