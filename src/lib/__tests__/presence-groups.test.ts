import { describe, expect, it } from "vitest";
import {
  DIRECTION_GROUP_LABEL,
  groupMembersByPupitre,
  type GroupableMember,
} from "../presence-groups";
import { INSTRUMENT_WITHOUT_SECTION_LABEL } from "../instruments";

function member(
  userId: number,
  firstName: string,
  lastName: string,
  instruments: string[],
  primaryInstrument: string | null
): GroupableMember {
  return { userId, firstName, lastName, instruments, primaryInstrument };
}

describe("groupMembersByPupitre", () => {
  it("place la direction en premier et ordonne chef d'orchestre puis chef adjoint", () => {
    const groups = groupMembersByPupitre([
      member(1, "Zoé", "Zola", ["Chef d'orchestre"], "Chef d'orchestre"),
      member(2, "Alice", "Adam", ["Chef adjoint"], "Chef adjoint"),
      member(3, "Paul", "Trompette", ["Trompette"], "Trompette"),
    ]);

    expect(groups.map((group) => group.label)).toEqual([DIRECTION_GROUP_LABEL, "Trompette"]);
    expect(groups[0]?.members.map((item) => item.userId)).toEqual([1, 2]);
  });

  it("ne duplique pas un membre qui détient les deux rôles", () => {
    const groups = groupMembersByPupitre([
      member(
        1,
        "Paul",
        "Direction",
        ["Chef adjoint", "Chef d’orchestre", "Clarinette"],
        "Clarinette"
      ),
      member(2, "Alice", "Adam", ["Chef adjoint"], "Chef adjoint"),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe(DIRECTION_GROUP_LABEL);
    expect(groups[0]?.members).toHaveLength(2);
    expect(groups[0]?.members.map((item) => item.userId)).toEqual([1, 2]);
  });

  it("départage deux membres d'un même rôle par leur nom", () => {
    const groups = groupMembersByPupitre([
      member(1, "Zoé", "Martin", ["Chef adjoint"], "Chef adjoint"),
      member(2, "Alice", "Bernard", ["Chef adjoint"], "Chef adjoint"),
    ]);

    expect(groups[0]?.members.map((item) => item.userId)).toEqual([2, 1]);
  });

  it("retire la direction de son pupitre principal normal", () => {
    const groups = groupMembersByPupitre([
      member(1, "Paul", "Chef", ["Chef adjoint", "Trompette"], "Trompette"),
      member(2, "Alice", "Pupitre", ["Trompette"], "Trompette"),
    ]);

    expect(groups[0]?.label).toBe(DIRECTION_GROUP_LABEL);
    expect(
      groups.find((group) => group.label === "Trompette")?.members.map((item) => item.userId)
    ).toEqual([2]);
  });

  it("retombe sur l'instrument détenu quand le principal n'est plus présent", () => {
    const groups = groupMembersByPupitre([
      member(1, "Paul", "Trompette", ["Cor", "Trompette"], "Clarinette"),
    ]);

    expect(groups.map((group) => group.label)).toEqual(["Cor"]);
  });

  it("reconnaît l'apostrophe typographique des rôles de direction", () => {
    const groups = groupMembersByPupitre([
      member(1, "Paul", "Chef", ["Chef d’orchestre"], "Chef d’orchestre"),
    ]);

    expect(groups[0]?.label).toBe(DIRECTION_GROUP_LABEL);
  });

  it("place les membres sans instrument dans le groupe dédié, en dernier", () => {
    const groups = groupMembersByPupitre([
      member(1, "Paul", "Sans", [], null),
      member(2, "Alice", "Cor", ["Cor"], "Cor"),
    ]);

    expect(groups.at(-1)?.label).toBe(INSTRUMENT_WITHOUT_SECTION_LABEL);
  });

  it("n'émet jamais un groupe nommé comme un rôle de direction", () => {
    const groups = groupMembersByPupitre([
      member(1, "Paul", "Chef", ["Chef d'orchestre"], "Chef d'orchestre"),
      member(2, "Alice", "Chef", ["Chef adjoint"], "Chef adjoint"),
      member(3, "Zoé", "Sans", [], null),
    ]);

    expect(groups.map((group) => group.label)).not.toContain("Chef d'orchestre");
    expect(groups.map((group) => group.label)).not.toContain("Chef adjoint");
  });

  it("retourne une liste vide sans groupe pour un effectif vide", () => {
    expect(groupMembersByPupitre([])).toEqual([]);
  });

  it("garantit des clés distinctes en cas de collision avec un libellé réservé", () => {
    const groups = groupMembersByPupitre([
      member(1, "Paul", "Chef", ["Chef d'orchestre"], "Chef d'orchestre"),
      member(2, "Alice", "Pupitre", ["Direction"], "Direction"),
    ]);

    expect(groups.filter((group) => group.label === DIRECTION_GROUP_LABEL)).toHaveLength(2);
    expect(new Set(groups.map((group) => group.key)).size).toBe(groups.length);
    expect(groups.map((group) => group.key)).toEqual(["direction", "instrument:Direction"]);
  });
});
