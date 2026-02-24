-- Migration: Add info_settings table for information card configuration
CREATE TABLE IF NOT EXISTS info_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  title TEXT NOT NULL DEFAULT 'Information',
  subtitle TEXT,
  content TEXT,
  bg_color TEXT DEFAULT 'bg-blue-50',
  text_color TEXT DEFAULT 'text-blue-900',
  border_color TEXT DEFAULT 'border-blue-200',
  icon TEXT DEFAULT 'Info',
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default row
INSERT OR IGNORE INTO info_settings (id, title, subtitle, content, is_active)
VALUES (1, 'Information', NULL, NULL, 0);
