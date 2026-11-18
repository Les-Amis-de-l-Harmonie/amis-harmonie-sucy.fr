import { Lock } from "lucide-react";

/** Valeur effective du droit à l'image d'un musicien (« non » l'emporte, sinon un « oui » suffit). */
export function ImageConsentBadge({ value }: { value: number | null | undefined }) {
  const tone =
    value === 1
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : value === 0
        ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}
    >
      {value === 1 ? "Autorisé" : value === 0 ? "Non autorisé" : "Non renseigné"}
    </span>
  );
}

/**
 * Remplace le choix « droit à l'image » d'un musicien relié à un responsable :
 * la valeur vient des réponses de ses responsables, elle ne se modifie pas ici.
 */
export function ManagedImageConsentNote({ value }: { value: number | null | undefined }) {
  return (
    <div
      className="rounded-lg border border-dashed border-border bg-muted/30 p-3 space-y-2"
      data-testid="image-consent-managed"
    >
      <p className="flex flex-wrap items-center gap-2 text-sm">
        <Lock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span>Valeur appliquée :</span>
        <ImageConsentBadge value={value} />
      </p>
      <p className="text-xs text-muted-foreground">
        Ce musicien est relié à un responsable : c'est lui qui répond. Un refus d'un responsable
        l'emporte ; sinon, un seul accord suffit. Pour saisir une réponse reçue sur papier, ouvrez
        le bloc « Responsables légaux » de cette fiche (super-administrateur).
      </p>
    </div>
  );
}
