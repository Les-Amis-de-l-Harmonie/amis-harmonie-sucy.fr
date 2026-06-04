"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Minus, Loader2, RefreshCw, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import type { PlanningEvent } from "@/db/types";
import { formatDateShort } from "@/lib/dates";

interface AvailabilityRow {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instrument: string;
  availabilities: Record<string, "oui" | "non" | "peut-etre">;
}

interface AvailabilityData {
  events: PlanningEvent[];
  rows: AvailabilityRow[];
  currentUserId: number;
}

type StatusValue = "oui" | "non" | "peut-etre" | null;

// Only oui/non/null are offered in the select — peut-etre is kept for imported legacy data

function getFullName(firstName: string | null, lastName: string | null): string {
  if (!firstName && !lastName) return "Anonyme";
  return [firstName, lastName].filter(Boolean).join(" ");
}

// Instrument ordering matching the trombinoscope
const INSTRUMENT_ORDER: Record<string, number> = {
  "chef d'orchestre": 0,
  "chef adjoint": 1,
  percussions: 2,
};

function getInstrumentPriority(instrument: string): number {
  return INSTRUMENT_ORDER[instrument.toLowerCase()] ?? 999;
}

function sortRowsByInstrument(rows: AvailabilityRow[]): AvailabilityRow[] {
  return [...rows].sort((a, b) => {
    const aInstruments = a.instrument ? a.instrument.split(", ").filter(Boolean) : [];
    const bInstruments = b.instrument ? b.instrument.split(", ").filter(Boolean) : [];
    const aHas = aInstruments.length > 0;
    const bHas = bInstruments.length > 0;
    if (aHas !== bHas) return aHas ? -1 : 1;
    if (!aHas) {
      const nameA = (a.lastName || "").toLowerCase();
      const nameB = (b.lastName || "").toLowerCase();
      if (nameA !== nameB) return nameA.localeCompare(nameB, "fr");
      return (a.firstName || "").toLowerCase().localeCompare((b.firstName || "").toLowerCase(), "fr");
    }
    const prioA = Math.min(...aInstruments.map(getInstrumentPriority));
    const prioB = Math.min(...bInstruments.map(getInstrumentPriority));
    if (prioA !== prioB) return prioA - prioB;
    const bestA = aInstruments.reduce((best, i) =>
      getInstrumentPriority(i) < getInstrumentPriority(best) ? i : best
    );
    const bestB = bInstruments.reduce((best, i) =>
      getInstrumentPriority(i) < getInstrumentPriority(best) ? i : best
    );
    if (bestA !== bestB) return bestA.localeCompare(bestB, "fr");
    const nameA = (a.lastName || "").toLowerCase();
    const nameB = (b.lastName || "").toLowerCase();
    if (nameA !== nameB) return nameA.localeCompare(nameB, "fr");
    return (a.firstName || "").toLowerCase().localeCompare((b.firstName || "").toLowerCase(), "fr");
  });
}

function EventSummary({
  eventId,
  rows,
}: {
  eventId: string;
  rows: AvailabilityRow[];
}) {
  let oui = 0;
  let non = 0;
  let vide = 0;

  for (const row of rows) {
    const status = row.availabilities[eventId];
    if (status === "oui") oui++;
    else if (status === "non") non++;
    else vide++;
  }

  return (
    <span className="text-[10px] leading-tight text-gray-400 dark:text-gray-500 whitespace-nowrap">
      {oui > 0 && <span className="text-green-500">{oui}✓</span>}
      {non > 0 && (
        <>
          {" "}
          <span className="text-red-400">{non}✗</span>
        </>
      )}
      {vide > 0 && (
        <>
          {" "}
          <span className="text-gray-400">{vide}—</span>
        </>
      )}
      {oui === 0 && non === 0 && vide === 0 && ""}
    </span>
  );
}

interface MusicianDisponibilitesProps {
  userId: number;
  firstName: string;
  lastName: string;
}

