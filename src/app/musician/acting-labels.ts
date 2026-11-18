import { useMusicianSession } from "./MusicianSession";
import type { ImageConsentDetail, PresenceAuthorizedBy } from "./musician-types";

/**
 * Textes du portail qui parlent à la première personne (« Mes prestations »,
 * « Votre progression »…). Quand un responsable agit pour un enfant, ils passent
 * à la troisième personne avec le prénom de l'enfant (« Prestations de Lila »).
 * Sans délégation, on renvoie exactement les textes d'origine.
 */
export interface ActingLabels {
  /** Prénom de l'enfant, `null` quand on agit pour soi. */
  name: string | null;
  navPrestations: string;
  navProfile: string;
  greeting: (firstName: string) => string;
  journeyTitle: string;
  prestationsUrgent: string;
  prestationsNext: string;
  ctaIndicatePresences: string;
  ctaSeePrestations: string;
  pageTitlePrestations: string;
  pagePendingCount: (count: number) => string;
  pageIndicateEach: string;
  pageNothingToAnswer: string;
  pageAllAnswered: string;
  pageAllAnsweredBanner: string;
  responsesHeading: string;
  legendEditAnswer: string;
  currentRowBadge: string;
  viewAnswerCell: (eventLabel: string, status: string) => string;
  editAnswerCell: (eventLabel: string, status: string) => string;
  pageProfileTitle: string;
  pageProfileSubtitle: string;
  profilePhotoHint: string;
  profilePhotoPublic: string;
  clearAnswer: string;
  clearCommentWarning: string;
  editComment: string;
  commentSentWithAnswer: string;
  insuranceIntro: string;
  insuranceSaved: string;
  insuranceTitle: string;
  insuranceSaveButton: string;
  myIdeasTab: string;
  myIdeasHeading: string;
  publicWallIntro: string;
  ideaResponseTitle: string;
  consentAllow: string;
  consentDeny: string;
  consentYourAnswer: string;
  consentOthersTitle: string;
  consentStatusTitle: string;
  consentStatus: (effective: ImageConsentDetail["effective"]) => string;
  consentRule: string;
  pageAuthorizationsPending: (count: number) => string;
  authTitle: string;
  authAuthorize: string;
  authWithdrawMine: string;
  authWithdrawOther: string;
  authMissing: string;
  authWaitingParents: string;
  authOutdated: string;
  authAuthorizedBy: (by: PresenceAuthorizedBy | null, dateLabel: string | null) => string;
  journey: {
    editProfile: string;
    completeProfile: string;
    seeMembership: string;
    insuranceAfterMembership: string;
    manageInstruments: string;
    allAnswersUpToDate: string;
    seePrestations: string;
  };
}

const CONSENT_RULE =
  "Il suffit qu'un parent accepte ; si un parent refuse, la photo n'est pas utilisée.";
const AUTH_OUTDATED =
  "Les informations ont changé depuis l'autorisation : vérifiez-les et confirmez à nouveau.";

function authAuthorizedBy(by: PresenceAuthorizedBy | null, dateLabel: string | null): string {
  const date = dateLabel ? ` le ${dateLabel}` : "";
  if (by?.byYou) return `Autorisé par vous${by.paper ? " (papier)" : ""}${date}`;
  if (by?.byAssociation) {
    return `Autorisé par l'association${by.paper ? " (papier)" : ""}${date}`;
  }
  const name = by?.name?.trim();
  if (!name) {
    return `${by?.paper ? "Autorisé par un responsable, sur papier" : "Autorisé"}${date}`;
  }
  const relation = by?.relation?.trim();
  return `Autorisé par ${name}${relation ? ` (${relation})` : ""}${by?.paper ? ", sur papier" : ""}${date}`;
}

