import type { MusicianProfile } from "@/db/types";
import type { Instrument } from "@/app/components/shared/InstrumentEditor";
import { resolveDeclaredPrimaryInstrument } from "@/lib/instruments";

export interface ProfileWithInstruments extends Partial<MusicianProfile> {
  instruments?: Instrument[];
  harmonieInstruments?: string[];
  primaryHarmonieInstrument?: string | null;
  email?: string;
}

/** Regex de validation en temps réel (un caractère par champ, jamais un format global). */
export const REGEX_PATTERNS = {
  name: /^[a-zA-ZÀ-ÿ\s'-]+$/, // Lettres, espaces, tirets, apostrophes
  phone: /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/, // Numéros français
  postalCode: /^\d{5}$/, // Exactement 5 chiffres
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, // Validation basique
};

/**
 * Validation au fil de la frappe, un champ à la fois. Un champ vide n'est
 * jamais signalé ici : c'est `validateProfile` (validation "obligatoire")
 * qui s'en charge, seulement à la tentative d'enregistrement.
 */
export function validateField(field: string, value: string): string | null {
  if (!value || value.trim() === "") return null;

  switch (field) {
    case "first_name":
    case "last_name":
    case "emergency_contact_first_name":
    case "emergency_contact_last_name":
    case "city":
      if (!REGEX_PATTERNS.name.test(value)) {
        return "Caractères autorisés : lettres, espaces, tirets et apostrophes";
      }
      break;
    case "phone":
    case "emergency_contact_phone":
      if (!REGEX_PATTERNS.phone.test(value)) {
        return "Format invalide. Ex: 06 12 34 56 78 ou +33 6 12 34 56 78";
      }
      break;
    case "postal_code":
      if (!REGEX_PATTERNS.postalCode.test(value)) {
        return "Le code postal doit contenir 5 chiffres";
      }
      break;
    case "emergency_contact_email":
      if (!REGEX_PATTERNS.email.test(value)) {
        return "Format d'email invalide";
      }
      break;
  }
  return null;
}

/**
 * Les 7 sections du formulaire, dans l'ordre d'affichage — source unique de
 * vérité pour `ProfileSectionNav` et pour le calcul de complétion. Le libellé
 * du contact d'urgence ici est le générique (âge inconnu) ; le titre affiché
 * sur la carte elle-même reste dynamique via `getEmergencyContactTitle`.
 */
export interface ProfileSectionMeta {
  id: string;
  label: string;
}

export const PROFILE_SECTIONS: ProfileSectionMeta[] = [
  { id: "photo", label: "Photo de profil" },
  { id: "personal-info", label: "Informations personnelles" },
  { id: "address", label: "Adresse" },
  { id: "harmonie", label: "Harmonie" },
  { id: "instrument-practice", label: "Pratique instrumentale" },
  // Libellé volontairement court : il n'est utilisé que par le sommaire d'ancres,
  // dont la colonne est étroite (« Contact d'urgence / Représentant légal » y était
  // tronqué en « Contact d'urgence / Rep… »). La section elle-même affiche son
  // titre complet et dynamique, « Représentant légal » ou « Contact d'urgence »
  // selon que le musicien est mineur — voir EmergencyContactSection.
  { id: "emergency-contact", label: "Contact d'urgence" },
  { id: "image-consent", label: "Droit à l'image" },
];

export interface ProfileFieldError {
  /** Correspond à l'`id` du champ dans le formulaire, pour y placer le focus. */
  field: string;
  /** Correspond à l'`id` de la section, pour y faire défiler la page. */
  sectionId: string;
  message: string;
}

/** Section de repli pour une erreur de format dont le champ n'a pas de
 * vérification "obligatoire" dédiée ci-dessous (n'arrive jamais en pratique
 * avec les champs actuels, gardé par prudence plutôt que par nécessité). */
const FORMAT_ERROR_SECTION: Record<string, string> = {
  first_name: "personal-info",
  last_name: "personal-info",
  phone: "personal-info",
  postal_code: "address",
  city: "address",
  emergency_contact_first_name: "emergency-contact",
  emergency_contact_last_name: "emergency-contact",
  emergency_contact_phone: "emergency-contact",
  emergency_contact_email: "emergency-contact",
};

/**
 * Remplace l'ancienne chaîne concaténée ("Veuillez renseigner : Prénom,
 * Nom, …") par une liste de champs précis, chacun rattaché à sa section et
 * cliquable pour y défiler. Logique pure, testable indépendamment du
 * composant de page.
 */
export function validateProfile(
  profile: ProfileWithInstruments,
  fieldErrors: Record<string, string>
): ProfileFieldError[] {
  const errors: ProfileFieldError[] = [];

  const required = (
    field: string,
    sectionId: string,
    label: string,
    value: string | null | undefined
  ) => {
    if (!value || !value.trim()) {
      errors.push({ field, sectionId, message: `${label} obligatoire` });
    }
  };

  required("first_name", "personal-info", "Prénom", profile.first_name);
  required("last_name", "personal-info", "Nom", profile.last_name);
  required("date_of_birth", "personal-info", "Date de naissance", profile.date_of_birth);
  required("phone", "personal-info", "Téléphone", profile.phone);
  required("address_line1", "address", "Adresse", profile.address_line1);
  required("postal_code", "address", "Code postal", profile.postal_code);
  required("city", "address", "Ville", profile.city);
  required(
    "harmonie_start_date",
    "harmonie",
    "Date d'entrée à l'Harmonie",
    profile.harmonie_start_date
  );

  if (!profile.harmonieInstruments || profile.harmonieInstruments.length === 0) {
    errors.push({
      field: "harmonie_instruments",
      sectionId: "harmonie",
      message: "Au moins un instrument joué à l'Harmonie est obligatoire",
    });
  } else if (
    profile.harmonieInstruments.length >= 2 &&
    !resolveDeclaredPrimaryInstrument(
      profile.harmonieInstruments,
      profile.primaryHarmonieInstrument
    )
  ) {
    errors.push({
      field: "harmonie_primary_instrument",
      sectionId: "harmonie",
      message: "Instrument principal (pupitre) obligatoire",
    });
  }

  if (profile.is_conservatory_student === undefined || profile.is_conservatory_student === null) {
    errors.push({
      field: "is_conservatory_student",
      sectionId: "instrument-practice",
      message: "Précisez si vous êtes élève au Conservatoire de Sucy-en-Brie",
    });
  }

  if (profile.image_consent === undefined || profile.image_consent === null) {
    errors.push({
      field: "image_consent",
      sectionId: "image-consent",
      message: "Choisissez une réponse pour le droit à l'image",
    });
  }

  required(
    "emergency_contact_first_name",
    "emergency-contact",
    "Prénom du contact d'urgence",
    profile.emergency_contact_first_name
  );
  required(
    "emergency_contact_last_name",
    "emergency-contact",
    "Nom du contact d'urgence",
    profile.emergency_contact_last_name
  );
  required(
    "emergency_contact_phone",
    "emergency-contact",
    "Téléphone du contact d'urgence",
    profile.emergency_contact_phone
  );

  // Erreurs de format déjà détectées en temps réel (`validateField`) : un champ
  // rempli avec une valeur invalide n'est jamais vide, donc jamais déjà
  // signalé par un `required()` ci-dessus — on les ajoute ici sans doublon.
  for (const [field, message] of Object.entries(fieldErrors)) {
    if (!message) continue;
    if (errors.some((error) => error.field === field)) continue;
    errors.push({ field, sectionId: FORMAT_ERROR_SECTION[field] ?? "personal-info", message });
  }

  return errors;
}

/**
 * Une section est "complète" quand aucune erreur ne la cible. Cas
 * particulier : la photo n'est jamais validée par `validateProfile`
 * (aucun champ obligatoire) — sa complétion suit simplement la présence
 * d'un avatar, pour donner malgré tout un repère de progression cohérent.
 */
export function getSectionCompletion(
  profile: ProfileWithInstruments,
  errors: ProfileFieldError[]
): Record<string, boolean> {
  const sectionsWithErrors = new Set(errors.map((error) => error.sectionId));
  const completion: Record<string, boolean> = {};
  for (const section of PROFILE_SECTIONS) {
    completion[section.id] =
      section.id === "photo" ? Boolean(profile.avatar) : !sectionsWithErrors.has(section.id);
  }
  return completion;
}
