import { describe, expect, it } from "vitest";
import { getCheckinState, matchesCheckinSearch, maskEmail, normalizeSearchText } from "../checkins";

describe("helpers du pointage à l'entrée", () => {
  it("masque une adresse e-mail sans exposer sa partie locale", () => {
    expect(maskEmail("jeanne.dupont@gmail.com")).toBe("j•••@gmail.com");
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail("invalide")).toBe("•••");
  });

  it("normalise les accents, les tirets et les apostrophes", () => {
    expect(normalizeSearchText("  Élodie D'Arc-en-Ciel  ")).toBe("elodie d arc en ciel");
    expect(normalizeSearchText("L’Harmonie-Sucy")).toBe("l harmonie sucy");
  });

  it("cherche plusieurs mots dans n'importe quel ordre, y compris dans l'e-mail", () => {
    const reservation = {
      lastName: "D'Arc",
      firstName: "Élodie-Marie",
      email: "elodie.marie@example.org",
    };
    expect(matchesCheckinSearch(reservation, "marie arc")).toBe(true);
    expect(matchesCheckinSearch(reservation, "EXAMPLE ORG")).toBe(true);
    expect(matchesCheckinSearch(reservation, "marie absente")).toBe(false);
    expect(matchesCheckinSearch(reservation, "   ")).toBe(true);
  });

  it("tolère l'absence de séparateurs dans les noms composés", () => {
    expect(
      matchesCheckinSearch({ lastName: "D'Angelo", firstName: null, email: null }, "dangelo")
    ).toBe(true);
    expect(
      matchesCheckinSearch({ lastName: null, firstName: "Jean-Pierre", email: null }, "jeanpierre")
    ).toBe(true);
    expect(
      matchesCheckinSearch(
        { lastName: "Martin-Dupont", firstName: null, email: null },
        "martindupont"
      )
    ).toBe(true);
  });

  it("détermine l'état d'avancement du pointage", () => {
    expect(getCheckinState(0, 3)).toBe("none");
    expect(getCheckinState(2, 3)).toBe("partial");
    expect(getCheckinState(3, 3)).toBe("complete");
    expect(getCheckinState(4, 3)).toBe("over");
  });
});
