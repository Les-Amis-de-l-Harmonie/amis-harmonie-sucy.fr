import { useMusicianSession } from "./MusicianSession";

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
