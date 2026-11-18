import type { UserKind } from "@/db/types";
import {
  getAge,
  getFullName,
  isAdultWithLinkedGuardian,
  type UserWithProfile,
} from "./users-shared";

/**
 * Calculs de la page « Familles » et de la carte « À vérifier » du tableau de bord.
 * Tout est pur : on part de la liste des utilisateurs et de la liste des liens
 * responsable → enfant, sans autre requête.
 */

/** Un lien tel que renvoyé par `GET /api/admin/guardians` (sans `userId`). */
export interface GuardianLink {
  linkId: number;
  guardianUserId: number;
  childUserId: number;
  relation: string | null;
  createdAt?: string | null;
}

export interface FamilyMember {
  id: number;
  name: string;
  /** Âge en années, `null` sans date de naissance valide. */
  age: number | null;
  kind: UserKind;
  isActive: boolean;
  user: UserWithProfile;
}

export interface FamilyGuardian extends FamilyMember {
  /** Liens de parenté de ce responsable (« mère », « tuteur »…), sans doublon. */
  relations: string[];
}

export interface FamilyChild extends FamilyMember {
  guardians: { member: FamilyMember; relation: string | null }[];
}

export interface Family {
  key: string;
  guardians: FamilyGuardian[];
  children: FamilyChild[];
}

export interface AttentionLists {
  /** Moins de 18 ans et aucun responsable. */
  minorsWithoutGuardian: FamilyMember[];
  /** Musicien actif sans date de naissance : impossible de savoir s'il est mineur. */
  missingBirthDate: FamilyMember[];
  /** Compte sans connexion et sans responsable : personne ne peut ouvrir son espace. */
  managedWithoutGuardian: FamilyMember[];
  /** 18 ans ou plus, mais un responsable est encore lié. */
  adultsStillLinked: (FamilyMember & { guardianNames: string })[];
  /** Enfant relié dont la valeur effective du droit à l'image est encore vide. */
  pendingImageConsent: (FamilyMember & { guardianNames: string })[];
}

export interface AttentionCounts {
  minorsWithoutGuardian: number;
  missingBirthDate: number;
  managedWithoutGuardian: number;
  adultsStillLinked: number;
  pendingImageConsent: number;
}

export interface PrintRow {
  child: FamilyMember;
  guardians: {
    name: string;
    relation: string | null;
    phone: string | null;
    email: string | null;
  }[];
  emergency: { name: string; phone: string | null } | null;
}

export interface FamiliesModel {
  families: Family[];
  attention: AttentionLists;
  printRows: PrintRow[];
}

function toMember(user: UserWithProfile & { id: number }, now: Date): FamilyMember {
  return {
    id: user.id,
    name: getFullName(user) || "Sans nom",
    age: getAge(user.date_of_birth, now),
    kind: user.kind ?? "member",
    isActive: user.is_active !== 0,
    user,
  };
}

function compareNames(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name, "fr");
}

/** Nom de famille d'abord, comme dans la liste des utilisateurs. */
function sortKey(member: FamilyMember): string {
  return `${member.user.last_name ?? ""} ${member.user.first_name ?? ""}`.trim().toLowerCase();
}

function compareBySortKey(a: FamilyMember, b: FamilyMember): number {
  return sortKey(a).localeCompare(sortKey(b), "fr");
}

/** Un compte joue à l'Harmonie (ni administrateur, ni responsable seulement). */
function isPlayer(user: UserWithProfile): boolean {
  return user.role === "MUSICIAN" && (user.kind ?? "member") !== "guardian";
}

