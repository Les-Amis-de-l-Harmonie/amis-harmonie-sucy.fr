import type { PresenceStatus } from "@/db/types";
import { cn } from "@/lib/utils";
import { getCellVisual } from "./presence-matrix-helpers";

export type StatusDotSize = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<StatusDotSize, { box: string; icon: string }> = {
  xs: { box: "h-3.5 w-3.5", icon: "h-2 w-2" },
  sm: { box: "h-[18px] w-[18px]", icon: "h-2.5 w-2.5" },
  md: { box: "h-[22px] w-[22px]", icon: "h-3 w-3" },
  lg: { box: "h-[26px] w-[26px]", icon: "h-3.5 w-3.5" },
};

interface StatusDotProps {
  status: PresenceStatus | null;
  size?: StatusDotSize;
  /** Ajoute le libellé (« Présent ») pour les lecteurs d'écran. */
  labelled?: boolean;
  className?: string;
}

/**
 * Pastille d'état d'une réponse. La forme ET l'icône changent d'un état à l'autre
 * (cercle + coche, carré + croix, cercle pointillé + tiret) : la couleur ne porte
 * jamais seule l'information.
 */
export function StatusDot({ status, size = "md", labelled = false, className }: StatusDotProps) {
  const visual = getCellVisual(status);
  const classes = SIZE_CLASSES[size];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        classes.box,
        visual.shapeClass,
        className
      )}
    >
      <visual.Icon className={classes.icon} strokeWidth={3} aria-hidden="true" />
      {labelled && <span className="sr-only">{visual.label}</span>}
    </span>
  );
}
