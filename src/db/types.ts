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

export interface AdminUser {
  id: number;
  email: string;
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

export interface AdminSession {
  id: number;
  session_id: string;
  email: string;
  expires_at: string;
  created_at: string;
}
