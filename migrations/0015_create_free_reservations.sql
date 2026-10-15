-- Migration number: 0015 	 2026-10-15T19:41:25.081Z
CREATE TABLE IF NOT EXISTS free_reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_slug TEXT NOT NULL,
  last_name TEXT,
  first_name TEXT,
  email TEXT,
  email_normalized TEXT,
  party_size INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 50),
  interests TEXT NOT NULL DEFAULT '[]',
  source TEXT,
  newsletter_opt_in INTEGER NOT NULL DEFAULT 0,
  newsletter_consent_at TEXT,
  consent_text_version TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  origin TEXT NOT NULL DEFAULT 'web' CHECK (origin IN ('web', 'admin')),
  confirmation_sent_at TEXT,
  confirmation_error TEXT,
  unsubscribed_at TEXT,
  anonymized_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_free_reservations_event_email
  ON free_reservations(event_slug, email_normalized)
  WHERE email_normalized IS NOT NULL AND anonymized_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_free_reservations_event_status
  ON free_reservations(event_slug, status);
