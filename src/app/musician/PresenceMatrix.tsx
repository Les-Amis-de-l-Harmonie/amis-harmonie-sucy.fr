"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { groupMembersByPupitre } from "@/lib/presence-groups";
import { cn } from "@/lib/utils";
import { useActingLabels } from "./acting-labels";
import type { PresenceEvent } from "./musician-types";
import {
  buildMusicianRows,
  countPupitre,
  getCellVisual,
  getEventDateParts,
  getFullName,
  getShortName,
} from "./presence-matrix-helpers";
import { StatusDot } from "./StatusDot";

// Fonds opaques : les colonnes et lignes épinglées passent par-dessus des cellules qui
// défilent, une teinte translucide laisserait voir ce qu'il y a dessous.
const OWN_BG = "bg-[color-mix(in_oklab,var(--color-primary)_22%,var(--color-card))]";

function shortDate(event: PresenceEvent): string {
  const parts = getEventDateParts(event.date);
  return parts ? `${parts.dayPadded}/${parts.monthPadded}` : event.date;
}

export interface PresenceMatrixProps {
  events: PresenceEvent[];
  currentUserId: number | null;
  /** Ouvre la feuille de détail de la prestation. */
  onOpenEvent: (eventId: number) => void;
}

/**
 * Tableau « Qui vient à quelle date » pensé pour un téléphone : colonne des noms étroite
 * et épinglée, pastilles de 22 px, en-tête de dates et ligne personnelle épinglées, pupitres
 * repliables avec un total neutre (« 3/6 ») par date. Les défilements se font dans le
 * cadre du tableau lui-même (un seul conteneur) : les épinglages restent donc cohérents
 * et ne se heurtent pas à l'en-tête fixe du téléphone.
 */
