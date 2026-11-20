"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar, Check, Clock, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/app/components/ui/empty-state";
import type { PresenceStatus } from "@/db/types";
import { isEventPast } from "@/lib/dates";
import { useActingLabels } from "./acting-labels";
import { MusicianChoiceGate } from "./ChooseMusicianState";
import { needsAuthorizationAttention } from "./authorization-helpers";
import type { PresenceEvent } from "./musician-types";
import { PresenceMatrix } from "./PresenceMatrix";
import { PresenceResponses, type PastEventsState } from "./PresenceResponses";
import { PresenceSheet } from "./PresenceSheet";
import { PresenceToast, type PresenceToastData } from "./PresenceToast";
import {
  PRESENCE_PANEL_IDS,
  PRESENCE_TAB_IDS,
  PresenceViewSwitch,
  type PresenceView,
} from "./PresenceViewSwitch";
import { usePresenceSave } from "./usePresenceSave";

interface PresenceApiResponse {
  currentUserId?: number;
  events: PresenceEvent[];
}

interface SheetState {
  eventId: number;
  focusComment: boolean;
}

const INITIAL_PAST: PastEventsState = { open: false, loading: false, error: null, events: null };

function replaceEvent(list: PresenceEvent[], updated: PresenceEvent): PresenceEvent[] {
  return list.map((event) => (event.id === updated.id ? updated : event));
}

