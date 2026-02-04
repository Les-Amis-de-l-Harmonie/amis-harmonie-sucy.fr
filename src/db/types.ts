export interface Event {
  id: number;
  title: string;
  image: string | null;
  location: string | null;
  description: string | null;
  date: string;
  time: string | null;
  price: string | null;
  details_link: string | null;
  reservation_link: string | null;
  created_at: string;
}

export interface Video {
  id: number;
  title: string;
  youtube_id: string;
  thumbnail: string | null;
  is_short: number;
  publication_date: string | null;
  created_at: string;
}

export interface Publication {
  id: number;
  instagram_post_id: string;
  created_at: string;
}

export interface GuestbookEntry {
  id: number;
  first_name: string;
  last_name: string;
  message: string;
  date: string;
  created_at: string;
}

export interface ContactSubmission {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  message: string;
  created_at: string;
}

export type UserRole = 'ADMIN' | 'MUSICIAN';

export interface User {
  id: number;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface MusicianProfile {
  id: number;
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  avatar: string | null;
  date_of_birth: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  postal_code: string | null;
  city: string | null;
  harmonie_start_date: string | null;
  is_conservatory_student: number;
  music_theory_level: string | null;
  emergency_contact_last_name: string | null;
  emergency_contact_first_name: string | null;
  emergency_contact_email: string | null;
  emergency_contact_phone: string | null;
  updated_at: string;
  created_at: string;
}

export interface MusicianInstrument {
  id: number;
  user_id: number;
  instrument_name: string;
  start_date: string | null;
  level: string | null;
  sort_order: number;
  created_at: string;
}

export interface AuthToken {
  id: number;
  token: string;
  email: string;
  expires_at: string;
  used: number;
  created_at: string;
}

export interface Session {
  id: number;
  session_id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

export interface UserWithProfile extends User {
  profile?: MusicianProfile;
}

// Legacy aliases for backward compatibility during migration
export type AdminUser = User;
export type AdminSession = Session & { email?: string };