export function buildFamiliesModel(
  users: UserWithProfile[],
  links: GuardianLink[],
  now: Date = new Date()
): FamiliesModel {
  const byId = new Map<number, UserWithProfile & { id: number }>();
  for (const user of users) {
    if (user.id !== undefined) byId.set(user.id, user as UserWithProfile & { id: number });
  }
  const members = new Map<number, FamilyMember>();
  const memberOf = (id: number): FamilyMember | null => {
    const existing = members.get(id);
    if (existing) return existing;
    const user = byId.get(id);
    if (!user) return null;
    const created = toMember(user, now);
    members.set(id, created);
    return created;
  };

  // Les liens vers un compte absent de la liste (supprimé) sont ignorés.
  const validLinks = links.filter(
    (link) => byId.has(link.guardianUserId) && byId.has(link.childUserId)
  );

  // --- Familles : composantes connexes du graphe responsable ↔ enfant ----------------
  const parent = new Map<number, number>();
  const find = (id: number): number => {
    let root = id;
    while (parent.get(root) !== root) root = parent.get(root) as number;
    parent.set(id, root);
    return root;
  };
  for (const link of validLinks) {
    for (const id of [link.guardianUserId, link.childUserId]) {
      if (!parent.has(id)) parent.set(id, id);
    }
    parent.set(find(link.guardianUserId), find(link.childUserId));
  }

  const groups = new Map<number, { links: GuardianLink[] }>();
  for (const link of validLinks) {
    const root = find(link.childUserId);
    const group = groups.get(root) ?? { links: [] };
    group.links.push(link);
    groups.set(root, group);
  }

  const families: Family[] = [];
  for (const [root, group] of groups) {
    const guardianIds = [...new Set(group.links.map((link) => link.guardianUserId))];
    const childIds = [...new Set(group.links.map((link) => link.childUserId))];
    // Un même compte peut être à la fois enfant et responsable (cas rare) : on le garde
    // des deux côtés, la carte reste lisible.
    const guardians: FamilyGuardian[] = [];
    for (const id of guardianIds) {
      const member = memberOf(id);
      if (!member) continue;
      const relations = [
        ...new Set(
          group.links
            .filter((link) => link.guardianUserId === id)
            .map((link) => link.relation?.trim())
            .filter((relation): relation is string => !!relation)
        ),
      ];
      guardians.push({ ...member, relations });
    }
    const children: FamilyChild[] = [];
    for (const id of childIds) {
      const member = memberOf(id);
      if (!member) continue;
      const childGuardians = group.links
        .filter((link) => link.childUserId === id)
        .flatMap((link) => {
          const guardian = memberOf(link.guardianUserId);
          return guardian ? [{ member: guardian, relation: link.relation?.trim() || null }] : [];
        })
        .sort((a, b) => compareBySortKey(a.member, b.member));
      children.push({ ...member, guardians: childGuardians });
    }
    guardians.sort(compareBySortKey);
    // Aînés d'abord ; sans date de naissance en dernier.
    children.sort((a, b) => (b.age ?? -1) - (a.age ?? -1) || compareBySortKey(a, b));
    families.push({ key: String(root), guardians, children });
  }
  families.sort((a, b) =>
    compareBySortKey(a.guardians[0] ?? a.children[0], b.guardians[0] ?? b.children[0])
  );

  // --- Listes d'attention (comptes actifs seulement) --------------------------------
  const guardiansByChild = new Map<number, GuardianLink[]>();
  for (const link of validLinks) {
    const list = guardiansByChild.get(link.childUserId) ?? [];
    list.push(link);
    guardiansByChild.set(link.childUserId, list);
  }

  const attention: AttentionLists = {
    minorsWithoutGuardian: [],
    missingBirthDate: [],
    managedWithoutGuardian: [],
    adultsStillLinked: [],
    pendingImageConsent: [],
  };
  for (const user of byId.values()) {
    if (user.is_active === 0) continue;
    const member = memberOf(user.id);
    if (!member) continue;
    const childLinks = guardiansByChild.get(user.id) ?? [];
    if (isPlayer(user)) {
      if (member.age === null) attention.missingBirthDate.push(member);
      else if (member.age < 18 && childLinks.length === 0) {
        attention.minorsWithoutGuardian.push(member);
      }
      if (childLinks.length > 0) {
        const guardianNames = childLinks
          .map((link) => memberOf(link.guardianUserId)?.name)
          .filter((name): name is string => !!name)
          .join(", ");
        // `image_consent` est la valeur effective renvoyée par l'API : vide = personne n'a répondu.
        if (user.image_consent === null || user.image_consent === undefined) {
          attention.pendingImageConsent.push({ ...member, guardianNames });
        }
        if (isAdultWithLinkedGuardian({ ...user, guardian_names: guardianNames }, now)) {
          attention.adultsStillLinked.push({ ...member, guardianNames });
        }
      }
    }
    if (member.kind === "managed" && childLinks.length === 0) {
      attention.managedWithoutGuardian.push(member);
    }
  }
  for (const list of Object.values(attention)) list.sort(compareBySortKey);

  // --- Liste imprimable : mineurs et enfants reliés, avec les parents ----------------
  const printRows: PrintRow[] = [];
  for (const user of byId.values()) {
    if (user.is_active === 0 || !isPlayer(user)) continue;
    const member = memberOf(user.id);
    if (!member) continue;
    const childLinks = guardiansByChild.get(user.id) ?? [];
    const isMinor = member.age !== null && member.age < 18;
    if (!isMinor && childLinks.length === 0) continue;
    const emergencyName = [user.emergency_contact_first_name, user.emergency_contact_last_name]
      .filter(Boolean)
      .join(" ");
    printRows.push({
      child: member,
      guardians: childLinks
        .flatMap((link) => {
          const guardian = memberOf(link.guardianUserId);
          return guardian
            ? [
                {
                  name: guardian.name,
                  relation: link.relation?.trim() || null,
                  phone: guardian.user.phone?.trim() || null,
                  email: guardian.user.email,
                },
              ]
            : [];
        })
        .sort(compareNames),
      emergency:
        emergencyName || user.emergency_contact_phone
          ? { name: emergencyName, phone: user.emergency_contact_phone?.trim() || null }
          : null,
    });
  }
  printRows.sort((a, b) => compareBySortKey(a.child, b.child));

  return { families, attention, printRows };
}

export function countAttention(attention: AttentionLists): AttentionCounts {
  return {
    minorsWithoutGuardian: attention.minorsWithoutGuardian.length,
    missingBirthDate: attention.missingBirthDate.length,
    managedWithoutGuardian: attention.managedWithoutGuardian.length,
    adultsStillLinked: attention.adultsStillLinked.length,
    pendingImageConsent: attention.pendingImageConsent.length,
  };
}

export function totalAttention(counts: AttentionCounts): number {
  return (
    counts.minorsWithoutGuardian +
    counts.missingBirthDate +
    counts.managedWithoutGuardian +
    counts.adultsStillLinked +
    counts.pendingImageConsent
  );
}

/** Lien vers la fiche d'un utilisateur dans l'écran « Utilisateurs ». */
export function userAdminHref(userId: number): string {
  return `/admin/users?user=${userId}`;
}
