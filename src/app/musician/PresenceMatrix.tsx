"use client";

import { useMemo } from "react";
import { Check, Minus, Pencil, Lock, X } from "lucide-react";
import { groupMembersByPupitre } from "@/lib/presence-groups";
import { isEventPast } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { LegendItem } from "./LegendItem";
import {
  buildMusicianRows,
  getCellVisual,
  getFullName,
  type MusicianRow,
} from "./presence-matrix-helpers";
import type { PresenceEvent, PresenceStatus } from "./PresenceCard";

function formatDateShortLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export interface PresenceMatrixProps {
  events: PresenceEvent[];
  currentUserId: number | null;
  onEditResponse: (eventId: number) => void;
}

export function PresenceMatrix({ events, currentUserId, onEditResponse }: PresenceMatrixProps) {
  const rows = useMemo(() => buildMusicianRows(events, currentUserId), [events, currentUserId]);
  const groups = useMemo(() => groupMembersByPupitre(rows), [rows]);

  const stickyCell =
    "sticky left-0 z-10 min-w-[128px] max-w-[180px] px-3 py-2 text-left align-top shadow-[3px_0_6px_-3px_rgba(0,0,0,0.15)]";

  return (
    <section aria-labelledby="presence-matrix-heading" className="space-y-3">
      <div>
        <h2 id="presence-matrix-heading" className="font-heading text-xl font-bold text-foreground">
          Qui vient à quelle date
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre ligne porte le badge « Vous »
          {currentUserId !== null && ", modifiable grâce à l'icône crayon"}.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-muted px-3 py-2.5 text-xs font-medium text-muted-foreground dark:bg-muted/40 dark:text-foreground">
        <LegendItem
          shapeClass="rounded-full bg-success text-success-foreground"
          Icon={Check}
          label="Présent"
        />
        <LegendItem
          shapeClass="rounded-md bg-destructive text-destructive-foreground"
          Icon={X}
          label="Absent"
        />
        <LegendItem
          shapeClass="rounded-full border-2 border-dashed border-border text-muted-foreground dark:border-border dark:text-muted-foreground"
          Icon={Minus}
          label="Sans réponse"
        />
        {currentUserId !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-border dark:bg-card dark:ring-border">
              <Pencil className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            </span>
            Modifier votre réponse
          </span>
        )}
      </div>

      {/* `contain:paint` est indispensable ici : une <table> en `min-width:max-content`
          reste comptée dans la largeur de défilement du document malgré le
          `overflow-x-auto` du conteneur, ce qui faisait défiler la page entière en 375px
          (mesuré : 736px de large pour un écran de 375px). Vérifié : sans lui 736, avec lui 375. */}
      <div className="overflow-x-auto overscroll-x-contain [contain:paint] rounded-xl border border-border">
        <table className="w-full min-w-max border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className={cn(stickyCell, "bg-muted dark:bg-muted/60")}>
                Musicien
              </th>
              {events.map((event) => (
                <th
                  key={event.id}
                  scope="col"
                  className="min-w-[92px] bg-muted px-2 py-2 text-center align-bottom dark:bg-muted/60"
                >
                  <span className="block text-sm font-bold text-foreground">
                    {formatDateShortLabel(event.date)}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-normal leading-snug text-muted-foreground">
                    {event.title}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.key}>
              <tr>
                {/* `scope="rowgroup"` : cette cellule décrit les lignes qui suivent, jusqu'au
                    prochain en-tête de groupe — c'est la sémantique exacte d'un titre de
                    pupitre. Même pattern que `src/app/admin/PresenceAdmin.tsx`.
                    Le <th> lui-même n'est PAS sticky : en `colSpan`, il occupe déjà toute la
                    largeur du tableau, donc son bloc conteneur n'a nulle part où le décaler —
                    l'offset se clampe à 0 et l'étiquette défilerait avec le reste (vérifié :
                    elle finissait à −79px). C'est le <span> interne, plus étroit que son
                    conteneur, qui est sticky : lui a de la place pour glisser vers la gauche
                    pendant le défilement. Les deux portent le même fond pour que le libellé se
                    fonde dans la bande de couleur, qui elle reste dans le flux normal. */}
                <th
                  scope="rowgroup"
                  colSpan={events.length + 1}
                  className="border-b border-t border-border bg-muted/80 p-0 text-left dark:border-border dark:bg-muted/60"
                >
                  <span className="sticky left-0 z-10 inline-block max-w-[80vw] truncate whitespace-nowrap bg-muted/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:bg-muted/60 dark:text-foreground">
                    {group.label}
                    <span className="ml-1.5 font-normal normal-case text-muted-foreground">
                      ({group.members.length})
                    </span>
                  </span>
                </th>
              </tr>
              {group.members.map((row: MusicianRow, index) => {
                const rowTint = row.isCurrentUser
                  ? "bg-primary/10 dark:bg-primary/15"
                  : index % 2 === 1
                    ? "bg-muted/70 dark:bg-muted/20"
                    : "bg-card dark:bg-card";
                return (
                  <tr
                    key={row.userId}
                    className={cn("border-b border-border last:border-0", rowTint)}
                  >
                    <th scope="row" className={cn(stickyCell, rowTint)}>
                      <span className="flex flex-wrap items-center gap-1.5 font-semibold text-foreground">
                        {getFullName(row.firstName, row.lastName)}
                        {row.isCurrentUser && (
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                            Vous
                          </span>
                        )}
                      </span>
                      {row.instruments.length > 0 && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {row.instruments.join(", ")}
                        </span>
                      )}
                    </th>
                    {events.map((event) => {
                      const status: PresenceStatus | null = row.statuses.get(event.id) ?? null;
                      const visual = getCellVisual(status);

                      if (row.isCurrentUser) {
                        // Une prestation passée reste consultable, mais plus modifiable : le
                        // libellé et l'icône de coin ne doivent jamais promettre une édition
                        // qui échouerait (le serveur refuse le POST). Le clic ouvre malgré
                        // tout la carte, qui explique pourquoi c'est fermé.
                        const cellIsPast = isEventPast(event.date);
                        const label = cellIsPast
                          ? `Voir votre réponse pour ${event.title} du ${formatDateShortLabel(event.date)} (prestation passée), actuellement : ${visual.label.toLowerCase()}`
                          : `Modifier votre réponse pour ${event.title} du ${formatDateShortLabel(event.date)}, actuellement : ${visual.label.toLowerCase()}`;
                        return (
                          <td key={event.id} className="px-1.5 py-1.5 text-center align-middle">
                            <button
                              type="button"
                              onClick={() => onEditResponse(event.id)}
                              title={label}
                              aria-label={label}
                              className={cn(
                                "relative mx-auto flex min-h-11 min-w-11 items-center justify-center transition-transform active:scale-95",
                                visual.shapeClass
                              )}
                            >
                              <visual.Icon className="h-4 w-4" aria-hidden="true" />
                              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-card ring-1 ring-border dark:bg-card dark:ring-border">
                                {cellIsPast ? (
                                  <Lock
                                    className="h-2.5 w-2.5 text-muted-foreground"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <Pencil
                                    className="h-2.5 w-2.5 text-muted-foreground"
                                    aria-hidden="true"
                                  />
                                )}
                              </span>
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td key={event.id} className="px-1.5 py-1.5 text-center align-middle">
                          <span
                            className={cn(
                              "mx-auto flex h-8 w-8 items-center justify-center",
                              visual.shapeClass
                            )}
                          >
                            <visual.Icon className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">{visual.label}</span>
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}