function MusicianDisponibilitesContent() {
  const labels = useActingLabels();
  const [events, setEvents] = useState<PresenceEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [view, setView] = useState<PresenceView>("list");
  const [past, setPast] = useState<PastEventsState>(INITIAL_PAST);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [toast, setToast] = useState<PresenceToastData | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  // Mémorisé hors état : Radix demande le retour du focus APRÈS la fermeture, quand `sheet` est déjà vidé.
  const lastOpenedEventId = useRef<number | null>(null);
  // Lu après un `await` (réponse rapide) : l'état de la feuille y serait périmé.
  const sheetOpenRef = useRef(false);
  const toastCounter = useRef(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/musician/presence");
      if (!response.ok) {
        throw new Error("Erreur lors du chargement des prestations.");
      }
      const result = (await response.json()) as PresenceApiResponse;
      setEvents(result.events);
      // L'identifiant de l'utilisateur connecté vient de la même réponse : il est
      // dérivé de la session côté serveur. Un appel séparé à /api/musician/profile
      // ferait disparaître silencieusement la ligne personnelle s'il échouait.
      setCurrentUserId(result.currentUserId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur inattendue est survenue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // La fenêtre « passé » (12 mois glissants) est décidée par le serveur : on ne fait
  // ici que lui transmettre l'intention, jamais de calcul de date côté client.
  const loadPast = useCallback(async () => {
    setPast((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await fetch("/api/musician/presence?includePast=1");
      if (!response.ok) {
        throw new Error("Impossible de charger les prestations passées.");
      }
      const result = (await response.json()) as PresenceApiResponse;
      const pastEvents = result.events
        .filter((event) => isEventPast(event.date))
        .sort((a, b) => b.date.localeCompare(a.date));
      setPast((current) => ({ ...current, loading: false, events: pastEvents }));
    } catch (err) {
      setPast((current) => ({
        ...current,
        loading: false,
        error: err instanceof Error ? err.message : "Une erreur inattendue est survenue.",
      }));
    }
  }, []);

  const handleTogglePast = useCallback(() => {
    const willOpen = !past.open;
    setPast((current) => ({ ...current, open: willOpen }));
    if (willOpen && past.events === null && !past.loading) void loadPast();
  }, [past.open, past.events, past.loading, loadPast]);

  const handleUpdate = useCallback((updated: PresenceEvent) => {
    setEvents((current) => (current ? replaceEvent(current, updated) : current));
    setPast((current) =>
      current.events ? { ...current, events: replaceEvent(current.events, updated) } : current
    );
  }, []);

  const quick = usePresenceSave(handleUpdate);

  const handleQuickAnswer = useCallback(
    async (event: PresenceEvent, status: PresenceStatus) => {
      if (event.response.status === status) return;
      const previous = event.response.status;
      setToast(null);
      // Le commentaire déjà enregistré accompagne le nouvel état, comme dans la feuille.
      const result = await quick.save(event, status, event.response.comment);
      // Si la feuille s'est ouverte entre-temps, un toast passerait sous son fond : on s'en passe.
      if (!result.ok || sheetOpenRef.current) return;
      toastCounter.current += 1;
      setToast({
        id: toastCounter.current,
        message: previous === null ? labels.quickSaved : labels.quickChanged,
        eventId: event.id,
      });
    },
    [quick, labels.quickSaved, labels.quickChanged]
  );

  const openSheet = useCallback((eventId: number, focusComment = false) => {
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lastOpenedEventId.current = eventId;
    sheetOpenRef.current = true;
    setToast(null);
    setSheet({ eventId, focusComment });
  }, []);

  const handleOpen = useCallback((eventId: number) => openSheet(eventId), [openSheet]);
  const handleAddNote = useCallback((eventId: number) => openSheet(eventId, true), [openSheet]);
  const dismissToast = useCallback(() => setToast(null), []);

  const sheetEventId = sheet?.eventId ?? null;
  const getReturnFocusTarget = useCallback((): HTMLElement | null => {
    const opener = openerRef.current;
    if (opener?.isConnected && opener.hasAttribute("data-presence-trigger")) return opener;
    const eventId = lastOpenedEventId.current;
    if (eventId === null) return null;
    return document.querySelector<HTMLElement>(`[data-presence-trigger="${eventId}"]`);
  }, []);

  // Premier chargement : aucune donnée à montrer, la page entière est un état de chargement.
  if (loading && events === null) {
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
          onClick={() => void fetchData()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  // Le serveur peut encore renvoyer la veille au soir (fuseau UTC) : ce qui est passé pour
  // l'appareil n'a ni boutons de réponse, ni colonne, ni décompte « en attente ».
  const upcoming = (events ?? []).filter((event) => !isEventPast(event.date));
  // Les prestations passées ne comptent jamais comme « en attente » : on ne peut plus agir dessus.
  const unansweredCount = upcoming.filter((event) => event.response.status === null).length;
  const authorizationsPending = upcoming.filter(needsAuthorizationAttention).length;
  const canPersonalise = currentUserId !== null;
  const showSwitch = canPersonalise && upcoming.length > 0;
  const activeView: PresenceView = canPersonalise ? view : "table";

  const sheetEvent =
    sheetEventId === null
      ? null
      : ([...upcoming, ...(past.events ?? [])].find((event) => event.id === sheetEventId) ?? null);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <div className="space-y-2">
        {/* Le téléphone affiche déjà le titre dans son bandeau : le <h1> reste pour les
            lecteurs d'écran et réapparaît dès `sm`. */}
        <h1 className="sr-only text-3xl font-bold text-foreground sm:not-sr-only">
          {labels.pageTitlePrestations}
        </h1>
        <p
          className={
            upcoming.length > 0 && unansweredCount === 0
              ? "flex items-start gap-2 sm:mt-3 rounded-xl bg-success/10 px-3 py-2.5 text-sm font-semibold text-success dark:bg-success/20"
              : upcoming.length > 0
                ? "flex items-start gap-2 sm:mt-3 rounded-xl bg-warning/10 px-3 py-2.5 text-sm font-semibold text-warning dark:bg-warning/20"
                : "text-muted-foreground sm:mt-3"
          }
        >
          {upcoming.length > 0 &&
            (unansweredCount === 0 ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />
            ) : (
              <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            ))}
          <span>
            {upcoming.length > 0
              ? unansweredCount > 0
                ? labels.pagePendingCount(unansweredCount)
                : labels.pageAllAnswered
              : labels.pageIndicateEach}
          </span>
        </p>
        {authorizationsPending > 0 && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-warning">
            <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            {labels.pageAuthorizationsPending(authorizationsPending)}
          </p>
        )}
      </div>

      {error && events !== null && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/20"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 font-medium underline-offset-2 hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer
          </button>
        </div>
      )}

      {showSwitch && (
        <PresenceViewSwitch
          view={view}
          onChange={setView}
          listLabel={labels.responsesHeading}
          tableLabel="Tableau"
        />
      )}

      {activeView === "list" ? (
        <div
          id={PRESENCE_PANEL_IDS.list}
          role={showSwitch ? "tabpanel" : undefined}
          aria-labelledby={showSwitch ? PRESENCE_TAB_IDS.list : undefined}
          aria-label={showSwitch ? undefined : labels.responsesHeading}
          className="space-y-3"
        >
          {upcoming.length === 0 && (
            <EmptyState
              icon={<Calendar className="h-10 w-10" />}
              title={labels.pageNothingToAnswer}
              description="Revenez ici dès qu'une nouvelle date sera annoncée."
            />
          )}
          <PresenceResponses
            events={upcoming}
            pending={quick.pending}
            errors={quick.errors}
            past={past}
            onOpen={handleOpen}
            onQuickAnswer={(event, status) => void handleQuickAnswer(event, status)}
            onTogglePast={handleTogglePast}
            onRetryPast={() => void loadPast()}
          />
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-10 w-10" />}
          title={labels.pageNothingToAnswer}
          description="Revenez ici dès qu'une nouvelle date sera annoncée."
        />
      ) : (
        <div
          id={PRESENCE_PANEL_IDS.table}
          role={showSwitch ? "tabpanel" : undefined}
          aria-labelledby={showSwitch ? PRESENCE_TAB_IDS.table : undefined}
        >
          <PresenceMatrix
            events={upcoming}
            currentUserId={currentUserId}
            onOpenEvent={handleOpen}
          />
        </div>
      )}

      <PresenceToast
        toast={toast}
        actionLabel={labels.toastAddNote}
        onAction={handleAddNote}
        onDismiss={dismissToast}
      />

      <PresenceSheet
        event={sheetEvent}
        currentUserId={currentUserId}
        focusComment={sheet?.focusComment ?? false}
        saver={quick}
        onClose={() => {
          sheetOpenRef.current = false;
          setSheet(null);
        }}
        onUpdate={handleUpdate}
        getReturnFocusTarget={getReturnFocusTarget}
      />
    </div>
  );
}

export function MusicianDisponibilites() {
  return (
    <MusicianChoiceGate title="Mes prestations">
      <MusicianDisponibilitesContent />
    </MusicianChoiceGate>
  );
}
