"use client";

import { useCallback, useEffect, useState } from "react";
import type { OutingSettings, Video } from "@/db/types";
import type {
  Birthday,
  DashboardInfoSettings,
  IdeaPreview,
  ProfileWithExtras,
  UpcomingEvent,
} from "./musician-types";

export interface MusicianDashboardData {
  profile: ProfileWithExtras | null;
  loading: boolean;
  nextEvents: UpcomingEvent[];
  planningUrgent: boolean;
  urgentEvent: UpcomingEvent | null;
  pendingCount: number;
  outingSettings: OutingSettings | null;
  birthdays: Birthday[];
  infoSettings: DashboardInfoSettings | null;
  unreadIdeasCount: number;
  recentIdeas: IdeaPreview[];
  firstVideo: Video | null;
}

/**
 * Extrait de l'ancien `MusicianHome.tsx` (`fetchProfile`) :
 * la même vague de requêtes parallèles, moins `/api/card-order` — la grille de
 * 10 cartes qui en dépendait a disparu en Phase 2b (voir `MusicianHome.tsx` et
 * le rapport de Phase 2b), le tri administrable des cartes n'a donc plus de
 * consommateur. 7 requêtes au lieu de 8.
 */
export function useMusicianDashboardData(): MusicianDashboardData {
  const [profile, setProfile] = useState<ProfileWithExtras | null>(null);
  const [nextEvents, setNextEvents] = useState<UpcomingEvent[]>([]);
  const [outingSettings, setOutingSettings] = useState<OutingSettings | null>(null);
  const [birthdays, setBirthdays] = useState<Birthday[]>([]);
  const [infoSettings, setInfoSettings] = useState<DashboardInfoSettings | null>(null);
  const [planningUrgent, setPlanningUrgent] = useState(false);
  const [urgentEvent, setUrgentEvent] = useState<UpcomingEvent | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [firstVideo, setFirstVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadIdeasCount, setUnreadIdeasCount] = useState(0);
  const [recentIdeas, setRecentIdeas] = useState<IdeaPreview[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, outingRes, infoRes, birthdaysRes, ideasRes, planningRes, videosRes] =
        await Promise.all([
          fetch("/api/musician/profile"),
          fetch("/api/outing-settings"),
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

      if (infoRes.ok) {
        const infoData = (await infoRes.json()) as DashboardInfoSettings;
        setInfoSettings(infoData.is_active === 1 ? infoData : null);
      }

      if (birthdaysRes.ok) {
        const birthdaysData = (await birthdaysRes.json()) as Birthday[];
        setBirthdays(birthdaysData);
      }

      if (ideasRes.ok) {
        const ideasData = (await ideasRes.json()) as {
          count: number;
          recent?: IdeaPreview[];
        };
        setUnreadIdeasCount(ideasData.count);
        setRecentIdeas(ideasData.recent ?? []);
      }

      if (planningRes.ok) {
        const planningData = (await planningRes.json()) as {
          urgent: boolean;
          nextEvents: UpcomingEvent[];
          urgentEvent?: UpcomingEvent | null;
          pendingCount: number;
        };
        setPlanningUrgent(planningData.urgent);
        setNextEvents(planningData.nextEvents);
        setUrgentEvent(planningData.urgentEvent ?? null);
        setPendingCount(planningData.pendingCount);
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

  return {
    profile,
    loading,
    nextEvents,
    planningUrgent,
    urgentEvent,
    pendingCount,
    outingSettings,
    birthdays,
    infoSettings,
    unreadIdeasCount,
    recentIdeas,
    firstVideo,
  };
}
