-- Unifie les événements publics et les prestations internes dans une source unique.
-- `is_public` vaut 1 par défaut : tous les événements existants restent publics,
-- le comportement du site public est donc inchangé dès l'application.
-- `presence_required` vaut 0 par défaut : aucun événement n'exige de réponse rétroactivement.
-- Les tables planning_events / planning_availability sont laissées en place :
-- leur suppression fera l'objet d'une migration ultérieure séparée.

ALTER TABLE events ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1;
ALTER TABLE events ADD COLUMN presence_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN address TEXT;
ALTER TABLE events ADD COLUMN response_deadline TEXT
  CHECK (response_deadline IS NULL
         OR response_deadline GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]');

CREATE TABLE IF NOT EXISTS event_presences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('present', 'absent')),
  comment TEXT,
  status_changed_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_presences_user ON event_presences(user_id);
