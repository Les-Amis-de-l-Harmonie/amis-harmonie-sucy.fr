-- Migration number: 0002 	 2026-02-22T21:29:44.620Z
-- Add SUPER_ADMIN role support

-- SQLite doesn't support ALTER TABLE to modify CHECK constraints
-- We need to recreate the table with the new constraint

-- Step 1: Create a new table with updated constraint
CREATE TABLE users_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'ADMIN', 'MUSICIAN')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Copy data from old table
INSERT INTO users_new (id, email, role, is_active, created_at)
SELECT id, email, role, is_active, created_at FROM users;

-- Step 3: Drop old table
DROP TABLE users;

-- Step 4: Rename new table
ALTER TABLE users_new RENAME TO users;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
