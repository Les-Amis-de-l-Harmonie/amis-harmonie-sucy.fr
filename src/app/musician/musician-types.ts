import type { InsuranceInstrument, MusicianProfile, PresenceStatus } from "@/db/types";

export interface ProfileWithExtras extends Partial<MusicianProfile> {
  harmonieInstruments?: string[];
  email?: string;
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
  date_of_birth: string;
  avatar: string | null;
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
  };
  roster: PresenceRosterEntry[];
  counts: {
    present: number;
    absent: number;
    noAnswer: number;
    totalMembers: number;
  };
}
