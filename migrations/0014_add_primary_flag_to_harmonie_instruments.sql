-- Migration number: 0014 	 2026-08-27T17:14:40.448Z
-- Ajoute l'instrument principal déclaré pour chaque musicien.
-- harmonie_instruments ne possède pas de sort_order : le premier déclaré
-- lors du rattrapage est donc la ligne dont l'id est le plus bas.

ALTER TABLE harmonie_instruments ADD COLUMN is_primary INTEGER NOT NULL DEFAULT 0;

UPDATE harmonie_instruments
SET is_primary = 1
WHERE id IN (SELECT MIN(id) FROM harmonie_instruments GROUP BY user_id);
