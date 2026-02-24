-- Migration: Add outing_settings table for outing registration configuration
CREATE TABLE IF NOT EXISTS outing_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title TEXT NOT NULL DEFAULT 'Inscription Sortie',
  subtitle TEXT,
  description TEXT,
  button_text TEXT NOT NULL DEFAULT 'S''inscrire',
  button_link TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default row
INSERT OR IGNORE INTO outing_settings (id, title, subtitle, description, button_text, button_link, is_active)
VALUES (1, 'Inscription Sortie', NULL, NULL, 'S''inscrire', NULL, 0);
