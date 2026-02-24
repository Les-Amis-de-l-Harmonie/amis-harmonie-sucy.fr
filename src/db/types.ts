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
  sort_order: number;
  publication_date: string | null;
  created_at: string;
}

export interface Publication {
  id: number;
  instagram_post_id: string;
  thumbnail: string | null;
  publication_date: string | null;
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

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MUSICIAN";

export interface User {
  id: number;
  email: string;
  role: UserRole;
  is_active: number;
  last_login: string | null;
  created_at: string;
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === "SUPER_ADMIN";
}

export function isAdmin(role: UserRole): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
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
  image_consent: number;
  adhesion_2025_2026: number;
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

export type GalleryCategory =
  | "home_slideshow"
  | "harmonie_gallery"
  | "association_gallery"
  | "team"
  | "partners"
  | "thedansant_gallery"
  | "thedansant_flyers"
  | "thedansant_sponsors";

export interface GalleryImage {
  id: number;
  category: GalleryCategory;
  image_url: string;
  alt_text: string | null;
  link_url: string | null;
  link_name: string | null;
  sort_order: number;
  created_at: string;
}

// Category configuration for display and compression
export const GALLERY_CATEGORY_CONFIG: Record<
  GalleryCategory,
  {
    label: string;
    targetWidth: number;
    targetHeight: number;
    aspectRatio: number | null; // null = preserve original
  }
> = {
  home_slideshow: {
    label: "Accueil - Diaporama",
    targetWidth: 1600,
    targetHeight: 900,
    aspectRatio: 16 / 9,
  },
  harmonie_gallery: {
    label: "Harmonie - Galerie",
    targetWidth: 800,
    targetHeight: 534,
    aspectRatio: 3 / 2,
  },
  association_gallery: {
    label: "Association - Galerie",
    targetWidth: 800,
    targetHeight: 534,
    aspectRatio: 3 / 2,
  },
  team: { label: "Equipe", targetWidth: 500, targetHeight: 667, aspectRatio: 3 / 4 },
  partners: { label: "Partenaires", targetWidth: 400, targetHeight: 192, aspectRatio: null },
  thedansant_gallery: {
    label: "The Dansant - Galerie",
    targetWidth: 800,
    targetHeight: 534,
    aspectRatio: 3 / 2,
  },
  thedansant_flyers: {
    label: "The Dansant - Affiches",
    targetWidth: 800,
    targetHeight: 1200,
    aspectRatio: null,
  },
  thedansant_sponsors: {
    label: "The Dansant - Sponsors",
    targetWidth: 256,
    targetHeight: 128,
    aspectRatio: null,
  },
};

// Legacy aliases for backward compatibility during migration
export type AdminUser = User;
export type AdminSession = Session & { email?: string };

// Instruments de l'Harmonie (ordre alphabétique)
export const HARMONIE_INSTRUMENTS = [
  "Basse",
  "Batterie",
  "Clarinette",
  "Clarinette basse",
  "Contrebasse",
  "Cor",
  "Euphonium",
  "Flûte traversière",
  "Hautbois",
  "Percussions",
  "Saxophone alto",
  "Saxophone baryton",
  "Saxophone soprano",
  "Saxophone ténor",
  "Trombone",
  "Trompette",
  "Tuba",
] as const;

export type HarmonieInstrument = (typeof HARMONIE_INSTRUMENTS)[number];

export interface HarmonieInstrumentRecord {
  id: number;
  user_id: number;
  instrument_name: string;
  created_at: string;
}

export type IdeaCategory = "association" | "harmonie" | "website";

export interface Idea {
  id: number;
  user_id: number;
  title: string;
  description: string;
  category: IdeaCategory;
  is_public: number;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IdeaLike {
  id: number;
  idea_id: number;
  user_id: number;
  created_at: string;
}

export interface IdeaWithLikes extends Idea {
  likes_count: number;
  user_has_liked: boolean;
  author_first_name?: string;
  author_last_name?: string;
}

export interface InsuranceInstrument {
  id: number;
  user_id: number;
  instrument_name: string;
  brand: string;
  model: string;
  serial_number: string;
  created_at: string;
  updated_at: string;
}

export interface OutingSettings {
  id: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  location: string | null;
  price: string | null;
  button_text: string;
  button_link: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CardOrderSettings {
  id: number;
  card_order: string;
  created_at: string;
  updated_at: string;
}

export type MusicianCardType =
  | "profile"
  | "adhesion"
  | "assurance"
  | "planning"
  | "partitions"
  | "boite-a-idee"
  | "outing"
  | "social"
  | "birthdays";

export const MUSICIAN_CARD_LABELS: Record<MusicianCardType, string> = {
  profile: "Mon Profil",
  adhesion: "Adhésion",
  assurance: "Assurance",
  planning: "Planning",
  partitions: "Partitions",
  "boite-a-idee": "Boîte à idée",
  outing: "Inscription Sortie",
  social: "Suivez-nous (Réseaux sociaux)",
  birthdays: "Anniversaires",
};
