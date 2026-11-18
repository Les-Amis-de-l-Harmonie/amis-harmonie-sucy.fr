/**
 * Les idées sont personnelles : un responsable qui agit pour un enfant peut les
 * lire, mais le serveur refuse (403) toute création, modification, suppression
 * ou « j'aime » faits en son nom. L'interface le dit avant de laisser essayer.
 */
export function delegatedIdeasMessage(firstName?: string | null): string {
  const who = firstName?.trim() ? firstName.trim() : "ce musicien";
  return `Les idées sont personnelles : vous pouvez les lire, mais pas en proposer, les modifier, les supprimer ni les aimer à la place de ${who}.`;
}

/** Version courte, pour une infobulle ou un bouton désactivé. */
export const DELEGATED_IDEAS_HINT = "Indisponible : les idées sont personnelles.";