export function PresenceMatrix({ events, currentUserId, onOpenEvent }: PresenceMatrixProps) {
  const labels = useActingLabels();
  const rows = useMemo(() => buildMusicianRows(events, currentUserId), [events, currentUserId]);
  const groups = useMemo(() => groupMembersByPupitre(rows), [rows]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const nameColumn = "w-28 min-w-28 max-w-28 sm:w-40 sm:min-w-40 sm:max-w-40";

  return (
    <section aria-label="Qui vient à quelle date" className="space-y-2">
      {/* `contain:paint` est indispensable : une <table> plus large que son cadre reste comptée dans
          la largeur de défilement du document malgré `overflow-auto` (mesuré : 365 px pour un
          écran de 345 px sans lui, 345 avec). */}
      <div className="isolate [--table-header-h:4.25rem] max-h-[calc(100dvh-16rem)] [contain:paint] min-h-72 overflow-auto overscroll-x-contain rounded-xl border border-border bg-card lg:max-h-[calc(100dvh-13rem)]">
        <table className="w-full border-separate border-spacing-0 text-left">
          <thead>
            <tr>
              <th
                scope="col"
                className={cn(
                  nameColumn,
                  "sticky left-0 top-0 z-30 h-(--table-header-h) border-b border-r border-border bg-card px-2.5 pb-1.5 text-left align-bottom text-[12.5px] font-bold leading-tight text-foreground"
                )}
              >
                Musicien
                <span className="block text-[11px] font-medium text-muted-foreground">
                  Présents
                </span>
              </th>
              {events.map((event) => {
                const parts = getEventDateParts(event.date);
                const { present, totalMembers } = event.counts;
                return (
                  <th
                    key={event.id}
                    scope="col"
                    className="sticky top-0 z-20 h-(--table-header-h) min-w-12 border-b border-border bg-card px-0.5 pb-1 pt-1.5 align-bottom"
                  >
                    <button
                      type="button"
                      data-presence-trigger={event.id}
                      aria-haspopup="dialog"
                      aria-label={`Détail du ${parts ? `${parts.weekday.toLowerCase()} ${parts.day} ${parts.monthName}` : event.date} : ${present} présent${present > 1 ? "s" : ""} sur ${totalMembers}`}
                      onClick={() => onOpenEvent(event.id)}
                      className="flex w-full cursor-pointer flex-col items-center gap-px rounded-lg py-0.5 leading-tight transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="text-[10.5px] font-bold uppercase text-muted-foreground">
                        {parts?.weekdayShort}
                      </span>
                      <span className="text-[13.5px] font-extrabold text-foreground">
                        {shortDate(event)}
                      </span>
                      <span className="mt-0.5 rounded-full bg-muted px-1.5 text-xs font-extrabold tabular-nums text-foreground">
                        {present}
                        <span className="text-[10.5px] font-semibold text-muted-foreground">
                          /{totalMembers}
                        </span>
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          {currentUserId !== null && (
            <tbody>
              <tr>
                <th
                  scope="row"
                  className={cn(
                    nameColumn,
                    OWN_BG,
                    "sticky left-0 top-(--table-header-h) z-20 h-11 border-b border-r border-border px-2.5 text-left text-[13px] font-extrabold text-foreground"
                  )}
                >
                  <span className="block truncate">{labels.ownRowLabel}</span>
                </th>
                {events.map((event) => {
                  const visual = getCellVisual(event.response.status);
                  const label = labels.editAnswerCell(
                    `${event.title} du ${shortDate(event)}`,
                    visual.label.toLowerCase()
                  );
                  return (
                    <td
                      key={event.id}
                      className={cn(
                        OWN_BG,
                        "sticky top-(--table-header-h) z-10 border-b border-border p-0 text-center"
                      )}
                    >
                      <button
                        type="button"
                        data-presence-trigger={event.id}
                        aria-haspopup="dialog"
                        title={label}
                        aria-label={label}
                        onClick={() => onOpenEvent(event.id)}
                        className="grid h-11 w-full cursor-pointer place-items-center transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary active:scale-90"
                      >
                        <StatusDot status={event.response.status} size="lg" />
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          )}

          {groups.map((group) => {
            const isOwnGroup = group.members.some((member) => member.isCurrentUser);
            const open = openGroups[group.key] ?? isOwnGroup;
            return (
              <tbody key={group.key} data-pupitre={group.label}>
                <tr>
                  {/* `scope="rowgroup"` : cette cellule décrit les lignes qui suivent, jusqu'au
                      prochain en-tête de pupitre. Même pattern que `PresenceAdmin.tsx`. */}
                  <th
                    scope="rowgroup"
                    className={cn(
                      nameColumn,
                      "sticky left-0 z-10 border-b border-r border-border bg-muted p-0 text-left"
                    )}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() =>
                        setOpenGroups((current) => ({ ...current, [group.key]: !open }))
                      }
                      className="flex h-[38px] w-full cursor-pointer items-center gap-0.5 pl-1.5 pr-1 text-left text-[12.5px] font-extrabold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    >
                      <ChevronDown
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 transition-transform",
                          !open && "-rotate-90"
                        )}
                        strokeWidth={2.6}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 truncate" title={group.label}>
                        {group.label}
                      </span>
                      <span className="sr-only">
                        {" "}
                        ({group.members.length} musicien{group.members.length > 1 ? "s" : ""})
                      </span>
                    </button>
                  </th>
                  {events.map((event) => {
                    const counts = countPupitre(group.members, event.id);
                    return (
                      <td
                        key={event.id}
                        className="border-b border-border bg-muted text-center text-xs font-extrabold tabular-nums text-foreground"
                      >
                        <span aria-hidden="true">
                          {counts.present}/{counts.total}
                        </span>
                        <span className="sr-only">
                          {counts.present} présent{counts.present > 1 ? "s" : ""} sur {counts.total}
                        </span>
                      </td>
                    );
                  })}
                </tr>
                {open &&
                  group.members.map((row) => {
                    const fullName = getFullName(row.firstName, row.lastName);
                    const cellBg = row.isCurrentUser ? OWN_BG : "bg-card";
                    return (
                      <tr key={row.userId}>
                        <th
                          scope="row"
                          title={fullName}
                          className={cn(
                            nameColumn,
                            cellBg,
                            "sticky left-0 z-10 h-[34px] border-b border-r border-border px-2.5 text-left text-[12.5px] leading-tight text-foreground",
                            row.isCurrentUser ? "font-extrabold" : "font-medium"
                          )}
                        >
                          <span className="block truncate" aria-hidden="true">
                            {getShortName(row.firstName, row.lastName)}
                          </span>
                          <span className="sr-only">
                            {fullName}
                            {row.isCurrentUser && ` (${labels.currentRowBadge})`}
                          </span>
                        </th>
                        {events.map((event) => (
                          <td
                            key={event.id}
                            className={cn(cellBg, "border-b border-border p-0 text-center")}
                          >
                            <StatusDot
                              status={row.statuses.get(event.id) ?? null}
                              size="md"
                              labelled
                              className="align-middle"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
              </tbody>
            );
          })}
        </table>
      </div>

      <div className="flex flex-wrap gap-x-3.5 gap-y-1 px-1 pt-1 text-xs text-muted-foreground">
        {(["present", "absent", null] as const).map((status) => (
          <span key={status ?? "none"} className="inline-flex items-center gap-1.5">
            <StatusDot status={status} size="xs" />
            {getCellVisual(status).label}
          </span>
        ))}
      </div>
      <p className="px-1 text-xs text-muted-foreground">{labels.tableHelp}</p>
    </section>
  );
}
