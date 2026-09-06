import { Lock } from "lucide-react";

export type LockedCardReason = "profile" | "membership";

const REASON_MESSAGE: Record<LockedCardReason, string> = {
  profile: "Complétez votre profil pour débloquer cette fonctionnalité.",
  membership: "Réservé aux adhérents 2026-2027.",
};

interface LockedCardOverlayProps {
  reason: LockedCardReason;
}

/**
 * Remplace le grisage muet `opacity-50 pointer-events-none grayscale`
 * dispersé dans l'ancien `MusicianHome.tsx`, appliqué pour deux raisons
 * différentes (profil incomplet OU non-adhérent) sans jamais dire laquelle.
 * Un seul composant, un motif explicite affiché — voir la direction design,
 * défaut A5.
 *
 * Priorité entre les deux motifs quand les deux s'appliquent (assurance,
 * sortie) : "profile" l'emporte toujours sur "membership", exactement comme
 * dans la zone essentiels (le profil incomplet est la condition bloquante de
 * base, l'adhésion vient après) — même hiérarchie dans les deux zones.
 *
 * À poser sur une carte en `relative`, à côté de son contenu (rendu en
 * retrait via `opacity-30 grayscale pointer-events-none` par l'appelant),
 * jamais à sa place : la carte reste visible en filigrane, seul le motif de
 * verrouillage est neuf.
 */
export function LockedCardOverlay({ reason }: LockedCardOverlayProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-card/85 p-4 text-center backdrop-blur-[1px]">
      <Lock className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <p className="max-w-[220px] text-sm font-medium text-muted-foreground">
        {REASON_MESSAGE[reason]}
      </p>
    </div>
  );
}
