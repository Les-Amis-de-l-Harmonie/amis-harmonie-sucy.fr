import { describe, expect, it } from "vitest";
import {
  buildFamiliesModel,
  countAttention,
  totalAttention,
  userAdminHref,
  type GuardianLink,
} from "../families";
import type { UserWithProfile } from "../users-shared";

const NOW = new Date(2026, 10, 18);

let nextId = 1000;
function account(overrides: Partial<UserWithProfile> = {}): UserWithProfile {
  nextId += 1;
  return {
    id: nextId,
    email: `user${nextId}@example.com`,
    role: "MUSICIAN",
    kind: "member",
    is_active: 1,
    first_name: "Prénom",
    last_name: "Nom",
    date_of_birth: "1990-01-01",
    ...overrides,
  };
}

function link(
  linkId: number,
  guardianUserId: number,
  childUserId: number,
  relation: string | null = null
): GuardianLink {
  return { linkId, guardianUserId, childUserId, relation };
}

// Famille Leroy : un parent, deux enfants (un ado, un compte géré).
const nathalie = account({
  id: 100,
  kind: "guardian",
  first_name: "Nathalie",
  last_name: "Leroy",
  phone: "06 11 22 33 44",
  email: "nathalie@example.com",
});
const hugo = account({
  id: 8,
  first_name: "Hugo",
  last_name: "Leroy",
  date_of_birth: "2010-05-10",
  emergency_contact_first_name: "Tante",
  emergency_contact_last_name: "Leroy",
  emergency_contact_phone: "06 99 99 99 99",
});
const noe = account({
  id: 101,
  kind: "managed",
  email: null,
  first_name: "Noé",
  last_name: "Leroy",
  date_of_birth: "2018-02-01",
});

// Famille Dupont : deux parents, une fille.
const marie = account({
  id: 110,
  kind: "guardian",
  first_name: "Marie",
  last_name: "Dupont",
  phone: "06 10 10 10 10",
});
const paul = account({
  id: 111,
  kind: "guardian",
  first_name: "Paul",
  last_name: "Dupont",
  phone: "06 20 20 20 20",
});
const lea = account({
  id: 112,
  first_name: "Léa",
  last_name: "Dupont",
  date_of_birth: "2012-09-09",
});

// Lucas est un musicien qui est aussi le parent de Camille, majeure.
const lucas = account({ id: 2, first_name: "Lucas", last_name: "Martin" });
const camille = account({
  id: 3,
  first_name: "Camille",
  last_name: "Bernard",
  date_of_birth: "2006-03-02",
});

// Cas à signaler.
const tom = account({
  id: 120,
  first_name: "Tom",
  last_name: "Petit",
  date_of_birth: "2014-01-01",
});
const anna = account({ id: 121, first_name: "Anna", last_name: "Sansdate", date_of_birth: null });
const zed = account({
  id: 122,
  kind: "managed",
  email: null,
  first_name: "Zed",
  last_name: "Géré",
  date_of_birth: null,
});
const inactiveMinor = account({
  id: 123,
  first_name: "Ina",
  last_name: "Inactive",
  date_of_birth: "2015-01-01",
  is_active: 0,
});
const admin = account({ id: 124, role: "ADMIN", first_name: "Alice", last_name: "Admin" });
const guardianNoDate = account({
  id: 125,
  kind: "guardian",
  first_name: "Gaël",
  last_name: "Parent",
  date_of_birth: null,
});

const users = [
  nathalie,
  hugo,
  noe,
  marie,
  paul,
  lea,
  lucas,
  camille,
  tom,
  anna,
  zed,
  inactiveMinor,
  admin,
  guardianNoDate,
];
const links: GuardianLink[] = [
  link(1, 100, 8, "mère"),
  link(2, 100, 101, "mère"),
  link(3, 110, 112, "mère"),
  link(4, 111, 112, "père"),
  link(5, 2, 3, "père"),
  // Lien vers un compte supprimé : ignoré.
  link(6, 100, 9999, "mère"),
];

