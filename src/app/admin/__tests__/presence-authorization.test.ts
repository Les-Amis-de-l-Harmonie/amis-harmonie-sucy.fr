import { describe, expect, it } from "vitest";
import {
  authorizationState,
  countAuthorizations,
  describeAuthorization,
  describeAuthorizedBy,
  formatAuthorizedDay,
  type PresenceAuthorization,
} from "../presence-authorization";

const missing: PresenceAuthorization = {
  status: "missing",
  authorizedBy: null,
  authorizedAt: null,
  outdated: false,
};

function authorized(overrides: Partial<PresenceAuthorization> = {}): PresenceAuthorization {
  return {
    status: "authorized",
    authorizedBy: { name: "Aurélie Martin", relation: "mère", kind: "parent", paper: false },
    authorizedAt: "2026-11-12T17:30:00Z",
    outdated: false,
    ...overrides,
  };
}

describe("authorizationState", () => {
  it("distingue autorisée, sur un texte antérieur et manquante", () => {
    expect(authorizationState(authorized())).toBe("authorized");
    expect(authorizationState(authorized({ outdated: true }))).toBe("outdated");
    expect(authorizationState(missing)).toBe("missing");
  });

  it("une autorisation manquante n'est jamais « antérieure »", () => {
    expect(authorizationState({ ...missing, outdated: true })).toBe("missing");
  });
});

describe("describeAuthorizedBy", () => {
  it("garde le prénom et le lien de parenté d'un parent", () => {
    expect(describeAuthorizedBy(authorized())).toBe("par Aurélie (mère)");
  });

  it("indique une saisie papier d'un admin, avec ou sans nom", () => {
    expect(
      describeAuthorizedBy(
        authorized({
          authorizedBy: { name: "Mario Rossi", relation: null, kind: "admin", paper: true },
        })
      )
    ).toBe("saisie papier par un admin");
    expect(
      describeAuthorizedBy(
        authorized({ authorizedBy: { name: null, relation: null, kind: "admin", paper: true } })
      )
    ).toBe("saisie papier par un admin");
  });

  it("garde le responsable qui a signé lors d'une saisie papier", () => {
    expect(
      describeAuthorizedBy(
        authorized({
          authorizedBy: {
            name: "Aurélie Martin",
            relation: "mère",
            kind: "parent",
            paper: true,
          },
        })
      )
    ).toBe("par Aurélie (mère), saisie papier par un admin");
  });

  it("lit les cas sans nom comme une phrase", () => {
    expect(
      describeAuthorizedBy(
        authorized({ authorizedBy: { name: null, relation: null, kind: "deleted", paper: false } })
      )
    ).toBe("par un compte supprimé");
    expect(
      describeAuthorizedBy(
        authorized({
          authorizedBy: { name: null, relation: null, kind: "noProfile", paper: false },
        })
      )
    ).toBe("par un responsable");
    expect(describeAuthorizedBy(missing)).toBeNull();
  });
});

describe("describeAuthorization", () => {
  it("donne l'état, l'auteur et la date à l'heure de Paris", () => {
    expect(describeAuthorization(authorized())).toBe(
      "Autorisée par Aurélie (mère) le 12/11/2026 à 18:30"
    );
  });

  it("mentionne le signataire et la saisie papier", () => {
    expect(
      describeAuthorization(
        authorized({
          authorizedBy: {
            name: "Aurélie Martin",
            relation: "mère",
            kind: "parent",
            paper: true,
          },
        })
      )
    ).toBe("Autorisée par Aurélie (mère), saisie papier par un admin le 12/11/2026 à 18:30");
  });

  it("signale un texte antérieur", () => {
    expect(describeAuthorization(authorized({ outdated: true }))).toBe(
      "Autorisée sur un texte antérieur par Aurélie (mère) le 12/11/2026 à 18:30"
    );
  });

  it("reste court quand l'autorisation manque ou que la date est invalide", () => {
    expect(describeAuthorization(missing)).toBe("Autorisation manquante");
    expect(describeAuthorization(authorized({ authorizedAt: "n'importe quoi" }))).toBe(
      "Autorisée par Aurélie (mère)"
    );
  });
});

describe("formatAuthorizedDay", () => {
  it("renvoie le jour seul, ou rien", () => {
    expect(formatAuthorizedDay("2026-11-12 17:30:00")).toBe("12/11/2026");
    expect(formatAuthorizedDay(null)).toBe("");
    expect(formatAuthorizedDay("?")).toBe("");
  });
});

describe("countAuthorizations", () => {
  it("compte les concernés, les reçues (dont antérieures) et les manquantes", () => {
    expect(
      countAuthorizations([
        authorized(),
        authorized({ outdated: true }),
        missing,
        missing,
        null,
        undefined,
      ])
    ).toEqual({ concerned: 4, authorized: 2, outdated: 1, missing: 2 });
  });
});
