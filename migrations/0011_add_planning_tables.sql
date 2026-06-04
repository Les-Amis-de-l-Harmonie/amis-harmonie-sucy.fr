-- Migration: Add planning events and availability tables
-- Replaces the external Google Sheets presence calendar with in-app management

CREATE TABLE IF NOT EXISTS planning_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT,
  location TEXT,
  address TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS planning_availability (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  planning_event_id INTEGER NOT NULL REFERENCES planning_events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('oui', 'non', 'peut-etre')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(planning_event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_planning_events_date ON planning_events(date);
CREATE INDEX IF NOT EXISTS idx_planning_availability_event ON planning_availability(planning_event_id);
CREATE INDEX IF NOT EXISTS idx_planning_availability_user ON planning_availability(user_id);
