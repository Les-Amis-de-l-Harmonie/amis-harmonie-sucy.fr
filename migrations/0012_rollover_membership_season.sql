ALTER TABLE musician_profiles
  RENAME COLUMN adhesion_2025_2026 TO adhesion_2026_2027;

UPDATE musician_profiles
SET adhesion_2026_2027 = 0;
