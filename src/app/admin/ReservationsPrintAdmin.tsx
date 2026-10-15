"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Printer, RefreshCw } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { FREE_EVENTS, getFreeEvent } from "@/lib/free-events";
import {
  ANONYMIZED_LABEL,
  buildAttendeeList,
  getInitial,
  readApiError,
} from "./reservations-utils";
import type { AdminReservation } from "./reservations-utils";

/**
 * Règles d'impression : page A4 portrait, en-tête de tableau répété sur chaque page,
 * total affiché une seule fois en fin de liste, fond forcé en blanc (même en thème sombre).
 */
const PRINT_CSS = `
@page { size: A4 portrait; margin: 12mm 12mm 14mm; }
.entry-list { font-variant-numeric: tabular-nums; }
.entry-list thead { display: table-header-group; }
.entry-list tfoot { display: table-row-group; }
.entry-list tr { break-inside: avoid; page-break-inside: avoid; }
.entry-list .letter-row { break-after: avoid; page-break-after: avoid; }
@media print {
  html, body, html.dark, html.dark body { background: #fff !important; }
  .entry-sheet {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    box-shadow: none !important;
    border: 0 !important;
    border-radius: 0 !important;
    padding: 0 !important;
    max-width: none !important;
  }
}
`;

function resolveEventSlug(): string {
  const fromUrl =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("eventSlug")
      : null;
  if (fromUrl && getFreeEvent(fromUrl)) return fromUrl;
  return FREE_EVENTS[0]?.slug ?? "";
}

function formatPrintedAt(date: Date): string {
  return date.toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isReservationList(value: unknown): value is { reservations: AdminReservation[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "reservations" in value &&
    Array.isArray((value as { reservations: unknown }).reservations)
  );
}

export function ReservationsPrintClient() {
  const [eventSlug, setEventSlug] = useState<string | null>(null);
  const [reservations, setReservations] = useState<AdminReservation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState<Date>(() => new Date());
  const [withLetters, setWithLetters] = useState(true);

  useEffect(() => {
    setEventSlug(resolveEventSlug());
  }, []);

  const event = eventSlug ? getFreeEvent(eventSlug) : undefined;

  const load = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/reservations?eventSlug=${encodeURIComponent(slug)}`,
        {
          cache: "no-store",
        }
      );
      if (!response.ok) {
        setError(await readApiError(response, "Impossible de charger la liste."));
        return;
      }
      const body: unknown = await response.json();
      if (!isReservationList(body)) {
        setError("La réponse du serveur est incomplète. Rechargez la page.");
        return;
      }
      setReservations(body.reservations);
      setPrintedAt(new Date());
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (eventSlug) void load(eventSlug);
  }, [eventSlug, load]);

  const attendees = useMemo(() => buildAttendeeList(reservations ?? []), [reservations]);
  const totalPlaces = useMemo(
    () => attendees.reduce((sum, r) => sum + r.partySize, 0),
    [attendees]
  );

  const backHref = "/admin/reservations";

  return (
    <div className="mx-auto max-w-[210mm]">
      <style>{PRINT_CSS}</style>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <a
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour aux réservations
        </a>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 accent-primary"
              checked={withLetters}
              onChange={(e) => setWithLetters(e.target.checked)}
            />
            Séparer par lettre
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => eventSlug && void load(eventSlug)}
            disabled={loading || !eventSlug}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Actualiser
          </Button>
          <Button onClick={() => window.print()} disabled={loading || attendees.length === 0}>
            <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
            Imprimer
          </Button>
        </div>
      </div>

      <div aria-live="polite">
        {error && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm print:hidden"
          >
            {error}
          </p>
        )}
      </div>

      {/* Feuille A4 : toujours blanche, même en thème sombre */}
      <article className="entry-sheet rounded-md border border-border bg-white px-[10mm] py-[10mm] text-black shadow-sm">
        {!event ? (
          <p className="py-12 text-center text-sm text-gray-600">Événement introuvable.</p>
        ) : loading && !reservations ? (
          <div
            className="flex items-center justify-center gap-2 py-16 text-sm text-gray-600"
            aria-busy="true"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Chargement de la liste…
          </div>
        ) : (
          <>
            <header className="mb-4 border-b-2 border-black pb-3">
              <p className="text-[10pt] font-semibold uppercase tracking-widest text-gray-600">
                Liste d'entrée
              </p>
              <h1 className="mt-0.5 text-[20pt] font-bold leading-tight">{event.title}</h1>
              <p className="mt-0.5 text-[11pt]">
                {event.dateLabel} · {event.placeLabel}
              </p>
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-[10pt]">
                <p>
                  <strong>{attendees.length}</strong> réservation{attendees.length > 1 ? "s" : ""} ·{" "}
                  <strong>{totalPlaces}</strong> place{totalPlaces > 1 ? "s" : ""}
                </p>
                <p className="text-gray-600">Imprimée le {formatPrintedAt(printedAt)}</p>
              </div>
            </header>

            {attendees.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-600">
                Aucune réservation active pour le moment.
              </p>
            ) : (
              <table className="entry-list w-full border-collapse text-[11pt]">
                <thead>
                  <tr className="border-b border-black text-left text-[9pt] uppercase tracking-wider text-gray-700">
                    <th className="py-1.5 pr-2 font-semibold">Nom</th>
                    <th className="py-1.5 pr-2 font-semibold">Prénom</th>
                    <th className="w-[18mm] py-1.5 pr-2 text-right font-semibold">Places</th>
                    <th className="w-[22mm] py-1.5 text-center font-semibold">Présent</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((r, index) => {
                    const initial = getInitial(r.lastName);
                    const previous = index > 0 ? getInitial(attendees[index - 1].lastName) : null;
                    const anonymized = !r.lastName && !r.firstName;
                    return (
                      <Fragment key={r.id}>
                        {withLetters && initial !== previous && (
                          <tr className="letter-row">
                            <td
                              colSpan={4}
                              className="border-b border-gray-400 pb-0.5 pt-2.5 text-[10pt] font-bold text-gray-700"
                            >
                              {initial}
                            </td>
                          </tr>
                        )}
                        <tr className="odd:bg-gray-100">
                          <td className="h-[7.4mm] py-0.5 pl-1 pr-2 font-semibold">
                            {anonymized ? (
                              <span className="font-normal italic text-gray-500">
                                {ANONYMIZED_LABEL}
                              </span>
                            ) : (
                              (r.lastName ?? "")
                            )}
                          </td>
                          <td className="py-0.5 pr-2">{r.firstName ?? ""}</td>
                          <td className="py-0.5 pr-2 text-right font-semibold">{r.partySize}</td>
                          <td className="py-0.5 text-center">
                            <span
                              className="inline-block h-[4.5mm] w-[4.5mm] border border-black bg-white align-middle"
                              aria-hidden="true"
                            />
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black text-[11pt] font-bold">
                    <td className="pt-2" colSpan={2}>
                      Total · {attendees.length} réservation{attendees.length > 1 ? "s" : ""}
                    </td>
                    <td className="pt-2 pr-2 text-right">{totalPlaces}</td>
                    <td className="pt-2 text-center text-[9pt] font-normal text-gray-600">
                      places
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </>
        )}
      </article>
    </div>
  );
}
