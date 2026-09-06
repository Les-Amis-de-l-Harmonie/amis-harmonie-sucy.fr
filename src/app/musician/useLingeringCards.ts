"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PresenceStatus } from "./PresenceCard";

const LINGER_DELAY_MS = 3000;

export function useLingeringCards() {
  const [lingeringIds, setLingeringIds] = useState<Set<number>>(new Set());
  const lingerTimersRef = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const timers = lingerTimersRef.current;
    return () => {
      timers.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timers.clear();
    };
  }, []);

  /** Démarre (ou relance) le délai de 3 s avant que la carte ne quitte la liste. */
  const armLinger = useCallback((eventId: number) => {
    const timers = lingerTimersRef.current;
    const existing = timers.get(eventId);
    if (existing !== undefined) window.clearTimeout(existing);
    const timeoutId = window.setTimeout(() => {
      timers.delete(eventId);
      setLingeringIds((prev) => {
        if (!prev.has(eventId)) return prev;
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }, LINGER_DELAY_MS);
    timers.set(eventId, timeoutId);
  }, []);

  /** Annule le délai en cours pour cette carte, sans toucher aux autres. */
  const cancelLinger = useCallback((eventId: number) => {
    const timers = lingerTimersRef.current;
    const existing = timers.get(eventId);
    if (existing !== undefined) {
      window.clearTimeout(existing);
      timers.delete(eventId);
    }
  }, []);

  const handleStatusChanged = useCallback(
    (eventId: number, status: PresenceStatus | null) => {
      if (status === null) {
        // Réponse effacée : plus rien à laisser en sursis pour cette carte, elle
        // reste visible de toute façon puisqu'elle redevient "sans réponse".
        cancelLinger(eventId);
        setLingeringIds((prev) => {
          if (!prev.has(eventId)) return prev;
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
        return;
      }
      setLingeringIds((prev) => (prev.has(eventId) ? prev : new Set(prev).add(eventId)));
    },
    [cancelLinger]
  );

  return { lingeringIds, armLinger, cancelLinger, handleStatusChanged };
}
