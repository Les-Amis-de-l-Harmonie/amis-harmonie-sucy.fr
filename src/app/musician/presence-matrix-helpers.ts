import { Check, Minus, X, type LucideIcon } from "lucide-react";
import type { PresenceEvent, PresenceStatus } from "./PresenceCard";

export interface MusicianRow {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  primaryInstrument: string | null;
  isCurrentUser: boolean;
  statuses: Map<number, PresenceStatus | null>;
}

export interface CellVisual {
  Icon: LucideIcon;
  label: string;
  shapeClass: string;
}

export function getFullName(firstName: string | null, lastName: string | null): string {
  if (!firstName && !lastName) return "Anonyme";
  return [firstName, lastName].filter(Boolean).join(" ");
}

/** Construit une ligne par musicien à partir des rosters de tous les événements, en
 * conservant l'ordre d'apparition fourni par l'API (déjà groupé par pupitre). Le
 * regroupement par pupitre visible dans le tableau est fait séparément par
 * `groupMembersByPupitre`, à partir de ces lignes. */
export function buildMusicianRows(
  events: PresenceEvent[],
  currentUserId: number | null
): MusicianRow[] {
  const order: number[] = [];
  const info = new Map<
    number,
    {
      firstName: string | null;
      lastName: string | null;
      instruments: string[];
      primaryInstrument: string | null;
    }
  >();
  const statuses = new Map<number, Map<number, PresenceStatus | null>>();

  for (const event of events) {
    for (const member of event.roster) {
      if (!info.has(member.userId)) {
        info.set(member.userId, {
          firstName: member.firstName,
          lastName: member.lastName,
          instruments: member.instruments,
          primaryInstrument: member.primaryInstrument,
        });
        order.push(member.userId);
      }
      let byEvent = statuses.get(member.userId);
      if (!byEvent) {
        byEvent = new Map<number, PresenceStatus | null>();
        statuses.set(member.userId, byEvent);
      }
      byEvent.set(event.id, member.status);
    }
  }

  return order.map((userId) => {
    const details = info.get(userId);
    return {
      userId,
      firstName: details?.firstName ?? null,
      lastName: details?.lastName ?? null,
      instruments: details?.instruments ?? [],
      primaryInstrument: details?.primaryInstrument ?? null,
      isCurrentUser: userId === currentUserId,
      statuses: statuses.get(userId) ?? new Map<number, PresenceStatus | null>(),
    };
  });
}

/** Les trois états se distinguent par la forme ET l'icône, pas seulement la couleur :
 * cercle plein + coche pour présent, carré plein + croix pour absent, cercle en
 * pointillés + tiret pour sans réponse. */
export function getCellVisual(status: PresenceStatus | null): CellVisual {
  if (status === "present") {
    return {
      Icon: Check,
      label: "Présent",
      shapeClass: "rounded-full bg-success text-success-foreground shadow-sm",
    };
  }
  if (status === "absent") {
    return {
      Icon: X,
      label: "Absent",
      shapeClass: "rounded-md bg-destructive text-destructive-foreground shadow-sm",
    };
  }
  return {
    Icon: Minus,
    label: "Sans réponse",
    shapeClass:
      "rounded-full border-2 border-dashed border-border text-muted-foreground dark:border-border dark:text-muted-foreground",
  };
}
