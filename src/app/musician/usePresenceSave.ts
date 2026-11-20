"use client";

import { useCallback, useState } from "react";
import type { PresenceStatus } from "@/db/types";
import type { PresenceEvent } from "./musician-types";

/** `clear` est l'action « effacer ma réponse » ; `comment` enregistre un mot sans changer l'état. */
export type PresenceSaveAction = "present" | "absent" | "clear" | "comment";

export type PresenceSaveResult = { ok: true; event: PresenceEvent } | { ok: false; error: string };

const DEFAULT_ERROR = "La réponse n'a pas pu être enregistrée.";

interface PresenceSaveResponse {
  success?: boolean;
  event?: PresenceEvent;
  error?: string;
}

/**
 * Enregistrement d'une réponse de présence, partagé par les boutons rapides de la
 * liste et par la feuille de détail. L'état de l'événement est toujours réconcilié
 * à partir de la réponse du serveur : effacer une réponse supprime aussi le
 * commentaire en base, donc toute valeur supposée localement laisserait un
 * commentaire fantôme prêt à être ré-enregistré en silence.
 */
export function usePresenceSave(onUpdate: (event: PresenceEvent) => void) {
  const [pending, setPending] = useState<Record<number, PresenceSaveAction>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});

  const clearError = useCallback((eventId: number) => {
    setErrors((current) => {
      if (!(eventId in current)) return current;
      const { [eventId]: _removed, ...rest } = current;
      return rest;
    });
  }, []);

  const save = useCallback(
    async (
      event: PresenceEvent,
      status: PresenceStatus | null,
      comment: string | null,
      action?: PresenceSaveAction
    ): Promise<PresenceSaveResult> => {
      const effectiveAction: PresenceSaveAction =
        action ?? (status === "present" ? "present" : status === "absent" ? "absent" : "clear");
      setPending((current) => ({ ...current, [event.id]: effectiveAction }));
      clearError(event.id);
      try {
        const response = await fetch("/api/musician/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event.id,
            status,
            comment: status === null ? null : comment?.trim() || null,
          }),
        });
        const data = (await response.json()) as PresenceSaveResponse;
        if (!response.ok || !data.success || !data.event) {
          throw new Error(data.error || DEFAULT_ERROR);
        }
        // La réponse de présence n'embarque pas forcément l'autorisation : on garde
        // celle de l'événement plutôt que de la faire disparaître jusqu'au prochain chargement.
        const reconciled: PresenceEvent =
          "authorization" in data.event
            ? data.event
            : { ...data.event, authorization: event.authorization };
        onUpdate(reconciled);
        return { ok: true, event: reconciled };
      } catch (err) {
        const message = err instanceof Error ? err.message : DEFAULT_ERROR;
        setErrors((current) => ({ ...current, [event.id]: message }));
        return { ok: false, error: message };
      } finally {
        setPending((current) => {
          const { [event.id]: _done, ...rest } = current;
          return rest;
        });
      }
    },
    [clearError, onUpdate]
  );

  return { pending, errors, save, clearError };
}

/** Ce dont la feuille de détail a besoin : une seule instance du hook, détenue par la page. */
export type PresenceSaver = Pick<ReturnType<typeof usePresenceSave>, "pending" | "errors" | "save">;
