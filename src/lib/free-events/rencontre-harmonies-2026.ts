/**
 * Configuration de la réservation gratuite « Rencontre d'Harmonies » du 14 novembre 2026.
 *
 * Données pures : ce module est importé côté client (formulaire) et côté serveur
 * (API, e-mails, admin). Aucun import de `cloudflare:workers` ici.
 *
 * Les textes ont été validés par le Bureau : ne pas les reformuler.
 * Ne jamais mentionner par écrit la quête de fin de concert.
 */

export interface FreeEventOption {
  code: string;
  label: string;
}

export interface FreeEventProgramItem {
  time: string;
  label: string;
}

export interface FreeEventConfig {
  slug: string;
  /** Chemin public, imprimé en QR code : ne jamais le changer. */
  path: string;
  title: string;
  /** Date et heure ISO du début du concert (heure de Paris). */
  startsAt: string;
  /** Après cette date, l'API refuse les réservations et la page affiche un message de fin. */
  closesAt: string;
  dateLabel: string;
  dateShortLabel: string;
  placeLabel: string;
  admissionLabel: string;
  intro: string;
  program: FreeEventProgramItem[];
  venue: {
    name: string;
    streetAddress: string;
    postalCode: string;
    city: string;
  };
  parking: string;
  reservationInfo: string;
  contact: {
    phone: string;
    phoneHref: string;
    email: string;
  };
  joinTitle: string;
  joinText: string;
  form: {
    interestsLegend: string;
    interests: FreeEventOption[];
    sourceLabel: string;
    sources: FreeEventOption[];
    newsletterLabel: string;
    submitLabel: string;
    privacyNotice: string;
    maxPartySize: number;
  };
  /** Message de succès ; `{N}` est remplacé par le nombre de personnes. */
  successMessage: string;
  duplicateMessage: string;
  closedMessage: string;
  consentTextVersion: string;
  /** Date limite de suppression des données des personnes sans consentement newsletter. */
  purgeBefore: string;
}

export const RENCONTRE_HARMONIES_2026: FreeEventConfig = {
  slug: "rencontre-harmonies-2026",
  path: "/rencontre-harmonies-2026",
  title: "Rencontre d'Harmonies",
  startsAt: "2026-11-14T15:00:00+01:00",
  closesAt: "2026-11-14T19:00:00+01:00",
  dateLabel: "Samedi 14 novembre 2026 à 15h",
  dateShortLabel: "samedi 14 novembre",
  placeLabel: "Espace Jean-Marie Poirier, Sucy-en-Brie",
  admissionLabel: "Entrée gratuite sur réservation",
  intro:
    "Quatre orchestres, 80 musiciens, un après-midi de musique. L'Harmonie Municipale de Sucy-en-Brie reçoit l'Orchestre d'Harmonie de Villecresnes et deux formations du conservatoire : l'orchestre à vents et les ensembles de saxophones. Pour finir, tous les musiciens se retrouvent sur scène pour un final commun.",
  program: [
    { time: "14h30", label: "ouverture des portes" },
    { time: "15h", label: "ensembles de saxophones du conservatoire" },
    { time: "15h40", label: "orchestre à vents du conservatoire" },
    { time: "16h15", label: "Orchestre d'Harmonie de Villecresnes" },
    { time: "17h", label: "Harmonie Municipale de Sucy-en-Brie" },
    { time: "17h45", label: "final avec tous les musiciens" },
    { time: "18h", label: "fin du concert" },
  ],
  venue: {
    name: "Espace Jean-Marie Poirier",
    streetAddress: "1 esplanade du 18 Juin 1940",
    postalCode: "94370",
    city: "Sucy-en-Brie",
  },
  parking:
    "parking des Fontaines (gratuit) ; parking Montaleau (gratuit : à l'accueil de l'Espace Jean-Marie Poirier, échangez votre ticket contre une contremarque de parking)",
  reservationInfo:
    "gratuite, elle nous aide à préparer l'accueil. Sans réservation, vous serez accueillis dans la limite des places disponibles.",
  contact: {
    phone: "07 83 51 17 41",
    phoneHref: "tel:+33783511741",
    email: "contact@amis-harmonie-sucy.fr",
  },
  joinTitle: "Vous jouez d'un instrument ?",
  joinText:
    "L'Harmonie Municipale de Sucy-en-Brie répète le vendredi soir et accueille volontiers de nouveaux musiciens, quel que soit leur âge. Venez nous en parler à l'issue du concert !",
  form: {
    interestsLegend: "Vous venez surtout pour…",
    interests: [
      { code: "harmonie-sucy", label: "Harmonie Municipale de Sucy-en-Brie" },
      { code: "villecresnes", label: "Orchestre d'Harmonie de Villecresnes" },
      { code: "conservatoire-vents", label: "Orchestre à vents du conservatoire" },
      { code: "conservatoire-saxophones", label: "Ensembles de saxophones du conservatoire" },
      { code: "curiosite", label: "Par curiosité" },
    ],
    sourceLabel: "Comment avez-vous connu ce concert ?",
    sources: [
      { code: "affiche", label: "Affiche ou flyer" },
      { code: "ville", label: "Newsletter ou site de la Ville" },
      { code: "panneaux", label: "Panneaux lumineux" },
      { code: "reseaux", label: "Réseaux sociaux" },
      { code: "conservatoire", label: "Conservatoire" },
      { code: "musicien", label: "Par un musicien" },
      { code: "autre", label: "Autre" },
    ],
    newsletterLabel:
      "Je souhaite recevoir par e-mail les prochaines dates des Amis de l'Harmonie (concerts, Sucy Dansant…). Désinscription possible à tout moment.",
    submitLabel: "Réserver",
    privacyNotice:
      "Vos données servent uniquement à gérer votre réservation : confirmation, rappel et message de remerciement après le concert. Elles ne sont transmises à personne et sont supprimées au plus tard le 31 décembre 2026, sauf si vous avez demandé à recevoir nos prochaines dates. Pour toute question ou pour les faire supprimer : contact@amis-harmonie-sucy.fr.",
    maxPartySize: 10,
  },
  successMessage:
    "Merci ! Votre réservation pour {N} personne(s) est enregistrée. Vous allez recevoir un e-mail de confirmation.",
  duplicateMessage:
    "Une réservation existe déjà avec cette adresse e-mail. Pour la modifier, répondez à l'e-mail de confirmation ou écrivez à contact@amis-harmonie-sucy.fr.",
  closedMessage:
    "Les réservations sont closes : le concert a eu lieu le samedi 14 novembre 2026. Merci à toutes et à tous !",
  consentTextVersion: "2026-10-15",
  purgeBefore: "2026-12-31",
};

export function formatSuccessMessage(event: FreeEventConfig, partySize: number): string {
  return event.successMessage.replace("{N}", String(partySize));
}

export function isEventClosed(event: FreeEventConfig, now: Date = new Date()): boolean {
  return now.getTime() >= new Date(event.closesAt).getTime();
}
