-- ============================================================================
-- ATTENTION : DÉVELOPPEMENT LOCAL UNIQUEMENT — NE JAMAIS APPLIQUER AVEC --REMOTE
-- ============================================================================

INSERT OR IGNORE INTO events
  (id, title, image, location, description, date, time, price, details_link,
   reservation_link, is_public, presence_required, address, response_deadline)
VALUES
  (1, 'Concert de printemps', NULL, 'Salle des fêtes de Sucy-en-Brie',
   'Concert de printemps de l''Harmonie de Sucy.', '2026-02-14', '20:30', 'Entrée libre',
   NULL, NULL, 1, 0, '2 avenue Georges Pompidou, 94370 Sucy-en-Brie', NULL),
  (2, 'Cérémonie commémorative', NULL, 'Monument aux morts de Sucy-en-Brie',
   'Participation de l''Harmonie à la cérémonie commémorative.', '2026-04-18', '11:00', NULL,
   NULL, NULL, 1, 0, 'Place de l''Église, 94370 Sucy-en-Brie', NULL),
  (3, 'Fête de la musique 2026', NULL, 'Parc Montaleau',
   'L''Harmonie joue pour la Fête de la musique.', '2026-06-21', '18:00', 'Entrée libre',
   NULL, NULL, 1, 0, '2 avenue Georges Pompidou, 94370 Sucy-en-Brie', NULL),
  -- Fixture d'orthogonalité : ce concert est public ET nécessite une réponse de présence.
  (4, 'Concert de rentrée', NULL, 'Espace Jean-Marie Poirier',
   'Grand concert de rentrée de l''Harmonie.', '2026-09-06', '16:00', '12 €',
   '/evenements/concert-de-rentree', 'https://www.helloasso.com/associations/amis-de-l-harmonie-de-sucy',
   1, 1, '1 esplanade du 18 Juin 1940, 94370 Sucy-en-Brie', '2026-09-01'),
  (5, 'Concert des Lumières', NULL, 'Église Saint-Martin',
   'Un programme musical pour accompagner l''automne.', '2026-10-17', '20:30', 'Entrée libre',
   NULL, NULL, 1, 0, 'Place de l''Église, 94370 Sucy-en-Brie', NULL),
  (6, 'Concert de Noël', NULL, 'Salle des fêtes de Sucy-en-Brie',
   'L''Harmonie célèbre les fêtes de fin d''année en musique.', '2026-12-05', '20:00', '10 €',
   NULL, NULL, 1, 0, '2 avenue Georges Pompidou, 94370 Sucy-en-Brie', NULL),
  (7, 'Prestation municipale d''été', NULL, 'Parc Montaleau',
   'Prestation interne de l''Harmonie pour la ville.', '2026-08-15', '14:00', NULL,
   NULL, NULL, 0, 1, '2 avenue Georges Pompidou, 94370 Sucy-en-Brie', '2026-08-01'),
  (8, 'Cérémonie du 11 novembre', NULL, 'Monument aux morts de Sucy-en-Brie',
   'Prestation interne pour la cérémonie du 11 novembre.', '2026-11-11', '10:30', NULL,
   NULL, NULL, 0, 1, 'Place de l''Église, 94370 Sucy-en-Brie', '2026-09-05'),
  -- Cas de décision réaliste : la prestation est À VENIR mais la date limite de
  -- réponse est DÉPASSÉE. C'est exactement la situation où l'association doit
  -- trancher, pupitre par pupitre, s'il faut payer des renforts professionnels.
  (9, 'Prestation Forum des associations', NULL, 'Gymnase du Fort',
   'Prestation interne pour le forum des associations.', '2026-09-19', '15:00', NULL,
   NULL, NULL, 0, 1, 'Rue du Fort, 94370 Sucy-en-Brie', '2026-08-20'),
  (10, 'Répétition générale de décembre', NULL, 'Salle des fêtes de Sucy-en-Brie',
   'Répétition interne sans date limite de réponse.', '2026-12-12', '14:00', NULL,
   NULL, NULL, 0, 1, '2 avenue Georges Pompidou, 94370 Sucy-en-Brie', NULL);

-- INSERT OR IGNORE ne modifie pas un événement déjà présent : cette mise à jour
-- rend la fixture d'orthogonalité réapplicable sur une base locale existante.
UPDATE events
SET is_public = 1, presence_required = 1, response_deadline = '2026-09-01'
WHERE id = 4;

