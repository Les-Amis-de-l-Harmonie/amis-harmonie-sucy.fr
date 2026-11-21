"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { MusicianActorSummary, MusicianProfileOption } from "@/app/api/auth";

/**
 * Qui est connecté et pour qui il agit, tel que résolu par le serveur pour la
 * requête courante (voir `resolveMusicianIdentity`). `MusicianLayout` le
 * fournit une fois ; les pages et composants du portail le lisent ici plutôt
 * que de se faire passer trois props par niveau.
 */
export interface MusicianSession {
  /** Identifiant du profil effectif (celui dont on voit et modifie les données). */
  userId: number | null;
  actor: MusicianActorSummary | null;
  /** Profil effectif tel qu'il figure dans `profiles` (nom, photo), s'il y est. */
  effective: MusicianProfileOption | null;
  /** Un responsable agit pour un enfant. */
  delegated: boolean;
  /** « Moi » en premier, puis les enfants reliés. */
  profiles: MusicianProfileOption[];
  /** Responsable connecté sur son propre compte : aucune donnée de musicien. */
  needsMusicianChoice: boolean;
  /**
   * Réponses de présence en ligne fermées pour ce compte (bêta, `src/lib/presence-beta.ts`) :
   * afficher le renvoi vers le fichier des présences au lieu des réponses.
   */
  presenceLocked: boolean;
}

const MusicianSessionContext = createContext<MusicianSession | null>(null);

interface MusicianSessionProviderProps {
  userId: number;
  actor: MusicianActorSummary;
  delegated: boolean;
  profiles: MusicianProfileOption[];
  children: ReactNode;
}

export function MusicianSessionProvider({
  userId,
  actor,
  delegated,
  profiles,
  children,
}: MusicianSessionProviderProps) {
  const value = useMemo<MusicianSession>(
    () => ({
      userId,
      actor,
      effective: profiles.find((profile) => profile.userId === userId) ?? null,
      delegated,
      profiles,
      needsMusicianChoice: actor.kind === "guardian" && !delegated,
      presenceLocked: actor.canAnswerPresence !== true,
    }),
    [userId, actor, delegated, profiles]
  );
  return (
    <MusicianSessionContext.Provider value={value}>{children}</MusicianSessionContext.Provider>
  );
}

export function useMusicianSession(): MusicianSession {
  const session = useContext(MusicianSessionContext);
  if (!session) {
    throw new Error("useMusicianSession doit être utilisé dans un MusicianSessionProvider.");
  }
  return session;
}

export function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`.trim();
}
