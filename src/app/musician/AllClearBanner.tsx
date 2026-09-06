import { CheckCircle2 } from "lucide-react";

interface AllClearBannerProps {
  firstName: string;
}

/**
 * Affiché uniquement quand aucun des quatre modules prioritaires de la zone
 * essentiels n'a de raison de s'afficher (voir `EssentialsZone`). Toujours
 * une ligne, jamais un vide brutal entre la salutation et la grille
 * secondaire.
 */
export function AllClearBanner({ firstName }: AllClearBannerProps) {
  const name = firstName || "Musicien";
  return (
    <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3.5 text-sm font-medium text-success">
      <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
      Tout est en ordre, {name}. Aucune action ne vous attend pour le moment.
    </div>
  );
}