-- Événement 8 : date limite proche (le 2026-09-05), mais prestation encore lointaine
-- (le 2026-11-11), pour exercer le signalement d'urgence lié à l'échéance.
UPDATE events
SET response_deadline = '2026-09-05'
WHERE id = 8;

INSERT OR IGNORE INTO users (id, email, role, is_active, created_at)
VALUES
  (1, 'marie.dubois@exemple.invalid', 'ADMIN', 1, '2026-08-01 09:00:00'),
  (2, 'lucas.martin@exemple.invalid', 'MUSICIAN', 1, '2026-08-01 09:01:00'),
  (3, 'camille.bernard@exemple.invalid', 'MUSICIAN', 1, '2026-08-01 09:02:00'),
  (4, 'thomas.robert@exemple.invalid', 'MUSICIAN', 1, '2026-08-01 09:03:00'),
  (5, 'sophie.richard@exemple.invalid', 'MUSICIAN', 1, '2026-08-01 09:04:00'),
  (6, 'antoine.petit@exemple.invalid', 'MUSICIAN', 1, '2026-08-01 09:05:00'),
  (7, 'julie.durand@exemple.invalid', 'MUSICIAN', 1, '2026-08-01 09:06:00'),
  (8, 'hugo.leroy@exemple.invalid', 'MUSICIAN', 1, '2026-08-01 09:07:00'),
  (9, 'claire.moreau@exemple.invalid', 'MUSICIAN', 1, '2026-08-01 09:08:00'),
  (10, 'paul.simon@exemple.invalid', 'MUSICIAN', 0, '2026-08-01 09:09:00');

INSERT OR IGNORE INTO musician_profiles
  (id, user_id, first_name, last_name, city, adhesion_2026_2027, image_consent,
   created_at, updated_at)
VALUES
  (1, 1, 'Marie', 'Dubois', 'Sucy-en-Brie', 1, 1, '2026-08-01 10:00:00', '2026-08-01 10:00:00'),
  (2, 2, 'Lucas', 'Martin', 'Sucy-en-Brie', 1, 1, '2026-08-01 10:01:00', '2026-08-01 10:01:00'),
  (3, 3, 'Camille', 'Bernard', 'Sucy-en-Brie', 1, 1, '2026-08-01 10:02:00', '2026-08-01 10:02:00'),
  (4, 4, 'Thomas', 'Robert', 'Sucy-en-Brie', 1, 1, '2026-08-01 10:03:00', '2026-08-01 10:03:00'),
  (5, 5, 'Sophie', 'Richard', 'Sucy-en-Brie', 1, 1, '2026-08-01 10:04:00', '2026-08-01 10:04:00'),
  (6, 6, 'Antoine', 'Petit', 'Sucy-en-Brie', 1, 1, '2026-08-01 10:05:00', '2026-08-01 10:05:00'),
  (7, 7, 'Julie', 'Durand', 'Sucy-en-Brie', 1, 1, '2026-08-01 10:06:00', '2026-08-01 10:06:00'),
  (8, 8, 'Hugo', 'Leroy', 'Sucy-en-Brie', 1, 1, '2026-08-01 10:07:00', '2026-08-01 10:07:00'),
  (9, 9, 'Claire', 'Moreau', 'Sucy-en-Brie', 0, 1, '2026-08-01 10:08:00', '2026-08-01 10:08:00'),
  (10, 10, 'Paul', 'Simon', 'Sucy-en-Brie', 1, 1, '2026-08-01 10:09:00', '2026-08-01 10:09:00');

INSERT OR IGNORE INTO harmonie_instruments (id, user_id, instrument_name, is_primary, created_at)
VALUES
  (1, 1, 'Chef d''orchestre', 1, '2026-08-01 11:00:00'),
  (2, 2, 'Clarinette', 1, '2026-08-01 11:01:00'),
  (3, 3, 'Flûte traversière', 1, '2026-08-01 11:02:00'),
  (4, 4, 'Saxophone alto', 1, '2026-08-01 11:03:00'),
  (5, 5, 'Trompette', 1, '2026-08-01 11:04:00'),
  (6, 6, 'Trombone', 0, '2026-08-01 11:05:00'),
  (7, 7, 'Cor', 0, '2026-08-01 11:06:00'),
  (8, 7, 'Euphonium', 1, '2026-08-01 11:07:00'),
  (9, 9, 'Batterie', 1, '2026-08-01 11:08:00'),
  (10, 10, 'Tuba', 1, '2026-08-01 11:09:00'),
  (11, 6, 'Chef adjoint', 1, '2026-08-01 11:10:00');

