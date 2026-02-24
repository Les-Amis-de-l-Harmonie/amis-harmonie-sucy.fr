-- Migration: Add card_order_settings table for musician home card ordering
CREATE TABLE IF NOT EXISTS card_order_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  card_order TEXT NOT NULL DEFAULT '["profile","adhesion","assurance","planning","partitions","boite-a-idee","outing","social"]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default row with standard order
INSERT OR IGNORE INTO card_order_settings (id, card_order)
VALUES (1, '["profile","adhesion","assurance","planning","partitions","boite-a-idee","outing","social"]');
