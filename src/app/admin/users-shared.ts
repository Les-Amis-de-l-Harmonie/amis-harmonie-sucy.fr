import type { UserKind, UserRole } from "@/db/types";

/**
 * Types et fonctions pures partagés par l'écran « Utilisateurs » de l'admin
 * (liste, fiche, export CSV, comptes parents).
 */

export interface UserWithProfile {
  id?: number;
  /** `null` pour un compte géré (musicien sans e-mail). */
  email: string | null;
  role: UserRole;
  kind?: UserKind;
  /** Création uniquement : musicien sans e-mail, géré par ses responsables. */
  noEmail?: boolean;
  /** « Prénom Nom, Prénom Nom » ou null. */
  guardian_names?: string | null;
  children_names?: string | null;
  is_active?: number;
  last_login?: string | null;
  created_at?: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  postal_code?: string | null;
  city?: string | null;
  harmonie_start_date?: string | null;
  is_conservatory_student?: number | null;
  music_theory_level?: string | null;
  emergency_contact_last_name?: string | null;
  emergency_contact_first_name?: string | null;
  emergency_contact_email?: string | null;
  emergency_contact_phone?: string | null;
  /** Valeur effective : pour un enfant relié, elle vient des réponses de ses responsables. */
  image_consent?: number | null;
  /** Vrai quand le droit à l'image d'un musicien relié est géré par ses responsables. */
  image_consent_managed?: boolean;
  adhesion_2026_2027?: number | null;
  instruments?: { instrument_name: string; start_date?: string | null; level?: string | null }[];
  harmonieInstruments?: string[];
  primaryHarmonieInstrument?: string | null;
}

/** Type de compte réel, en tenant compte du choix « sans e-mail » d'une création. */
export function getAccountKind(user: Pick<UserWithProfile, "kind" | "noEmail">): UserKind {
  if (user.noEmail) return "managed";
  return user.kind ?? "member";
}

/** Les responsables légaux ne sont pas des musiciens : pas d'adhésion, de profil ni de droit à l'image. */
export function isMusicianAccount(user: Pick<UserWithProfile, "role" | "kind" | "noEmail">) {
  return user.role === "MUSICIAN" && getAccountKind(user) !== "guardian";
}

