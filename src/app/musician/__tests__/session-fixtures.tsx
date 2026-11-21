import type { ReactNode } from "react";
import type { MusicianActorSummary, MusicianProfileOption } from "@/app/api/auth";
import { MusicianSessionProvider } from "../MusicianSession";

export const SELF: MusicianProfileOption = {
  userId: 10,
  isSelf: true,
  kind: "member",
  firstName: "Claire",
  lastName: "Martin",
  avatar: null,
};

export const GUARDIAN_SELF: MusicianProfileOption = { ...SELF, kind: "guardian" };

export const LEA: MusicianProfileOption = {
  userId: 21,
  isSelf: false,
  kind: "managed",
  firstName: "Léa",
  lastName: "Martin",
  avatar: null,
};

export const THEO: MusicianProfileOption = {
  userId: 22,
  isSelf: false,
  kind: "member",
  firstName: "Théo",
  lastName: "Martin",
  avatar: "https://example.com/theo.webp",
};

/** Par défaut le compte peut répondre en ligne (testeur de la bêta) : les tests existants restent « déverrouillés ». */
export function actorOf(
  profile: MusicianProfileOption,
  canAnswerPresence = true
): MusicianActorSummary {
  return {
    canAnswerPresence,
    userId: profile.userId,
    kind: profile.kind,
    firstName: profile.firstName,
    lastName: profile.lastName,
    avatar: profile.avatar,
  };
}

interface SessionOptions {
  profiles: MusicianProfileOption[];
  /** Profil effectif ; « Moi » par défaut. */
  userId?: number;
  delegated?: boolean;
  actor?: MusicianProfileOption;
  /** Réponses de présence fermées pour ce compte (bêta) : `canAnswerPresence` à faux. */
  presenceLocked?: boolean;
}

export function withSession(
  {
    profiles,
    userId,
    delegated = false,
    actor = profiles[0],
    presenceLocked = false,
  }: SessionOptions,
  children: ReactNode
) {
  return (
    <MusicianSessionProvider
      userId={userId ?? actor.userId}
      actor={actorOf(actor, !presenceLocked)}
      delegated={delegated}
      profiles={profiles}
    >
      {children}
    </MusicianSessionProvider>
  );
}
