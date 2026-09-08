"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock,
  Lock,
  Loader2,
  MapPin,
  MessageSquare,
  Undo2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/app/components/ui/card";
import { Textarea } from "@/app/components/ui/textarea";
import type { PresenceStatus } from "@/db/types";
import { formatDateFrench, isEventPast } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { getDeadlineTone } from "./presence-deadline";
import type { PresenceEvent } from "./musician-types";
import { StatusPill } from "./StatusPill";

export type { PresenceEvent, PresenceRosterEntry } from "./musician-types";

export interface PresenceCardProps {
  event: PresenceEvent;
  onUpdate: (event: PresenceEvent) => void;
  /** Une réponse (présent/absent) vient d'être enregistrée avec succès, ou effacée. */
  onStatusChanged: (eventId: number, status: PresenceStatus | null) => void;
}

/** `null` représente l'action "effacer" ; `null` "tout court" (pas d'action en cours)
 * est représenté par `pendingAction === null`, d'où ce type dédié plutôt que de
 * réutiliser `PresenceStatus | null` pour les deux sens à la fois. */
type PendingAction = "present" | "absent" | "clear";

export function PresenceCard({
  event,
  onUpdate,
  onStatusChanged,
}: PresenceCardProps) {
  const [comment, setComment] = useState(event.response.comment ?? "");
  const [commentOpen, setCommentOpen] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [lastSavedAction, setLastSavedAction] = useState<PendingAction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Une réponse présent/absent fait disparaître la carte sur-le-champ, ce badge
  // n'a donc pas le temps de s'y afficher. Il ne subsiste que pour les
  // enregistrements qui laissent la carte en place — commentaire seul, ou
  // effacement de la réponse — où il doit finir par s'effacer plutôt que de
  // rester figé indéfiniment.
  useEffect(() => {
    if (saveState !== "saved") return;
    const timeoutId = window.setTimeout(() => setSaveState("idle"), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [saveState]);

  const status = event.response.status;
  const answered = status !== null;
  // Le serveur refuse toute réponse pour une prestation passée (400) : on ne propose
  // donc jamais les contrôles interactifs pour ces dates, plutôt que de laisser
  // l'utilisateur essayer pour échouer.
  const isPast = isEventPast(event.date);
  const deadlineInfo = isPast
    ? { label: "Prestation passée : réponses closes", tone: "muted" as const }
    : getDeadlineTone(event.response_deadline, answered);

  const submit = useCallback(
    async (newStatus: PresenceStatus | null) => {
      const action: PendingAction =
        newStatus === "present" ? "present" : newStatus === "absent" ? "absent" : "clear";
      setPendingAction(action);
      setSaveState("idle");
      setErrorMessage(null);
      try {
        const response = await fetch("/api/musician/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event.id,
            status: newStatus,
            comment: newStatus === null ? null : comment.trim() || null,
          }),
        });
        const data = (await response.json()) as {
          success?: boolean;
          event?: PresenceEvent;
          error?: string;
        };
        if (!response.ok || !data.success || !data.event) {
          throw new Error(data.error || "La réponse n'a pas pu être enregistrée.");
        }
        // Reconciliation à partir de la réponse serveur uniquement : effacer une
        // réponse supprime aussi le commentaire côté base (contrainte NOT NULL sur
        // `status`, implémentée par une suppression de ligne), donc toute valeur
        // locale supposée ici — au lieu de relire `data.event` — laisserait le
        // commentaire affiché dans le textarea alors qu'il n'existe plus, prêt à
        // être ré-enregistré en silence à la prochaine réponse.
        setComment(data.event.response.comment ?? "");
        setConfirmingClear(false);
        onUpdate(data.event);
        setSaveState("saved");
        setLastSavedAction(action);
        if (status !== newStatus) onStatusChanged(event.id, newStatus);
      } catch (err) {
        setSaveState("error");
        setErrorMessage(
          err instanceof Error ? err.message : "La réponse n'a pas pu être enregistrée."
        );
      } finally {
        setPendingAction(null);
      }
    },
    [comment, event.id, onStatusChanged, onUpdate]
  );

  const commentDirty = comment.trim() !== (event.response.comment ?? "").trim();

  const statusActions = (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => submit("present")}
        disabled={isPast || pendingAction !== null}
        aria-pressed={status === "present"}
        className={cn(
          "flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70",
          status === "present"
            ? "border-success bg-success text-success-foreground shadow-sm"
            : "border-border bg-card text-foreground hover:border-success hover:bg-success/10 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-success/20 disabled:hover:border-border disabled:hover:bg-card dark:disabled:hover:border-border dark:disabled:hover:bg-card"
        )}
      >
        {pendingAction === "present" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        Présent
      </button>
      <button
        type="button"
        onClick={() => submit("absent")}
        disabled={isPast || pendingAction !== null}
        aria-pressed={status === "absent"}
        className={cn(
          "flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70",
          status === "absent"
            ? "border-destructive bg-destructive text-destructive-foreground shadow-sm"
            : "border-border bg-card text-foreground hover:border-destructive hover:bg-destructive/10 dark:border-border dark:bg-card dark:text-foreground dark:hover:bg-destructive/20 disabled:hover:border-border disabled:hover:bg-card dark:disabled:hover:border-border dark:disabled:hover:bg-card"
        )}
      >
        {pendingAction === "absent" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
        Absent
      </button>
    </div>
  );

  const saveMessage = (
    <div className="mt-2 min-h-[18px]">
      {isPast ? (
        <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Prestation passée : les réponses ne sont plus modifiables.
        </p>
      ) : (
        <>
          {saveState === "saved" && (
            <p className="flex items-center gap-1 text-xs font-medium text-success">
              <Check className="h-3.5 w-3.5" />
              {lastSavedAction === "clear" ? "Réponse effacée" : "Réponse enregistrée"}
            </p>
          )}
          {saveState === "error" && (
            <p className="flex items-center gap-1 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {errorMessage}
            </p>
          )}
        </>
      )}
    </div>
  );

  return (
    <Card
      className={cn(
        "flex flex-col overflow-hidden border-l-4 transition-colors",
        !answered && deadlineInfo.tone === "danger"
          ? "border-l-destructive bg-destructive/5 dark:bg-destructive/10"
          : !answered
            ? "border-l-warning bg-warning/5 dark:bg-warning/10"
            : "border-l-border dark:border-l-border"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-bold leading-tight text-foreground">
              {event.title}
            </h2>
            <p className="mt-1 text-sm capitalize text-muted-foreground">
              {formatDateFrench(event.date)}
              {event.time && <> · {event.time}</>}
            </p>
          </div>
          <StatusPill status={status} />
        </div>

        {(event.location || event.address) && (
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {event.location}
              {event.location && event.address && " — "}
              {event.address}
            </span>
          </p>
        )}

        <p
          className={cn(
            "mt-2 inline-flex w-fit items-center gap-1.5 text-xs font-medium",
            deadlineInfo.tone === "danger"
              ? "text-destructive"
              : deadlineInfo.tone === "warning"
                ? "text-warning"
                : "text-muted-foreground"
          )}
        >
          <Clock className="h-3.5 w-3.5" />
          {deadlineInfo.label}
        </p>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col pt-0">
        {statusActions}

        {/* Action rare et corrective : délibérément discrète (texte muted, pas de
            bordure ni de couleur pleine) pour ne jamais rivaliser visuellement avec
            Présent/Absent. N'existe que s'il y a effectivement une réponse à effacer. */}
        {answered && !isPast && (
          <div className="mt-2">
            {confirmingClear ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 px-2.5 py-2 text-xs text-warning dark:border-warning/40 dark:bg-warning/20 dark:text-warning">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Votre commentaire sera aussi supprimé.</span>
                <div className="ml-auto flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(false)}
                    className="cursor-pointer font-medium underline-offset-2 hover:underline"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => submit(null)}
                    disabled={pendingAction !== null}
                    className="cursor-pointer font-semibold text-destructive underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {pendingAction === "clear" ? "Suppression…" : "Confirmer"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (event.response.comment ? setConfirmingClear(true) : submit(null))}
                disabled={pendingAction !== null}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Undo2 className="h-3 w-3" aria-hidden="true" />
                Effacer ma réponse
              </button>
            )}
          </div>
        )}

        {saveMessage}

        {/* Une prestation passée n'accepte plus aucune écriture (commentaire compris) : on
            n'affiche donc jamais le formulaire d'édition, seulement le commentaire déjà
            enregistré s'il y en a un. */}
        {isPast ? (
          event.response.comment && (
            <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{event.response.comment}</span>
            </p>
          )
        ) : (
          <div className="mt-1">
            <button
              type="button"
              onClick={() => setCommentOpen((open) => !open)}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground dark:hover:text-foreground"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {event.response.comment ? "Modifier mon commentaire" : "Ajouter un commentaire"}
              <ChevronDown
                className={cn("h-3 w-3 transition-transform", commentOpen && "rotate-180")}
              />
            </button>

            {commentOpen && (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                  maxLength={1000}
                  placeholder="Un mot pour l'équipe (facultatif)"
                  className="min-h-[80px] text-sm"
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">{comment.length}/1000</span>
                  {answered ? (
                    <button
                      type="button"
                      onClick={() => submit(status)}
                      disabled={pendingAction !== null || !commentDirty}
                      className="inline-flex h-8 cursor-pointer items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm transition-colors transition-transform duration-150 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary active:scale-[0.97] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Enregistrer le commentaire
                    </button>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">
                      Envoyé avec votre réponse
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