export function getFullName(user: Pick<UserWithProfile, "first_name" | "last_name">): string {
  return `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
}

function lastSundayOfMonthUTC(year: number, monthIndex0: number) {
  const d = new Date(Date.UTC(year, monthIndex0 + 1, 0));
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

function parisOffsetMinutes(utc: Date) {
  const year = utc.getUTCFullYear();
  const dstStart = lastSundayOfMonthUTC(year, 2);
  dstStart.setUTCHours(1, 0, 0, 0);
  const dstEnd = lastSundayOfMonthUTC(year, 9);
  dstEnd.setUTCHours(1, 0, 0, 0);
  return utc >= dstStart && utc < dstEnd ? 120 : 60;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function formatParisDateTime(input: string | number | Date) {
  // Force UTC interpretation by adding 'Z' if no timezone specified
  let utc: Date;
  if (input instanceof Date) {
    utc = input;
  } else if (typeof input === "string" && !input.match(/[TZ]/)) {
    // SQLite format: '2026-02-26 22:29:00' -> treat as UTC
    utc = new Date(input.replace(" ", "T") + "Z");
  } else {
    utc = new Date(input);
  }
  const offsetMin = parisOffsetMinutes(utc);
  const paris = new Date(utc.getTime() + offsetMin * 60_000);

  const dd = pad2(paris.getUTCDate());
  const mm = pad2(paris.getUTCMonth() + 1);
  const yyyy = paris.getUTCFullYear();
  const hh = pad2(paris.getUTCHours());
  const min = pad2(paris.getUTCMinutes());

  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export const isProfileComplete = (user: UserWithProfile): boolean => {
  const requiredFields = [
    user.first_name,
    user.last_name,
    user.date_of_birth,
    user.phone,
    user.address_line1,
    user.postal_code,
    user.city,
    user.harmonie_start_date,
    user.emergency_contact_first_name,
    user.emergency_contact_last_name,
    user.emergency_contact_phone,
  ];
  const allTextFieldsFilled = requiredFields.every(
    (field) => field && field.toString().trim() !== ""
  );
  const hasConservatoryChoice =
    user.is_conservatory_student === 0 || user.is_conservatory_student === 1;
  const hasImageConsentChoice = user.image_consent === 0 || user.image_consent === 1;
  return allTextFieldsFilled && hasConservatoryChoice && hasImageConsentChoice;
};

/** Âge en années révolues à la date `now`, ou `null` si la date de naissance est absente ou invalide. */
export function getAge(dateOfBirth: string | null | undefined, now: Date = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateOfBirth ?? "");
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let age = now.getFullYear() - year;
  const birthdayPassed =
    now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() >= day);
  if (!birthdayPassed) age -= 1;
  return age;
}

/** Musicien majeur dont un responsable légal est encore lié : à vérifier par le bureau. */
export function isAdultWithLinkedGuardian(
  user: Pick<UserWithProfile, "date_of_birth" | "guardian_names" | "kind">,
  now: Date = new Date()
): boolean {
  if (user.kind === "guardian") return false;
  if (!user.guardian_names?.trim()) return false;
  const age = getAge(user.date_of_birth, now);
  return age !== null && age >= 18;
}

/** Texte recherché dans la liste : tolère l'e-mail `null` et les noms manquants. */
export function matchesUserSearch(
  user: UserWithProfile,
  query: string,
  { includeRelations = true }: { includeRelations?: boolean } = {}
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    user.email,
    user.first_name,
    user.last_name,
    getFullName(user),
    `${user.last_name ?? ""} ${user.first_name ?? ""}`,
    ...(includeRelations ? [user.guardian_names, user.children_names] : []),
  ];
  return haystack.some((value) => value?.toLowerCase().includes(q));
}

const KIND_LABELS: Record<UserKind, string> = {
  member: "Musicien",
  guardian: "Responsable légal",
  managed: "Musicien géré",
};

export function getKindLabel(kind: UserKind | undefined): string {
  return KIND_LABELS[kind ?? "member"];
}

const CSV_HEADERS = [
  "ID",
  "Email",
  "Rôle",
  "Statut",
  "Prénom",
  "Nom",
  "Date de naissance",
  "Téléphone",
  "Adresse",
  "Code postal",
  "Ville",
  "Date d'entrée Harmonie",
  "Élève conservatoire",
  "Niveau solfège",
  "Contact urgence - Prénom",
  "Contact urgence - Nom",
  "Contact urgence - Email",
  "Contact urgence - Téléphone",
  "Droit à l'image",
  "Adhésion 2026-2027",
  "Instruments personnels",
  "Instruments Harmonie",
  "Dernière connexion",
  "Date de création",
  "Type de compte",
  "Responsables légaux",
  "Enfants",
];

function csvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/** Contenu du fichier CSV (séparateur `;`), sans le BOM. Les e-mails `null` donnent une cellule vide. */
export function buildUsersCsv(users: UserWithProfile[]): string {
  const rows = users.map((user) => [
    user.id ?? "",
    user.email ?? "",
    user.role,
    user.is_active === 1 ? "Actif" : "Inactif",
    user.first_name ?? "",
    user.last_name ?? "",
    user.date_of_birth ?? "",
    user.phone ?? "",
    user.address_line1
      ? `${user.address_line1}${user.address_line2 ? `, ${user.address_line2}` : ""}`
      : "",
    user.postal_code ?? "",
    user.city ?? "",
    user.harmonie_start_date ?? "",
    user.is_conservatory_student === 1 ? "Oui" : user.is_conservatory_student === 0 ? "Non" : "",
    user.music_theory_level ?? "",
    user.emergency_contact_first_name ?? "",
    user.emergency_contact_last_name ?? "",
    user.emergency_contact_email ?? "",
    user.emergency_contact_phone ?? "",
    user.image_consent === 1 ? "Autorisé" : user.image_consent === 0 ? "Refusé" : "Non renseigné",
    user.adhesion_2026_2027 === 1 ? "Oui" : user.adhesion_2026_2027 === 0 ? "Non" : "",
    user.instruments?.map((i) => i.instrument_name).join("; ") ?? "",
    user.harmonieInstruments?.join("; ") ?? "",
    user.last_login ? formatParisDateTime(user.last_login) : "",
    user.created_at ? formatParisDateTime(user.created_at) : "",
    getKindLabel(user.kind),
    user.guardian_names ?? "",
    user.children_names ?? "",
  ]);

  return [CSV_HEADERS, ...rows].map((row) => row.map(csvCell).join(";")).join("\n");
}
