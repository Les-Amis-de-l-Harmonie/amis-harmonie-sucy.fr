import { PROFILE_SECTIONS, validateProfile } from "./profile-validation";
import type { ProfileWithExtras, UpcomingEvent } from "./musician-types";

export type JourneyStepStatus = "done" | "todo";

export interface JourneyStep {
  key: "profile" | "adhesion" | "assurance" | "presence";
  title: string;
  status: JourneyStepStatus;
  /** Détail chiffré ou concret — jamais un simple booléen (voir la direction Phase 2b). */
  detail: string;
  href: string;
  cta: string;
}

export interface ProfileCompletionSummary {
  completedSections: number;
  totalSections: number;
  /** `true` quand aucun champ obligatoire ne manque (mêmes règles que le formulaire). */
  isComplete: boolean;
  /** `null` uniquement quand `isComplete` est vrai. */
  firstIncompleteSectionId: string | null;
}

/**
 * Réutilise telle quelle la validation du formulaire de profil
 * (`profile-validation.ts`, hors périmètre de cette phase) plutôt que de
 * dupliquer une règle de complétion distincte : le chiffre affiché à
 * l'accueil ("X sections sur 6") est donc toujours exact vis-à-vis de ce que
 * le formulaire exigera réellement à l'enregistrement.
 *
 * `{}` en second argument de `validateProfile` : aucune erreur de format en
 * temps réel à faire remonter ici, seulement les champs obligatoires
 * manquants — l'accueil n'édite aucun champ.
 */
export function summarizeProfileCompletion(
  profile: ProfileWithExtras | null
): ProfileCompletionSummary {
  const safeProfile = profile ?? {};
  const errors = validateProfile(safeProfile, {});
  const requiredSections = PROFILE_SECTIONS.filter((section) => section.id !== "photo");
  const sectionsWithErrors = new Set(errors.map((error) => error.sectionId));
  const completedSections = requiredSections.filter(
    (section) => !sectionsWithErrors.has(section.id)
  ).length;

  return {
    completedSections,
    totalSections: requiredSections.length,
    isComplete: errors.length === 0,
    firstIncompleteSectionId: errors[0]?.sectionId ?? null,
  };
}

/**
 * Construit le parcours de complétion à quatre étapes, dans l'ordre naturel
 * profil → adhésion → assurance → réponses de présence (voir le rapport de
 * Phase 2b). Aucune étape n'est bloquée par la précédente — cet ordre
 * n'est qu'un fil narratif, pas une porte : chaque `href` reste cliquable
 * quel que soit l'état des étapes qui la précèdent, contrairement à l'ancien
 * cadenas (purement cosmétique, voir `LockedCardOverlay` supprimé).
 */
export function buildProfileJourney(
  profile: ProfileWithExtras | null,
  planningUrgent: boolean,
  urgentEvent: UpcomingEvent | null,
  pendingCount: number
): JourneyStep[] {
  const completion = summarizeProfileCompletion(profile);
  const isMember = profile?.adhesion_2026_2027 === 1;
  const insuranceComplete = Boolean(profile?.insurance_complete);
  const insuredCount = profile?.insuranceInstruments?.length ?? 0;
  const hasPendingPresence = pendingCount > 0;

  const profileHref = completion.firstIncompleteSectionId
    ? `/musician/profile#${completion.firstIncompleteSectionId}`
    : "/musician/profile";

  return [
    {
      key: "profile",
      title: "Profil",
      status: completion.isComplete ? "done" : "todo",
      detail: `${completion.completedSections} section${completion.completedSections > 1 ? "s" : ""} sur ${completion.totalSections}`,
      href: profileHref,
      cta: completion.isComplete ? "Modifier mon profil" : "Compléter mon profil",
    },
    {
      key: "adhesion",
      title: "Adhésion",
      status: isMember ? "done" : "todo",
      detail: isMember ? "Adhérent 2026-2027" : "Non adhérent en 2026-2027",
      href: "/adhesion",
      cta: isMember ? "Voir mon adhésion" : "Adhérer maintenant",
    },
    {
      key: "assurance",
      title: "Assurance",
      status: isMember && insuranceComplete ? "done" : "todo",
      detail: !isMember
        ? "À déclarer après votre adhésion"
        : insuranceComplete
          ? `${insuredCount} instrument${insuredCount > 1 ? "s" : ""} assuré${insuredCount > 1 ? "s" : ""}`
          : "Aucun instrument déclaré",
      href: "/musician/assurance",
      cta: insuranceComplete ? "Gérer mes instruments" : "Déclarer un instrument",
    },
    {
      key: "presence",
      // « Prestations » et non « Réponses de présence » : la navigation, la page
      // /musician/disponibilites et ce module doivent employer le même mot pour
      // désigner la même chose.
      title: "Prestations",
      status: hasPendingPresence ? "todo" : "done",
      detail:
        planningUrgent && urgentEvent
          ? `En attente : ${urgentEvent.title}`
          : hasPendingPresence
            ? `${pendingCount} prestation${pendingCount > 1 ? "s" : ""} sans réponse`
            : "Toutes vos réponses sont à jour",
      href: "/musician/disponibilites",
      cta: hasPendingPresence ? "Répondre maintenant" : "Voir mes prestations",
    },
  ];
}
