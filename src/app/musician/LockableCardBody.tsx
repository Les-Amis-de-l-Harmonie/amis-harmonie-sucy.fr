import type { ReactNode } from "react";

interface LockableCardBodyProps {
  locked: boolean;
  children: ReactNode;
}

/**
 * Corps partagé des cartes conditionnées par la complétude du profil ou l'adhésion.
 * `pointer-events-none` conserve l'apparence et le comportement souris historiques ;
 * `inert` ferme aussi le sous-arbre au clavier et aux technologies d'assistance.
 */
export function LockableCardBody({ locked, children }: LockableCardBodyProps) {
  return (
    <div
      inert={locked}
      className={
        locked
          ? "pointer-events-none flex flex-1 flex-col opacity-30 grayscale"
          : "flex flex-1 flex-col"
      }
    >
      {children}
    </div>
  );
}
