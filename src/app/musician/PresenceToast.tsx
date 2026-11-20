"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";

export interface PresenceToastData {
  /** Change à chaque réponse : relance le délai de disparition. */
  id: number;
  message: string;
  eventId: number;
}

interface PresenceToastProps {
  toast: PresenceToastData | null;
  actionLabel: string;
  onAction: (eventId: number) => void;
  onDismiss: () => void;
}

const TOAST_DURATION_MS = 8000;

/**
 * Confirmation discrète d'une réponse rapide. La zone `role="status"` reste dans la
 * page en permanence pour que les lecteurs d'écran annoncent chaque nouveau message.
 */
export function PresenceToast({ toast, actionLabel, onAction, onDismiss }: PresenceToastProps) {
  const toastId = toast?.id ?? null;

  useEffect(() => {
    if (toastId === null) return;
    const timeoutId = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [toastId, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))] z-40 flex justify-center lg:inset-x-auto lg:bottom-6 lg:right-6"
    >
      {toast && (
        <div className="pointer-events-auto flex w-full max-w-md animate-in items-center justify-between gap-3 rounded-xl bg-foreground px-3.5 py-2.5 text-sm font-semibold text-background shadow-lg fade-in-0 slide-in-from-bottom-2">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" strokeWidth={3} aria-hidden="true" />
            {toast.message}
          </span>
          <button
            type="button"
            onClick={() => onAction(toast.eventId)}
            className="min-h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-md px-1 font-bold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
