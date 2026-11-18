-- Comptes parents, Phase 2 lot E : droit à l'image donné par chaque responsable et autorisations
-- de sortie par événement. Migration uniquement additive (AGENTS.md, piège 8).
--
-- guardian_image_consents : réponse de chaque responsable relié sur le droit à l'image d'un enfant.
--   Valeur effective calculée à la lecture (décision du 18/11/2026) : un non d'un responsable
--   encore relié l'emporte, sinon un oui suffit, sinon on garde musician_profiles.image_consent.
--   recorded_by : admin qui a saisi une réponse papier au nom du responsable (NULL si en ligne).
-- events.parental_authorization_required / authorization_details : l'événement demande une
--   autorisation parentale (transport, horaires…) aux musiciens reliés à un responsable.
-- event_authorizations : une autorisation par enfant et par événement, donnée par un responsable
--   relié (ou saisie par un admin) ; details_snapshot = texte des détails au moment de l'accord.

CREATE TABLE IF NOT EXISTS guardian_image_consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  child_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guardian_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent INTEGER NOT NULL CHECK (consent IN (0, 1)),
  recorded_by INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (child_user_id, guardian_user_id)
);

ALTER TABLE events ADD COLUMN parental_authorization_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN authorization_details TEXT;

CREATE TABLE IF NOT EXISTS event_authorizations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  child_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  guardian_user_id INTEGER,
  recorded_by INTEGER,
  details_snapshot TEXT,
  authorized_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (event_id, child_user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_authorizations_child ON event_authorizations(child_user_id);
