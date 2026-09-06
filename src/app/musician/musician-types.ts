import type { InsuranceInstrument, MusicianProfile } from "@/db/types";

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
