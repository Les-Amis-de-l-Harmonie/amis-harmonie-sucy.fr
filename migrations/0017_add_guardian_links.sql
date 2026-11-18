-- Comptes parents / responsables légaux (Phase 1).
-- Migration uniquement additive : ne jamais reconstruire `users` (AGENTS.md, piège 8).
--
-- guardian_links : un responsable légal (n'importe quel compte musicien ou responsable) relié à un
--   musicien. Créés par les admins uniquement.
-- users.kind : 'member' (défaut, comportement actuel), 'guardian' (responsable qui ne joue pas :
--   se connecte mais n'apparaît dans aucune liste de musiciens), 'managed' (musicien sans connexion,
--   géré par ses responsables ; adresse réservée sans-email+…@interne.amis-harmonie-sucy.fr).
--   Pas de CHECK : les valeurs sont validées en TypeScript, pour ne jamais avoir à reconstruire la table.
-- sessions.acting_user_id : musicien pour lequel le responsable agit ; revalidé à chaque requête.
-- event_presences.updated_by : compte qui a réellement donné la réponse (musicien, parent ou admin).

CREATE TABLE IF NOT EXISTS guardian_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guardian_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  child_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relation TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (guardian_user_id <> child_user_id),
  UNIQUE (guardian_user_id, child_user_id)
);

CREATE INDEX IF NOT EXISTS idx_guardian_links_child ON guardian_links(child_user_id);

ALTER TABLE users ADD COLUMN kind TEXT NOT NULL DEFAULT 'member';
ALTER TABLE sessions ADD COLUMN acting_user_id INTEGER;
ALTER TABLE event_presences ADD COLUMN updated_by INTEGER;
