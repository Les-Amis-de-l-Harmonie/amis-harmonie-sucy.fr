-- Migration number: 0008 	 2026-02-27T09:07:48.885Z

-- Add idea reads tracking table
CREATE TABLE IF NOT EXISTS idea_reads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  idea_id INTEGER NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(idea_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_idea_reads_user_id ON idea_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_reads_idea_id ON idea_reads(idea_id);