export function MusicianDisponibilites({
  userId: _userId,
  firstName: _firstName,
  lastName: _lastName,
}: MusicianDisponibilitesProps) {
  const [data, setData] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingEventId, setUpdatingEventId] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/musician/availability");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des disponibilités");
      }
      const result = (await response.json()) as AvailabilityData;
      setData(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur inattendue est survenue"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleStatusChange = useCallback(
    async (eventId: number, newStatus: StatusValue) => {
      if (!data) return;
      // optimistic update
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rows: prev.rows.map((row) => {
            if (row.userId !== prev.currentUserId) return row;
            const newAvailabilities = { ...row.availabilities };
            if (newStatus === null) {
              delete newAvailabilities[String(eventId)];
            } else {
              newAvailabilities[String(eventId)] = newStatus;
            }
            return { ...row, availabilities: newAvailabilities };
          }),
        };
      });
      setUpdatingEventId(eventId);
      try {
        const response = await fetch("/api/musician/availability", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, status: newStatus }),
        });
        if (!response.ok) {
          fetchData();
        }
      } catch {
        fetchData();
      } finally {
        setUpdatingEventId(null);
      }
    },
    [data, fetchData]
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="p-4 rounded-full bg-red-50 dark:bg-red-900/20">
          <Calendar className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-600 dark:text-red-400 text-lg font-medium">{error}</p>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Réessayer
        </button>
      </div>
    );
  }

  // Empty state (no events at all)
  if (!data || data.events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
        <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          Aucune prestation prévue pour le moment.
        </p>
      </div>
    );
  }

  const currentRow = data.rows.find((r) => r.userId === data.currentUserId);
  const otherRows = data.rows.filter((r) => r.userId !== data.currentUserId);

  // Split events: upcoming (date >= today) vs past
  const today = new Date().toISOString().split("T")[0];
  const upcomingEvents = data.events.filter((e) => e.date >= today);
  const pastEvents = data.events.filter((e) => e.date < today);
  const visibleEvents = showPast ? data.events : upcomingEvents;

  // Reorder: current user first, then others sorted by instrument (like trombinoscope)
  const sortedOthers = sortRowsByInstrument(otherRows);
  const orderedRows = currentRow
    ? [currentRow, ...sortedOthers]
    : sortRowsByInstrument(data.rows);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Mes disponibilités
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Indiquez votre présence pour chaque prestation
        </p>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-gray-600 dark:text-gray-400 font-medium text-xs uppercase tracking-wider">
          Légende&nbsp;:
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium">
          <Check className="w-3.5 h-3.5" />
          Présent
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium">
          <X className="w-3.5 h-3.5" />
          Absent
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 text-xs font-medium">
          <Minus className="w-3.5 h-3.5" />
          Non répondu
        </span>
      </div>

      {/* Past events toggle */}
      {pastEvents.length > 0 && (
        <button
          onClick={() => setShowPast((prev) => !prev)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          {showPast ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          {showPast
            ? "Masquer les prestations passées"
            : `Afficher les prestations passées (${pastEvents.length})`}
        </button>
      )}

      {/* Table wrapped in a full-width scroll container */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <div className="mx-4 sm:mx-6 lg:mx-8 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <table className="w-full min-w-max table-fixed border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th
                  scope="col"
                  className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800/50 border-r border-b border-gray-200 dark:border-gray-700 px-3 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  style={{ width: 200, minWidth: 180, maxWidth: 220 }}
                >
                  Musicien
                </th>
                {visibleEvents.map((event) => (
                  <th
                    key={event.id}
                    scope="col"
                    className="border-b border-gray-200 dark:border-gray-700 px-2 py-3 text-center align-top"
                    style={{ width: 120, minWidth: 110, maxWidth: 140 }}
                  >
                    <div className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {event.name}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                      {formatDateShort(event.date)}
                      {event.time && <> • {event.time}</>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {orderedRows.map((row, rowIdx) => {
                const isCurrentUser = row.userId === data.currentUserId;
                return (
                  <tr
                    key={row.userId}
                    className={`transition-colors ${
                      isCurrentUser
                        ? "bg-primary/5 dark:bg-primary/10"
                        : rowIdx % 2 === 0
                          ? "bg-white dark:bg-gray-900"
                          : "bg-gray-50/50 dark:bg-gray-800/20"
                    }`}
                  >
                    {/* Sticky musician column */}
                    <td
                      className={`sticky left-0 z-10 border-r border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 ${
                        isCurrentUser
                          ? "bg-primary/5 dark:bg-primary/10"
                          : rowIdx % 2 === 0
                            ? "bg-white dark:bg-gray-900"
                            : "bg-gray-50/50 dark:bg-gray-800/20"
                      }`}
                      style={{ width: 200, minWidth: 180, maxWidth: 220 }}
                    >
                      <div className="flex items-center gap-2">
                        {isCurrentUser && (
                          <span className="w-1 h-8 rounded-full bg-primary shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div
                            className={`text-sm font-medium truncate ${
                              isCurrentUser
                                ? "text-primary"
                                : "text-gray-900 dark:text-gray-100"
                            }`}
                          >
                            {getFullName(row.firstName, row.lastName)}
                          </div>
                          <div className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                            {row.instrument}
                          </div>
                        </div>
                        {isCurrentUser && (
                          <span className="ml-auto text-[10px] font-medium text-primary/70 uppercase tracking-wider shrink-0">
                            Moi
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Event columns */}
                    {visibleEvents.map((event) => {
                      const status: StatusValue =
                        row.availabilities[String(event.id)] ?? null;

                      if (isCurrentUser) {
                        const selectId = `status-${row.userId}-${event.id}`;
                        return (
                          <td
                            key={event.id}
                            className="border-b border-gray-200 dark:border-gray-700 p-1 text-center"
                          >
                            <select
                              id={selectId}
                              value={status ?? ""}
                              disabled={updatingEventId === event.id}
                              onChange={(e) => {
                                const val = e.target.value;
                                handleStatusChange(
                                  event.id,
                                  val === "" ? null : (val as "oui" | "non")
                                );
                              }}
                              className={`w-full min-h-[38px] rounded-lg cursor-pointer text-xs font-medium text-center appearance-none px-1 transition-colors ${
                                status === "oui"
                                  ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700"
                                  : status === "non"
                                    ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700"
                                    : "bg-gray-50 dark:bg-gray-800/30 text-gray-400 border-gray-200 dark:border-gray-700"
                              } border focus:outline-none focus:ring-2 focus:ring-primary/40`}
                            >
                              <option value="">—</option>
                              <option value="oui">Présent</option>
                              <option value="non">Absent</option>
                            </select>
                          </td>
                        );
                      }

                      // Read-only rows
                      return (
                        <td
                          key={event.id}
                          className="border-b border-gray-200 dark:border-gray-700 p-1 text-center"
                        >
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                              status === "oui"
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : status === "non"
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                  : "bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {status === "oui" ? (
                              <Check className="w-3.5 h-3.5" />
                            ) : status === "non" ? (
                              <X className="w-3.5 h-3.5" />
                            ) : (
                              <Minus className="w-3.5 h-3.5" />
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            {/* Summary footer */}
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-800/30">
                <td
                  className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800/30 border-t border-r border-gray-200 dark:border-gray-700 px-3 py-2"
                  style={{ width: 200, minWidth: 180, maxWidth: 220 }}
                >
                  <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                    Résumé
                  </span>
                </td>
                {visibleEvents.map((event) => (
                  <td
                    key={event.id}
                    className="border-t border-gray-200 dark:border-gray-700 px-2 py-2 text-center"
                  >
                    <EventSummary
                      eventId={String(event.id)}
                      rows={data.rows}
                    />
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Click hint (only shown when there are events) */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Sélectionnez votre statut pour chaque prestation.
      </p>
    </div>
  );
}