export function getActingLabels(
  actingForName: string | null,
  delegated = Boolean(actingForName?.trim())
): ActingLabels {
  const name = actingForName?.trim() ? actingForName.trim() : null;
  if (!name && !delegated) {
    return {
      name: null,
      navPrestations: "Mes prestations",
      navProfile: "Mon profil",
      greeting: (firstName) => `Bonjour, ${firstName} !`,
      journeyTitle: "Votre progression",
      prestationsUrgent: "Une réponse est attendue de votre part.",
      prestationsNext: "Vos prochaines dates avec l'harmonie.",
      ctaIndicatePresences: "Indiquer mes présences",
      ctaSeePrestations: "Voir mes prestations",
      pageTitlePrestations: "Mes prestations",
      pagePendingCount: (count) =>
        `${count} prestation${count > 1 ? "s" : ""} en attente de votre réponse`,
      pageIndicateEach: "Indiquez votre présence pour chaque prestation",
      pageNothingToAnswer: "Aucune prestation ne nécessite votre réponse pour le moment.",
      pageAllAnswered: "Vous avez répondu pour toutes les prestations à venir",
      pageAllAnsweredBanner: "Vous avez répondu à toutes les prestations à venir.",
      responsesHeading: "Mes réponses",
      legendEditAnswer: "Modifier votre réponse",
      currentRowBadge: "Vous",
      viewAnswerCell: (eventLabel, status) =>
        `Voir votre réponse pour ${eventLabel} (prestation passée), actuellement : ${status}`,
      editAnswerCell: (eventLabel, status) =>
        `Modifier votre réponse pour ${eventLabel}, actuellement : ${status}`,
      pageProfileTitle: "Mon Profil",
      pageProfileSubtitle: "Gérez vos informations personnelles",
      profilePhotoHint: "Cliquez sur l'image pour changer votre photo.",
      profilePhotoPublic:
        "Votre photo pourra être affichée sur le site internet pour le trombinoscope des musiciens.",
      clearAnswer: "Effacer ma réponse",
      clearCommentWarning: "Votre commentaire sera aussi supprimé.",
      editComment: "Modifier mon commentaire",
      commentSentWithAnswer: "Envoyé avec votre réponse",
      insuranceIntro: "Enregistrez vos instruments pour bénéficier de l'assurance de l'association",
      insuranceSaved: "Vos instruments assurés ont été enregistrés.",
      insuranceTitle: "Mes instruments assurés",
      insuranceSaveButton: "Enregistrer mes instruments",
      myIdeasTab: "Mes idées",
      myIdeasHeading: "Mes idées soumises",
      publicWallIntro:
        "Soutenez vos idées préférées dès maintenant et participez à faire émerger les meilleures !",
      ideaResponseTitle: "Votre idée",
      consentAllow: "J'autorise l'utilisation de mon image",
      consentDeny: "Je n'autorise pas l'utilisation de mon image",
      consentYourAnswer: "Votre réponse",
      consentOthersTitle: "Réponses de vos parents",
      consentStatusTitle: "Situation actuelle",
      consentStatus: (effective) =>
        effective === 1
          ? "Droit à l'image accordé."
          : effective === 0
            ? "Droit à l'image refusé : votre photo n'est pas utilisée."
            : "Aucune réponse pour le moment.",
      consentRule: CONSENT_RULE,
      pageAuthorizationsPending: (count) =>
        `${count} autorisation${count > 1 ? "s" : ""} parentale${count > 1 ? "s" : ""} en attente`,
      authTitle: "Autorisation parentale",
      authAuthorize: "J'autorise à participer",
      authWithdrawMine: "Retirer mon autorisation",
      authWithdrawOther: "Retirer l'autorisation",
      authMissing: "Autorisation manquante",
      authWaitingParents: "En attente de l'autorisation de vos parents",
      authOutdated: AUTH_OUTDATED,
      authAuthorizedBy,
      journey: {
        editProfile: "Modifier mon profil",
        completeProfile: "Compléter mon profil",
        seeMembership: "Voir mon adhésion",
        insuranceAfterMembership: "À déclarer après votre adhésion",
        manageInstruments: "Gérer mes instruments",
        allAnswersUpToDate: "Toutes vos réponses sont à jour",
        seePrestations: "Voir mes prestations",
      },
    };
  }

  const subject = name ?? "ce musicien";
  return {
    name: subject,
    navPrestations: `Prestations de ${subject}`,
    navProfile: `Profil de ${subject}`,
    greeting: () => `Espace de ${subject}`,
    journeyTitle: `Progression de ${subject}`,
    prestationsUrgent: `Une réponse est attendue pour ${subject}.`,
    prestationsNext: `Les prochaines dates de ${subject} avec l'harmonie.`,
    ctaIndicatePresences: "Indiquer les présences",
    ctaSeePrestations: "Voir les prestations",
    pageTitlePrestations: `Prestations de ${subject}`,
    pagePendingCount: (count) =>
      `${count} prestation${count > 1 ? "s" : ""} en attente de réponse pour ${subject}`,
    pageIndicateEach: `Indiquez la présence de ${subject} pour chaque prestation`,
    pageNothingToAnswer: `Aucune prestation ne nécessite de réponse pour ${subject} pour le moment.`,
    pageAllAnswered: `Toutes les prestations à venir ont une réponse pour ${subject}`,
    pageAllAnsweredBanner: `Toutes les prestations à venir ont une réponse pour ${subject}.`,
    responsesHeading: `Réponses de ${subject}`,
    legendEditAnswer: "Modifier la réponse",
    currentRowBadge: "Profil actif",
    viewAnswerCell: (eventLabel, status) =>
      `Voir la réponse de ${subject} pour ${eventLabel} (prestation passée), actuellement : ${status}`,
    editAnswerCell: (eventLabel, status) =>
      `Modifier la réponse de ${subject} pour ${eventLabel}, actuellement : ${status}`,
    pageProfileTitle: `Profil de ${subject}`,
    pageProfileSubtitle: `Gérez les informations de ${subject}`,
    profilePhotoHint: `Cliquez sur l'image pour changer la photo de ${subject}.`,
    profilePhotoPublic:
      "Cette photo pourra être affichée sur le site internet pour le trombinoscope des musiciens.",
    clearAnswer: "Effacer la réponse",
    clearCommentWarning: `Le commentaire pour ${subject} sera aussi supprimé.`,
    editComment: `Modifier le commentaire pour ${subject}`,
    commentSentWithAnswer: "Envoyé avec la réponse",
    insuranceIntro: `Enregistrez les instruments de ${subject} pour bénéficier de l'assurance de l'association`,
    insuranceSaved: `Les instruments assurés de ${subject} ont été enregistrés.`,
    insuranceTitle: `Instruments assurés de ${subject}`,
    insuranceSaveButton: "Enregistrer les instruments",
    myIdeasTab: `Idées de ${subject}`,
    myIdeasHeading: `Idées soumises par ${subject}`,
    publicWallIntro: "Les idées partagées par les musiciens de l'harmonie.",
    ideaResponseTitle: `Idée de ${subject}`,
    consentAllow: `J'autorise l'utilisation de l'image de ${name}`,
    consentDeny: `Je n'autorise pas l'utilisation de l'image de ${name}`,
    consentYourAnswer: "Votre réponse",
    consentOthersTitle: "Réponses des autres parents",
    consentStatusTitle: "Situation actuelle",
    consentStatus: (effective) =>
      effective === 1
        ? `Droit à l'image accordé pour ${name}.`
        : effective === 0
          ? `Droit à l'image refusé : la photo de ${name} n'est pas utilisée.`
          : `Aucune réponse pour le moment pour ${name}.`,
    consentRule: CONSENT_RULE,
    pageAuthorizationsPending: (count) =>
      `${count} autorisation${count > 1 ? "s" : ""} parentale${count > 1 ? "s" : ""} à donner pour ${name}`,
    authTitle: "Autorisation parentale",
    authAuthorize: `J'autorise ${name} à participer`,
    authWithdrawMine: "Retirer mon autorisation",
    authWithdrawOther: "Retirer l'autorisation",
    authMissing: "Autorisation manquante",
    authWaitingParents: "En attente de l'autorisation de vos parents",
    authOutdated: AUTH_OUTDATED,
    authAuthorizedBy,
    journey: {
      editProfile: "Modifier le profil",
      completeProfile: "Compléter le profil",
      seeMembership: "Voir l'adhésion",
      insuranceAfterMembership: "À déclarer après son adhésion",
      manageInstruments: "Gérer les instruments",
      allAnswersUpToDate: `Toutes les réponses de ${subject} sont à jour`,
      seePrestations: "Voir les prestations",
    },
  };
}

/** Textes adaptés au profil actif : troisième personne quand un responsable agit pour un enfant. */
export function useActingLabels(): ActingLabels {
  const { delegated, effective } = useMusicianSession();
  return getActingLabels(delegated ? (effective?.firstName ?? null) : null, delegated);
}