INSERT OR IGNORE INTO event_presences
  (id, event_id, user_id, status, comment, status_changed_at, created_at, updated_at)
VALUES
  (1, 7, 1, 'present', 'Je serai présent avec plaisir.', '2026-07-25 18:00:00', '2026-07-25 18:00:00', '2026-07-25 18:00:00'),
  (2, 7, 2, 'absent', 'Je suis en déplacement à cette date.', '2026-07-26 09:15:00', '2026-07-26 09:15:00', '2026-07-26 09:15:00'),
  (3, 7, 3, 'present', NULL, '2026-07-27 12:30:00', '2026-07-27 12:30:00', '2026-07-27 12:30:00'),
  (4, 7, 4, 'absent', NULL, '2026-08-02 10:00:00', '2026-07-28 08:00:00', '2026-08-02 10:00:00'),
  (5, 7, 5, 'present', 'Je peux aussi aider au rangement.', '2026-07-29 17:45:00', '2026-07-29 17:45:00', '2026-07-29 17:45:00'),
  -- Événement 9 (à venir, date limite dépassée le 2026-08-20).
  -- Effectif de référence = 9 membres : tous les utilisateurs musiciens ACTIFS
  -- (users 2 à 9), plus le chef d'orchestre (user 1) qui est ADMIN mais joue.
  -- L'adhésion n'entre PAS dans le décompte : Claire Moreau (9) n'est pas à jour de
  -- sa cotisation et compte quand même. Seul Paul Simon (10), désactivé, est exclu.
  -- 6 réponses sur 9 => taux de réponse 66,7 %.
  -- Non-répondants : Thomas Robert (sax alto), Hugo Leroy (sans pupitre renseigné),
  -- Claire Moreau (batterie).
  -- La réponse d'Antoine Petit, le 2026-08-20 à 16 h, est exactement à la limite et
  -- ne doit pas être signalée comme tardive.
  (6, 9, 1, 'present', NULL, '2026-08-05 09:00:00', '2026-08-05 09:00:00', '2026-08-05 09:00:00'),
  (7, 9, 2, 'present', 'Je viendrai directement depuis le travail.', '2026-08-06 19:20:00', '2026-08-06 19:20:00', '2026-08-06 19:20:00'),
  (8, 9, 3, 'absent', 'Je suis en congés cette semaine-là.', '2026-08-07 08:40:00', '2026-08-07 08:40:00', '2026-08-07 08:40:00'),
  -- Julie Durand joue deux instruments : elle doit compter une seule fois dans le
  -- taux global, mais apparaître dans les pupitres Cor ET Euphonium.
  (9, 9, 7, 'present', NULL, '2026-08-10 21:05:00', '2026-08-10 21:05:00', '2026-08-10 21:05:00'),
  (11, 9, 6, 'present', NULL, '2026-08-20 16:00:00', '2026-08-20 16:00:00', '2026-08-20 16:00:00'),
  -- Sophie Richard a changé d'avis APRÈS la date limite : ce basculement invalide
  -- une décision d'embauche déjà prise et doit être signalé à l'administration.
  (10, 9, 5, 'absent', 'Finalement empêchée, désolée.', '2026-08-24 11:30:00', '2026-08-08 10:00:00', '2026-08-24 11:30:00');

INSERT OR IGNORE INTO event_presences
  (id, event_id, user_id, status, comment, status_changed_at, created_at, updated_at)
VALUES
  (12, 4, 2, 'present', 'Je serai présent au concert.', '2026-08-20 09:00:00', '2026-08-20 09:00:00', '2026-08-20 09:00:00'),
  (13, 4, 3, 'absent', 'Je suis déjà engagé ce jour-là.', '2026-08-22 18:30:00', '2026-08-22 18:30:00', '2026-08-22 18:30:00'),
  (14, 4, 7, 'present', NULL, '2026-08-25 12:00:00', '2026-08-25 12:00:00', '2026-08-25 12:00:00');

INSERT OR IGNORE INTO sessions (session_id, user_id, expires_at)
VALUES
  ('dev-musician-session', 2, '2030-01-01 00:00:00'),
  ('dev-admin-session', 1, '2030-01-01 00:00:00');
