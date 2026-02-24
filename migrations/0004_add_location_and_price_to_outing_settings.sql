-- Migration: Add location and price fields to outing_settings table
ALTER TABLE outing_settings ADD COLUMN location TEXT;
ALTER TABLE outing_settings ADD COLUMN price TEXT;
