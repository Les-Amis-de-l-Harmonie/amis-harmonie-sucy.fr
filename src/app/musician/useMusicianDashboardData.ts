"use client";

import { useCallback, useEffect, useState } from "react";
import type { OutingSettings, MusicianCardType, Video } from "@/db/types";
import type {
  Birthday,
  DashboardInfoSettings,
  ProfileWithExtras,
  UpcomingEvent,
} from "./musician-types";

/**
 * Les 10 clés gelées (décision D7, Phase 1) : aucun ajout, retrait ni
 * renommage. `CardOrderAdmin.tsx` et `src/db/types.ts:327-337` déclarent la
 * même liste séparément (triplication connue, verrouillée par
 * `src/app/musician/__tests__/card-order.test.tsx` plutôt que déduplifiée,
 * `src/db/**` étant hors périmètre).
 */
const DEFAULT_CARDS: MusicianCardType[] = [
  "profile",
  "adhesion",
  "assurance",
  "planning",
  "partitions",
  "boite-a-idee",
  "outing",
  "birthdays",
  "social",
  "trombinoscope",
];

/**
 * Un profil est complet quand tous les champs obligatoires du formulaire
 * (`MusicianProfile.tsx`, Phase 3 à venir) sont renseignés. Logique reprise
 * à l'identique de l'ancien `MusicianHome.tsx` — aucun changement de règle,
 * seulement un déplacement de fichier.
 */
export function isProfileComplete(profile: ProfileWithExtras | null): boolean {
  if (!profile) return false;

  const requiredFields = [
    profile.first_name,
    profile.last_name,
    profile.date_of_birth,
    profile.phone,
    profile.address_line1,
    profile.postal_code,
    profile.city,
    profile.harmonie_start_date,
    profile.emergency_contact_first_name,
    profile.emergency_contact_last_name,
    profile.emergency_contact_phone,
  ];

  const allTextFieldsFilled = requiredFields.every((field) => field && field.trim() !== "");
  const hasHarmonieInstruments =
    profile.harmonieInstruments !== undefined &&
    profile.harmonieInstruments !== null &&
    profile.harmonieInstruments.length > 0;
  const hasConservatoryChoice =
    profile.is_conservatory_student === 0 || profile.is_conservatory_student === 1;
  const hasImageConsentChoice = profile.image_consent === 0 || profile.image_consent === 1;

  return (
    allTextFieldsFilled && hasHarmonieInstruments && hasConservatoryChoice && hasImageConsentChoice
  );
}

export interface MusicianDashboardData {
  profile: ProfileWithExtras | null;
  loading: boolean;
  /** `false` tant que `loading` est vrai — un profil non chargé n'est jamais "complet". */
  profileComplete: boolean;
  nextEvent: UpcomingEvent | null;
  planningUrgent: boolean;
  urgentEvent: UpcomingEvent | null;
  outingSettings: OutingSettings | null;
  birthdays: Birthday[];
  infoSettings: DashboardInfoSettings | null;
  unreadIdeasCount: number;
  firstVideo: Video | null;
  cardOrder: MusicianCardType[];
}

/**
 * Extrait de l'ancien `MusicianHome.tsx` (`fetchProfile`, `isProfileComplete`,
 * la fusion `cardOrder`) : la même **unique** vague de 8 requêtes, sans en
 * ajouter ni en retirer. Toute la zone « essentiels » de la Phase 2b se
 * calcule à partir de ces données déjà là — c'est tout l'intérêt de
 * l'extraction, plutôt que de multiplier les appels réseau par module.
 */
export function useMusicianDashboardData(): MusicianDashboardData {
  const [profile, setProfile] = useState<ProfileWithExtras | null>(null);
  const [nextEvent, setNextEvent] = useState<UpcomingEvent | null>(null);
  const [outingSettings, setOutingSettings] = useState<OutingSettings | null>(null);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [infoSettings, setInfoSettings] = useState<DashboardInfoSettings | null>(null);
  const [planningUrgent, setPlanningUrgent] = useState(false);
  const [urgentEvent, setUrgentEvent] = useState<UpcomingEvent | null>(null);
  const [firstVideo, setFirstVideo] = useState<Video | null>(null);
  const [cardOrder, setCardOrder] = useState<MusicianCardType[]>(DEFAULT_CARDS);
  const [loading, setLoading] = useState(true);
  const [unreadIdeasCount, setUnreadIdeasCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    try {
      const [
        profileRes,
        outingRes,
        cardOrderRes,
        infoRes,
        birthdaysRes,
        ideasRes,
        planningRes,
        videosRes,
      ] = await Promise.all([
        fetch("/api/musician/profile"),
        fetch("/api/outing-settings"),
        fetch("/api/card-order"),
        fetch("/api/info-settings"),
        fetch("/api/musician/birthdays"),
        fetch("/api/musician/ideas?count=unread"),
        fetch("/api/musician/planning-check"),
        fetch("/api/videos"),
      ]);

      if (profileRes.ok) {
        const data = (await profileRes.json()) as ProfileWithExtras;
        setProfile(data);
      }

      if (outingRes.ok) {
        const outingData = (await outingRes.json()) as OutingSettings;
        setOutingSettings(outingData);
      }

      if (cardOrderRes.ok) {
        const cardData = (await cardOrderRes.json()) as { card_order: string };
        if (cardData.card_order) {
          try {
            const parsed = JSON.parse(cardData.card_order) as MusicianCardType[];
            // Rejette les clés inconnues, ajoute les clés gelées manquantes en fin.
            const validCards = parsed.filter((card): card is MusicianCardType =>
              DEFAULT_CARDS.includes(card)
            );
            const missingCards = DEFAULT_CARDS.filter((card) => !validCards.includes(card));
            setCardOrder([...validCards, ...missingCards]);
          } catch {
            // Garde l'ordre par défaut.
          }
        }
      }

      if (infoRes.ok) {
        const infoData = (await infoRes.json()) as DashboardInfoSettings;
        setInfoSettings(infoData.is_active === 1 ? infoData : null);
      }

      if (birthdaysRes.ok) {
        const birthdaysData = (await birthdaysRes.json()) as Birthday[];
        setBirthdays(birthdaysData);
      }

      if (ideasRes.ok) {
        const ideasData = (await ideasRes.json()) as { count: number };
        setUnreadIdeasCount(ideasData.count);
      }

      if (planningRes.ok) {
        const planningData = (await planningRes.json()) as {
          urgent: boolean;
          nextEvent: UpcomingEvent | null;
          urgentEvent?: UpcomingEvent | null;
        };
        setPlanningUrgent(planningData.urgent);
        if (planningData.nextEvent) {
          setNextEvent(planningData.nextEvent);
        }
        setUrgentEvent(planningData.urgentEvent ?? null);
      }

      if (videosRes.ok) {
        const videosData = (await videosRes.json()) as Video[];
        if (videosData.length > 0) {
          setFirstVideo(videosData[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const profileComplete = !loading && profile ? isProfileComplete(profile) : false;

  return {
    profile,
    loading,
    profileComplete,
    nextEvent,
    planningUrgent,
    urgentEvent,
    outingSettings,
    birthdays,
    infoSettings,
    unreadIdeasCount,
    firstVideo,
    cardOrder,
  };
}