describe("buildFamiliesModel — familles", () => {
  const { families } = buildFamiliesModel(users, links, NOW);

  it("regroupe un responsable et tous ses enfants dans une même famille", () => {
    const leroy = families.find((family) => family.guardians.some((g) => g.id === 100));
    expect(leroy?.guardians.map((g) => g.name)).toEqual(["Nathalie Leroy"]);
    expect(leroy?.children.map((c) => c.name)).toEqual(["Hugo Leroy", "Noé Leroy"]);
  });

  it("réunit deux parents d'un même enfant dans une seule famille", () => {
    const dupont = families.find((family) => family.children.some((c) => c.id === 112));
    expect(dupont?.guardians.map((g) => g.name)).toEqual(["Marie Dupont", "Paul Dupont"]);
    expect(dupont?.children[0].guardians.map((g) => g.relation)).toEqual(["mère", "père"]);
  });

  it("garde un responsable qui est aussi musicien, avec son type de compte", () => {
    const martin = families.find((family) => family.guardians.some((g) => g.id === 2));
    expect(martin?.guardians[0].kind).toBe("member");
    expect(martin?.children[0].name).toBe("Camille Bernard");
  });

  it("calcule l'âge, le type de compte et les liens de parenté", () => {
    const leroy = families.find((family) => family.guardians.some((g) => g.id === 100));
    expect(leroy?.children.map((c) => [c.age, c.kind])).toEqual([
      [16, "member"],
      [8, "managed"],
    ]);
    expect(leroy?.guardians[0].relations).toEqual(["mère"]);
  });

  it("ignore les liens vers un compte absent et trie les familles par nom", () => {
    expect(families).toHaveLength(3);
    expect(families.map((family) => family.guardians[0].user.last_name)).toEqual([
      "Dupont",
      "Leroy",
      "Martin",
    ]);
  });

  it("ne crée aucune famille sans lien", () => {
    expect(buildFamiliesModel(users, [], NOW).families).toEqual([]);
  });
});

describe("buildFamiliesModel — à vérifier", () => {
  const { attention } = buildFamiliesModel(users, links, NOW);
  const names = (list: { name: string }[]) => list.map((member) => member.name);

  it("liste les mineurs sans responsable (comptes actifs seulement)", () => {
    expect(names(attention.minorsWithoutGuardian)).toEqual(["Tom Petit"]);
  });

  it("liste les musiciens actifs sans date de naissance, sans les responsables ni les admins", () => {
    expect(names(attention.missingBirthDate)).toEqual(["Zed Géré", "Anna Sansdate"]);
  });

  it("liste les comptes gérés sans responsable", () => {
    expect(names(attention.managedWithoutGuardian)).toEqual(["Zed Géré"]);
  });

  it("liste les majeurs encore reliés, avec leur responsable", () => {
    expect(attention.adultsStillLinked).toHaveLength(1);
    expect(attention.adultsStillLinked[0]).toMatchObject({
      name: "Camille Bernard",
      age: 20,
      guardianNames: "Lucas Martin",
    });
  });

  it("compte chaque liste et le total", () => {
    const counts = countAttention(attention);
    expect(counts).toEqual({
      minorsWithoutGuardian: 1,
      missingBirthDate: 2,
      managedWithoutGuardian: 1,
      adultsStillLinked: 1,
    });
    expect(totalAttention(counts)).toBe(5);
  });

  it("ne signale plus un mineur dès qu'un responsable est lié", () => {
    const model = buildFamiliesModel(users, [...links, link(7, 100, 120, "tante")], NOW);
    expect(model.attention.minorsWithoutGuardian).toEqual([]);
  });

  it("ne signale plus un compte géré dès qu'un responsable est lié", () => {
    const model = buildFamiliesModel(users, [...links, link(7, 100, 122, "mère")], NOW);
    expect(model.attention.managedWithoutGuardian).toEqual([]);
  });
});

describe("buildFamiliesModel — liste imprimable", () => {
  const { printRows } = buildFamiliesModel(users, links, NOW);

  it("contient les mineurs et les enfants reliés, triés par nom", () => {
    expect(printRows.map((row) => row.child.name)).toEqual([
      "Camille Bernard", // majeure mais encore reliée
      "Léa Dupont",
      "Hugo Leroy",
      "Noé Leroy",
      "Tom Petit", // mineur sans responsable : à voir aussi
    ]);
  });

  it("donne le nom, le lien, le téléphone et l'e-mail de chaque responsable", () => {
    const leaRow = printRows.find((row) => row.child.id === 112);
    expect(leaRow?.guardians).toEqual([
      { name: "Marie Dupont", relation: "mère", phone: "06 10 10 10 10", email: marie.email },
      { name: "Paul Dupont", relation: "père", phone: "06 20 20 20 20", email: paul.email },
    ]);
  });

  it("reprend le contact d'urgence de la fiche du musicien", () => {
    expect(printRows.find((row) => row.child.id === 8)?.emergency).toEqual({
      name: "Tante Leroy",
      phone: "06 99 99 99 99",
    });
    expect(printRows.find((row) => row.child.id === 112)?.emergency).toBeNull();
  });

  it("garde un mineur sans responsable, avec une liste de parents vide", () => {
    expect(printRows.find((row) => row.child.id === 120)?.guardians).toEqual([]);
  });

  it("exclut les comptes inactifs, les admins et les responsables seuls", () => {
    const ids = printRows.map((row) => row.child.id);
    expect(ids).not.toContain(123);
    expect(ids).not.toContain(124);
    expect(ids).not.toContain(100);
  });
});

describe("userAdminHref", () => {
  it("pointe vers la fiche dans les utilisateurs", () => {
    expect(userAdminHref(42)).toBe("/admin/users?user=42");
  });
});
