-- Events table
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  image TEXT,
  location TEXT,
  description TEXT,
  date TEXT NOT NULL,
  time TEXT,
  price TEXT,
  is_past INTEGER DEFAULT 0,
  details_link TEXT,
  reservation_link TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Videos table (YouTube)
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  youtube_id TEXT NOT NULL,
  thumbnail TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Publications table (Instagram)
CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instagram_post_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Guestbook entries
CREATE TABLE IF NOT EXISTS guestbook (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  message TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Users table (admins and musicians)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'MUSICIAN' CHECK(role IN ('ADMIN', 'MUSICIAN')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Musician profiles (linked to users with role=MUSICIAN)
CREATE TABLE IF NOT EXISTS musician_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  avatar TEXT,
  date_of_birth TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  postal_code TEXT,
  city TEXT,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Legacy alias for backward compatibility
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Auth tokens for magic links
CREATE TABLE IF NOT EXISTS auth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Admin sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample events
INSERT INTO events (title, image, location, description, date, time, price, is_past, details_link, reservation_link) VALUES
('Concert de Printemps', '/images/events/concert-printemps.jpg', 'Salle des Fêtes de Sucy', 'Concert annuel de printemps de l''Harmonie de Sucy', '2026-03-21', '20h30', 'Gratuit', 0, NULL, NULL),
('Thé Dansant', '/images/events/the-dansant.jpg', 'Salle des Fêtes de Sucy', 'Venez danser sur les airs de notre orchestre', '2026-02-15', '15h00', '12€', 0, '/the-dansant', 'https://www.helloasso.com'),
('Fête de la Musique', '/images/events/fete-musique.jpg', 'Place de la Mairie', 'Participation à la Fête de la Musique', '2025-06-21', '18h00', 'Gratuit', 1, NULL, NULL);

-- Insert sample videos
INSERT INTO videos (title, youtube_id) VALUES
('Concert de Noël 2024', 'dQw4w9WgXcQ'),
('Thé Dansant Octobre 2024', 'dQw4w9WgXcQ'),
('Fête de la Musique 2024', 'dQw4w9WgXcQ');

-- Insert sample guestbook entries
INSERT INTO guestbook (first_name, last_name, message, date) VALUES
('Marie', 'Dupont', 'Magnifique concert ! Bravo à tous les musiciens.', '2024-12-15'),
('Jean', 'Martin', 'Toujours un plaisir de vous écouter. À bientôt !', '2024-11-20'),
('Sophie', 'Bernard', 'Quelle ambiance au thé dansant ! Merci pour ce moment.', '2024-10-10');
