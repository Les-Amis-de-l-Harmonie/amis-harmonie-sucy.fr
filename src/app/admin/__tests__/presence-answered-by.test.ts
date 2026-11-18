import { describe, expect, it } from "vitest";
import { formatAnsweredByLong, formatAnsweredByShort } from "../presence-answered-by";

describe("formatAnsweredByShort", () => {
  it("garde le prénom et le lien de parenté d'un parent", () => {
    expect(
      formatAnsweredByShort({ name: "Aurélie Martin", relation: "mère", isAdmin: false })
    ).toBe("par Aurélie (mère)");
  });

  it("affiche « admin » pour un administrateur, même s'il a un lien de parenté", () => {
    expect(formatAnsweredByShort({ name: "Mario Rossi", relation: "père", isAdmin: true })).toBe(
      "par Mario (admin)"
    );
  });

  it("omet les parenthèses sans lien de parenté", () => {
    expect(formatAnsweredByShort({ name: "Paul Durand", relation: null, isAdmin: false })).toBe(
      "par Paul"
    );
  });

  it("lit les replis du serveur comme une phrase", () => {
    expect(
      formatAnsweredByShort({ name: "Un administrateur", relation: null, isAdmin: true })
    ).toBe("par un administrateur");
    expect(
      formatAnsweredByShort({ name: "Un compte supprimé", relation: null, isAdmin: false })
    ).toBe("par un compte supprimé");
  });

  it("formate les comptes sans profil et supprimés depuis le discriminant", () => {
    expect(
      formatAnsweredByShort({
        name: null,
        relation: null,
        isAdmin: true,
        kind: "noProfile",
      })
    ).toBe("par un administrateur");
    expect(
      formatAnsweredByShort({
        name: null,
        relation: null,
        isAdmin: false,
        kind: "noProfile",
      })
    ).toBe("par un compte sans profil");
    expect(
      formatAnsweredByShort({ name: null, relation: null, isAdmin: false, kind: "deleted" })
    ).toBe("par un compte supprimé");
  });
});

describe("formatAnsweredByLong", () => {
  it("donne le nom entier et la date à l'heure de Paris", () => {
    // 18 novembre : heure d'hiver (UTC+1).
    expect(
      formatAnsweredByLong(
        { name: "Aurélie Martin", relation: "mère", isAdmin: false },
        "2026-11-18T08:05:00Z"
      )
    ).toBe("Réponse donnée par Aurélie Martin (mère) le 18/11/2026 à 09:05");
  });

  it("accepte le format SQLite et ignore une date absente ou invalide", () => {
    const answeredBy = { name: "Mario Rossi", relation: null, isAdmin: true };
    expect(formatAnsweredByLong(answeredBy, "2026-07-01 10:00:00")).toBe(
      "Réponse donnée par Mario Rossi (admin) le 01/07/2026 à 12:00"
    );
    expect(formatAnsweredByLong(answeredBy, null)).toBe("Réponse donnée par Mario Rossi (admin)");
    expect(formatAnsweredByLong(answeredBy, "n'importe quoi")).toBe(
      "Réponse donnée par Mario Rossi (admin)"
    );
  });
});
