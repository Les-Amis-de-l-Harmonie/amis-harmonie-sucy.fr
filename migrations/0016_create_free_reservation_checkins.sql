-- Migration number: 0016 	 2026-11-12T00:00:00.000Z
CREATE TABLE IF NOT EXISTS free_reservation_checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_slug TEXT NOT NULL,
  reservation_id INTEGER REFERENCES free_reservations(id),
  delta INTEGER NOT NULL CHECK (delta <> 0 AND delta BETWEEN -99 AND 99),
  op_id TEXT NOT NULL,
  operator TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_free_reservation_checkins_op_id
  ON free_reservation_checkins(op_id);

CREATE INDEX IF NOT EXISTS idx_free_reservation_checkins_event_reservation
  ON free_reservation_checkins(event_slug, reservation_id);
