/**
 * Fragment SQL partagé pour lire le droit à l'image effectif d'un profil `p`.
 * Un refus d'un responsable encore relié l'emporte ; sinon un oui suffit ; sans
 * réponse courante, on conserve la valeur historique du profil.
 */
export const EFFECTIVE_IMAGE_CONSENT_SQL = `CASE
  WHEN EXISTS (
    SELECT 1
    FROM guardian_links consent_link
    JOIN guardian_image_consents consent_answer
      ON consent_answer.child_user_id = consent_link.child_user_id
     AND consent_answer.guardian_user_id = consent_link.guardian_user_id
    WHERE consent_link.child_user_id = p.user_id
      AND consent_answer.consent = 0
  ) THEN 0
  WHEN EXISTS (
    SELECT 1
    FROM guardian_links consent_link
    JOIN guardian_image_consents consent_answer
      ON consent_answer.child_user_id = consent_link.child_user_id
     AND consent_answer.guardian_user_id = consent_link.guardian_user_id
    WHERE consent_link.child_user_id = p.user_id
      AND consent_answer.consent = 1
  ) THEN 1
  ELSE p.image_consent
END`;

/** Indique si des responsables sont reliés à l'utilisateur `u`. */
export const IMAGE_CONSENT_MANAGED_SQL = `EXISTS (
  SELECT 1 FROM guardian_links image_consent_link WHERE image_consent_link.child_user_id = u.id
)`;

export type ImageConsentValue = 0 | 1 | null;
