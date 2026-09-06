"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Check, History, Loader2, RefreshCw } from "lucide-react";
import { Label } from "@/app/components/ui/label";
import { Switch } from "@/app/components/ui/switch";
import { EmptyState } from "@/app/components/ui/empty-state";
import { isEventPast } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { PresenceCard, type PresenceEvent } from "./PresenceCard";
import { PresenceMatrix } from "./PresenceMatrix";
import { useLingeringCards } from "./useLingeringCards";

interface PresenceApiResponse {
  currentUserId?: number;
  events: PresenceEvent[];
}

export function MusicianDisponibilites() {
  const [events, setEvents] = useState<PresenceEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [openEventId, setOpenEventId] = useState<number | null>(null);
  // La fenêtre "passé/à venir" est décidée par le serveur (rolling 12 mois) : on ne
  // fait ici que lui transmettre l'intention, jamais de calcul de date côté client.
  const [showPast, setShowPast] = useState(false);
  const focusedCardRef = useRef<HTMLDivElement | null>(null);
  const { lingeringIds, armLinger, cancelLinger, handleStatusChanged } = useLingeringCards();

  const fetchData = useCallback(async (includePast: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/musician/presence${includePast ? "?includePast=1" : ""}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des prestations.");
      }
      const result = (await response.json()) as PresenceApiResponse;
      setEvents(result.events);
      // L'identifiant de l'utilisateur connecté vient de la même réponse : il est
      // dérivé de la session côté serveur. Un appel séparé à /api/musician/profile
      // ferait disparaître silencieusement la mise en avant et l'icône d'édition
      // de sa propre ligne s'il échouait.
      setCurrentUserId(result.currentUserId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(showPast);
  }, [showPast, fetchData]);

  useEffect(() => {
    if (openEventId === null) return;
    focusedCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [openEventId]);

  const handleUpdate = useCallback((updatedEvent: PresenceEvent) => {
    setEvents((prev) =>
      prev ? prev.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)) : prev
    );
  }, []);

  const handleEditResponse = useCallback((eventId: number) => {
    setOpenEventId(eventId);
  }, []);

  // Premier chargement : aucune donnée à montrer, la page entière est un état de
  // chargement. Bascule ultérieure du filtre passé/à venir : on garde l'affichage
  // existant et on se contente d'un indicateur discret (cf. `isRefreshing` plus bas),
  // pour ne pas faire clignoter toute la vue en squelette.
  const isInitialLoad = loading && events === null;
  const isRefreshing = loading && events !== null;

  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error && events === null) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
        <div className="rounded-full bg-destructive/10 p-4 dark:bg-destructive/20">
          <Calendar className="h-8 w-8 text-destructive" />
        </div>
        <p className="text-lg font-medium text-destructive">{error}</p>
        <button
          onClick={() => fetchData(showPast)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  // Les prestations passées répondent "non" au serveur pour tout POST : leurs
  // cartes sont donc en lecture seule (voir `isPast` dans PresenceCard) et ne
  // comptent pas comme "en attente de réponse", puisque l'utilisateur ne peut plus agir dessus.
  const unansweredCount = (events ?? []).filter(
    (event) => event.response.status === null && !isEventPast(event.date)
  ).length;
  const visibleEvents = (events ?? []).filter(
    (event) => event.response.status === null || event.id === openEventId || lingeringIds.has(event.id)
  );
  // Le même critère que `unansweredCount` sépare la liste en deux : la file "à répondre"
  // (jamais de prestation passée, par construction) et une zone de consultation à part
  // pour ce que le bouton "Prestations passées" a révélé.
  const pendingEvents = visibleEvents.filter((event) => !isEventPast(event.date));
  const revealedPastEvents = visibleEvents.filter((event) => isEventPast(event.date));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Mes prestations</h1>
          <p className="mt-1 text-muted-foreground">
            {events && events.length > 0
              ? unansweredCount > 0
                ? `${unansweredCount} prestation${unansweredCount > 1 ? "s" : ""} en attente de votre réponse`
                : "Vous avez répondu pour toutes les prestations à venir"
              : "Indiquez votre présence pour chaque prestation"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRefreshing && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
          )}
          <Switch
            id="show-past-events"
            checked={showPast}
            onCheckedChange={setShowPast}
            disabled={isRefreshing}
          />
          <Label
            htmlFor="show-past-events"
            className="flex cursor-pointer items-center gap-1.5 text-sm font-normal text-muted-foreground"
          >
            <History className="h-3.5 w-3.5" />
            Prestations passées
          </Label>
        </div>
      </div>

      {error && events !== null && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/20"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchData(showPast)}
            className="inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer
          </button>
        </div>
      )}

      <div
        className={cn(isRefreshing && "pointer-events-none opacity-60 transition-opacity")}
        aria-busy={isRefreshing}
      >
        {!events || events.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-10 w-10" />}
            title={
              showPast
                ? "Aucune prestation sur les 12 derniers mois."
                : "Aucune prestation ne nécessite votre réponse pour le moment."
            }
            description="Revenez ici dès qu'une nouvelle date sera annoncée."
          />
        ) : (
          <div className="space-y-6">
            {pendingEvents.length > 0 ? (
              <div className="space-y-4">
                {pendingEvents.map((event) => (
                  <div key={event.id} ref={event.id === openEventId ? focusedCardRef : undefined}>
                    <PresenceCard
                      event={event}
                      onUpdate={handleUpdate}
                      onStatusChanged={handleStatusChanged}
                      onLingerArm={armLinger}
                      onLingerCancel={cancelLinger}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3.5 text-sm font-medium text-success dark:border-success/40 dark:bg-success/20">
                <Check className="h-5 w-5 shrink-0" />
                Vous avez répondu à toutes les prestations à venir. Le tableau ci-dessous récapitule
                qui vient.
              </div>
            )}

            {/* Zone à part, jamais mêlée à la file "à répondre" ci-dessus : ce sont des
                prestations révélées par le bouton "Prestations passées", pas des cartes en
                attente — le compteur d'en-tête ne les compte déjà plus, la mise en page doit
                le confirmer plutôt que le contredire. */}
            {revealedPastEvents.length > 0 && (
              <section
                aria-labelledby="past-events-heading"
                className="space-y-3 border-t border-dashed border-border pt-4"
              >
                <div>
                  <h2
                    id="past-events-heading"
                    className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
                  >
                    <History className="h-4 w-4" aria-hidden="true" />
                    Prestations passées
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Terminées : elles ne sont plus comptées ni modifiables.
                  </p>
                </div>
                <div className="space-y-4">
                  {revealedPastEvents.map((event) => (
                    <div key={event.id} ref={event.id === openEventId ? focusedCardRef : undefined}>
                      <PresenceCard
                        event={event}
                        onUpdate={handleUpdate}
                        onStatusChanged={handleStatusChanged}
                        onLingerArm={armLinger}
                        onLingerCancel={cancelLinger}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            <PresenceMatrix
              events={events}
              currentUserId={currentUserId}
              onEditResponse={handleEditResponse}
            />
          </div>
        )}
      </div>
    </div>
  );
}
