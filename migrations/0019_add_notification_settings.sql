-- Comptes parents, Phase 2 lot F : rappels de présence par e-mail, DÉSACTIVÉS par défaut.
-- Migration uniquement additive (AGENTS.md, piège 8).
--
-- notification_settings : réglage unique (id = 1). presence_reminders_mode vaut 'off' (défaut),
--   'test' (un seul e-mail récapitulatif vers test_recipient, aucun envoi aux musiciens) ou 'on'.
--   Pas de CHECK : toute valeur inconnue est lue comme 'off' côté serveur, comme une ligne absente.
--   last_run_at / last_run_summary : écrits à chaque exécution de la tâche programmée, même en 'off'.
-- notification_log : journal et anti-doublon. dedupe_key unique, construite par le code
--   (presence:{eventId}:{stage}:{recipientUserId}) et réservée AVANT l'envoi. Sans clé étrangère :
--   le journal survit à la suppression d'un compte ou d'un événement.

CREATE TABLE IF NOT EXISTS notification_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  presence_reminders_mode TEXT NOT NULL DEFAULT 'off',
  test_recipient TEXT,
  last_run_at TEXT,
  last_run_summary TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by INTEGER
);

INSERT OR IGNORE INTO notification_settings (id) VALUES (1);

CREATE TABLE IF NOT EXISTS notification_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dedupe_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  event_id INTEGER,
  stage INTEGER,
  recipient_user_id INTEGER,
  recipient_email TEXT NOT NULL,
  subject_user_ids TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_log_created ON notification_log(created_at);
