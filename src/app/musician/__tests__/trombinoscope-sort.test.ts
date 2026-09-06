import { describe, expect, it } from "vitest";
import {
  compareTrombinoscopeEntries,
  getAnciennete,
  sortTrombinoscopeEntries,
  type TrombinoscopeEntry,
} from "../trombinoscope-sort";

function musician(
  id: number,
  firstName: string,
  lastName: string,
  instruments: string[],
  startDate: string | null = null
): TrombinoscopeEntry {
  return {
    user_id: id,
    first_name: firstName,
    last_name: lastName,
    avatar: null,
    harmonie_start_date: startDate,
    instruments,
    image_consent: 0,
  };
}

describe("trombinoscope-sort", () => {
  it("trie les musiciens par nom puis par prénom", () => {
    const first = musician(1, "Zoé", "Martin", []);
    const second = musician(2, "Alice", "Martin", []);
    const third = musician(3, "Paul", "Bernard", []);

    expect(sortTrombinoscopeEntries([first, second, third], "name")).toEqual([
      third,
      second,
      first,
    ]);
  });

  it("place les anciennetés renseignées avant les autres", () => {
    const oldest = musician(1, "A", "A", [], "2010-01-01");
    const newest = musician(2, "B", "B", [], "2020-01-01");
    const unknown = musician(3, "C", "C", []);

    expect(sortTrombinoscopeEntries([unknown, newest, oldest], "seniority")).toEqual([
      oldest,
      newest,
      unknown,
    ]);
  });

  it("trie par priorité d'instrument puis par nom", () => {
    const clarinet = musician(1, "Zoé", "Martin", ["Clarinette"]);
    const direction = musician(2, "Alice", "Bernard", ["Chef d'orchestre"]);
    const unknown = musician(3, "Paul", "Durand", []);

    expect(sortTrombinoscopeEntries([unknown, clarinet, direction], "instrument")).toEqual([
      direction,
      clarinet,
      unknown,
    ]);
    expect(compareTrombinoscopeEntries(direction, clarinet, "instrument")).toBeLessThan(0);
  });

  it("calcule l'ancienneté dans une forme indépendante de l'affichage", () => {
    const now = new Date(2026, 8, 6);

    expect(getAnciennete("2020-06-05", now)).toEqual({
      dateLabel: "5 juin 2020",
      durationLabel: "(6 ans et 3 mois)",
    });
    expect(getAnciennete(null, now)).toBeNull();
  });
});
