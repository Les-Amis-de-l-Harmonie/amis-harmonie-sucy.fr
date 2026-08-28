import {
  compareInstruments,
  getInstrumentPriority,
  INSTRUMENT_WITHOUT_SECTION_LABEL,
  isLeadershipInstrument,
} from "@/lib/instruments";
import { compareMembersByName } from "@/lib/presence";

export const DIRECTION_GROUP_LABEL = "Direction";

export interface GroupableMember {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  primaryInstrument: string | null;
}

function leadershipPriority(instrument: string): number {
  return getInstrumentPriority(instrument.replaceAll("’", "'"));
}

export function groupMembersByPupitre<T extends GroupableMember>(
  members: T[]
): Array<{ key: string; label: string; members: T[] }> {
  const direction: Array<{ member: T; priority: number }> = [];
  const byInstrument = new Map<string, T[]>();

  for (const member of members) {
    const leadershipInstruments = member.instruments.filter(isLeadershipInstrument);
    if (leadershipInstruments.length > 0) {
      direction.push({
        member,
        priority:
          leadershipInstruments.length > 0
            ? Math.min(...leadershipInstruments.map(leadershipPriority))
            : 999,
      });
      continue;
    }

    const heldInstruments = member.instruments.slice().sort(compareInstruments);
    const primaryInstrument =
      (member.primaryInstrument !== null && member.instruments.includes(member.primaryInstrument)
        ? member.primaryInstrument
        : heldInstruments[0]) ?? INSTRUMENT_WITHOUT_SECTION_LABEL;
    const group = byInstrument.get(primaryInstrument) ?? [];
    group.push(member);
    byInstrument.set(primaryInstrument, group);
  }

  direction.sort((a, b) => {
    return a.priority - b.priority || compareMembersByName(a.member, b.member);
  });

  const groups: Array<{ key: string; label: string; members: T[] }> = [];
  if (direction.length > 0) {
    groups.push({
      key: "direction",
      label: DIRECTION_GROUP_LABEL,
      members: direction.map(({ member }) => member),
    });
  }

  const instrumentGroups = Array.from(byInstrument.entries()).sort(([labelA], [labelB]) => {
    if (labelA === INSTRUMENT_WITHOUT_SECTION_LABEL) return 1;
    if (labelB === INSTRUMENT_WITHOUT_SECTION_LABEL) return -1;
    return compareInstruments(labelA, labelB);
  });
  for (const [label, groupedMembers] of instrumentGroups) {
    groupedMembers.sort(compareMembersByName);
    groups.push({ key: `instrument:${label}`, label, members: groupedMembers });
  }

  return groups;
}
