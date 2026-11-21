-- Informations pratiques d'un événement destinées aux musiciens (jamais affichées sur le site
-- public). Migration uniquement additive (AGENTS.md, piège 8).
--
-- dress_code     : tenue attendue (texte libre ; l'admin se voit proposer les tenues déjà utilisées).
-- call_time      : heure de rendez-vous des musiciens, au même format libre que events.time (ex. 10H30).
-- musician_notes : consignes pour les musiciens (morceaux à apporter, stationnement, repas…).

ALTER TABLE events ADD COLUMN dress_code TEXT;
ALTER TABLE events ADD COLUMN call_time TEXT;
ALTER TABLE events ADD COLUMN musician_notes TEXT;
