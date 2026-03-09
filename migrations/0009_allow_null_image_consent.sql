-- Migration number: 0009 	 2026-03-09T14:10:07.026Z
-- Allow NULL values for image_consent to distinguish "not set" from "refused"

ALTER TABLE musician_profiles DROP COLUMN image_consent;
ALTER TABLE musician_profiles ADD COLUMN image_consent INTEGER;
