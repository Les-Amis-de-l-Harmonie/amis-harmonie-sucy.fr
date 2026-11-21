import type { InsuranceInstrument, MusicianProfile, PresenceStatus } from "@/db/types";

export type { IdeaPreview } from "@/db/types";

/** Réponse d'un responsable légal au droit à l'image (prénom seulement). */
export interface ImageConsentGuardian {
  name: string;
  relation: string | null;
  /** `1` oui, `0` non, `null` pas encore répondu. */
  consent: 0 | 1 | null;
  isYou: boolean;
}

/**
 * Droit à l'image d'un musicien relié à un ou plusieurs responsables : la valeur
 * effective découle de leurs réponses (un non l'emporte, un oui suffit).
 */
export interface ImageConsentDetail {
  linked: boolean;
  effective: 0 | 1 | null;
  /** Réponse de la personne qui agit, quand elle agit pour l'enfant. */
  mine: 0 | 1 | null;
  guardians: ImageConsentGuardian[];
}

export interface ProfileWithExtras extends Partial<MusicianProfile> {
  harmonieInstruments?: string[];
  /** Renvoyé par `/api/musician/profile` (voir `src/app/api/musician.ts`) — nécessaire
   * pour réutiliser `validateProfile`/`getSectionCompletion` de `profile-validation.ts`
   * dans le parcours de complétion de l'accueil (`profile-journey.ts`). */
  primaryHarmonieInstrument?: string | null;
  email?: string | null;
  /** Droit à l'image décidé par un responsable légal (lecture seule pour le musicien). */
  imageConsentLocked?: boolean;
  /** Absent des anciennes réponses de l'API : toujours le traiter comme facultatif. */
  imageConsentDetail?: ImageConsentDetail;
  adhesion_2026_2027?: number;
  insurance_complete?: boolean;
  insuranceInstruments?: InsuranceInstrument[];
}

export interface UpcomingEvent {
  id?: number;
  title: string;
  date: string;
}

export interface Birthday {
  first_name: string | null;
  last_name: string | null;
  birthday: string;
  avatar: string | null;
  days_until: number;
}

export interface DashboardInfoSettings {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  bg_color: string;
  text_color: string;
  border_color: string;
  icon: string;
  is_active: number;
}

export interface PresenceRosterEntry {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  primaryInstrument: string | null;
  status: PresenceStatus | null;
}

export interface PresenceAnsweredBy {
  /** Prénom seul, jamais le nom d'un administrateur (`null` quand `byAssociation`). */
  name: string | null;
  /** Lien de parenté (« mère »…), s'il est renseigné. */
  relation: string | null;
  byAssociation: boolean;
  byYou: boolean;
}

export interface PresenceAuthorizedBy {
  name: string | null;
  relation: string | null;
  byYou: boolean;
  byAssociation: boolean;
  paper: boolean;
}

/** Autorisation parentale demandée pour une sortie (`null`/absent : rien à autoriser). */
export interface PresenceAuthorization {
  details: string | null;
  status: "authorized" | "missing";
  authorizedBy: PresenceAuthorizedBy | null;
  authorizedAt: string | null;
  /** Les détails ont changé depuis l'autorisation donnée. */
  outdated: boolean;
  /** Un responsable qui agit pour l'enfant peut autoriser ou retirer (événement à venir). */
  canAuthorize: boolean;
}

export interface PresenceEvent {
  id: number;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  address: string | null;
  response_deadline: string | null;
  response: {
    status: PresenceStatus | null;
    comment: string | null;
    updated_at: string | null;
    /**
     * Qui a donné cette réponse quand ce n'est pas le musicien lui-même (un parent,
     * ou l'association). Absent des anciennes réponses : toujours le traiter comme facultatif.
     */
    answeredBy?: PresenceAnsweredBy | null;
  };
  roster: PresenceRosterEntry[];
  authorization?: PresenceAuthorization | null;
  /** Infos pratiques saisies par l'association (jamais publiques) ; absentes des anciennes réponses. */
  dress_code?: string | null;
  call_time?: string | null;
  musician_notes?: string | null;
  counts: {
    present: number;
    absent: number;
    noAnswer: number;
    totalMembers: number;
  };
}
