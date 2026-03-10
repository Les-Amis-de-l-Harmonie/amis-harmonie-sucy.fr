-- Migration: add_performance_indexes
-- Created: 2026-03-10

-- Index for user instrument lookups (used when loading user profiles)
CREATE INDEX IF NOT EXISTS idx_musician_instruments_user_id ON musician_instruments(user_id);

-- Composite index for ordered instrument lists (used when displaying instruments in order)
CREATE INDEX IF NOT EXISTS idx_musician_instruments_user_sort ON musician_instruments(user_id, sort_order);
