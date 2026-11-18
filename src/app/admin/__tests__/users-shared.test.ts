import { describe, expect, it } from "vitest";
import {
  buildUsersCsv,
  getAge,
  isAdultWithLinkedGuardian,
  matchesUserSearch,
  type UserWithProfile,
} from "../users-shared";

function createUser(overrides: Partial<UserWithProfile> = {}): UserWithProfile {
  return {
    id: 1,
    email: "lea@example.com",
    role: "MUSICIAN",
    kind: "member",
    is_active: 1,
    first_name: "Léa",
    last_name: "Martin",
    ...overrides,
  };
}

describe("getAge", () => {
  const now = new Date(2026, 10, 18);

  it("compte les années révolues", () => {
    expect(getAge("2008-11-18", now)).toBe(18);
    expect(getAge("2008-11-19", now)).toBe(17);
    expect(getAge("2000-01-01T00:00:00Z", now)).toBe(26);
  });

  it("renvoie null sans date de naissance valide", () => {
    expect(getAge(null, now)).toBeNull();
    expect(getAge("", now)).toBeNull();
    expect(getAge("pas une date", now)).toBeNull();
  });
});

describe("isAdultWithLinkedGuardian", () => {
  const now = new Date(2026, 10, 18);

  it("signale un majeur dont un responsable est encore lié", () => {
    const user = createUser({ date_of_birth: "2007-05-01", guardian_names: "Marie Martin" });
    expect(isAdultWithLinkedGuardian(user, now)).toBe(true);
  });

  it("ne signale pas un mineur", () => {
    const user = createUser({ date_of_birth: "2012-05-01", guardian_names: "Marie Martin" });
    expect(isAdultWithLinkedGuardian(user, now)).toBe(false);
  });

  it("ne signale pas un majeur sans responsable", () => {
    expect(
      isAdultWithLinkedGuardian(
        createUser({ date_of_birth: "1990-05-01", guardian_names: null }),
        now
      )
    ).toBe(false);
    expect(
      isAdultWithLinkedGuardian(
        createUser({ date_of_birth: "1990-05-01", guardian_names: " " }),
        now
      )
    ).toBe(false);
  });

  it("ne signale pas un compte sans date de naissance ni un responsable légal", () => {
    expect(isAdultWithLinkedGuardian(createUser({ guardian_names: "Marie Martin" }), now)).toBe(
      false
    );
    expect(
      isAdultWithLinkedGuardian(
        createUser({ kind: "guardian", date_of_birth: "1980-01-01", guardian_names: "X Y" }),
        now
      )
    ).toBe(false);
  });
});

describe("matchesUserSearch", () => {
  it("fonctionne avec un e-mail null (compte géré)", () => {
    const managed = createUser({ email: null, kind: "managed", first_name: "Tom" });
    expect(matchesUserSearch(managed, "tom")).toBe(true);
    expect(matchesUserSearch(managed, "example.com")).toBe(false);
  });

  it("retrouve un musicien par le nom de son responsable", () => {
    const user = createUser({ guardian_names: "Marie Dupont" });
    expect(matchesUserSearch(user, "dupont")).toBe(true);
  });

  it("retrouve un responsable par le nom de son enfant", () => {
    const guardian = createUser({ kind: "guardian", children_names: "Léa Martin" });
    expect(matchesUserSearch(guardian, "léa martin")).toBe(true);
  });

  it("ignore les noms liés quand on cherche un compte à relier", () => {
    const child = createUser({ guardian_names: "Lucas Martin" });
    expect(matchesUserSearch(child, "lucas")).toBe(true);
    expect(matchesUserSearch(child, "lucas", { includeRelations: false })).toBe(false);
  });

  it("ne cherche pas la chaîne « null » quand le prénom manque", () => {
    const user = createUser({ first_name: null, last_name: "Martin" });
    expect(matchesUserSearch(user, "null")).toBe(false);
  });
});

describe("buildUsersCsv", () => {
  it("exporte un compte géré avec une cellule e-mail vide", () => {
    const managed = createUser({
      id: 7,
      email: null,
      kind: "managed",
      first_name: "Tom",
      guardian_names: "Marie Dupont, Paul Dupont",
    });
    const csv = buildUsersCsv([createUser(), managed]);
    const lines = csv.split("\n");

    expect(lines).toHaveLength(3);
    const cells = lines[2].split(";");
    expect(cells[0]).toBe('"7"');
    expect(cells[1]).toBe('""');
    expect(lines[2]).not.toContain("null");
    expect(lines[2]).toContain('"Musicien géré"');
    expect(lines[2]).toContain('"Marie Dupont, Paul Dupont"');
  });

  it("double les guillemets et ajoute les colonnes parents", () => {
    const csv = buildUsersCsv([createUser({ first_name: 'Léa "Lili"' })]);
    const [header, row] = csv.split("\n");

    expect(header).toContain('"Responsables légaux"');
    expect(header).toContain('"Enfants"');
    expect(row).toContain('"Léa ""Lili"""');
  });
});
