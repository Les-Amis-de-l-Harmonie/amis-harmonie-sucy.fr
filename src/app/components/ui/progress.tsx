import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Valeur actuelle, entre 0 et `max`. */
  value: number;
  /** Valeur représentant 100 % (par défaut 100). */
  max?: number;
}

/**
 * Barre de progression linéaire simple, sans dépendance Radix.
 * Utilisée par le sommaire de complétion du profil musicien (Phase 3).
 *
 * `role="progressbar"` n'a pas de nom accessible par défaut : le consommateur
 * DOIT lui passer `aria-label` (ou `aria-labelledby`) décrivant ce qui
 * progresse, ex. `aria-label="Progression du profil, 4 sections sur 7"`.
 */
const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, ...props }, ref) => {
    const safeMax = max > 0 ? max : 100;
    const clamped = Math.min(Math.max(value, 0), safeMax);
    const percent = (clamped / safeMax) * 100;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
        {...props}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };
