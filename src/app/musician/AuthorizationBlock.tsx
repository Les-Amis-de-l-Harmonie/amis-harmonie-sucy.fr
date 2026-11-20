"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import { useActingLabels } from "./acting-labels";
import { useMusicianSession } from "./MusicianSession";
import type { PresenceAuthorization } from "./musician-types";

interface AuthorizationBlockProps {
  eventId: number;
  authorization: PresenceAuthorization;
  /** Appelé avec l'autorisation à jour renvoyée par le serveur, pour rafraîchir la carte. */
  onAuthorizationChange: (authorization: PresenceAuthorization | null) => void;
}

/** « 12 novembre 2026 » à partir d'une date SQL ; `null` si elle est illisible. */
function formatAuthorizedDate(value: string | null): string | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

type PendingAction = "authorize" | "withdraw";

/**
 * Autorisation parentale demandée pour une sortie : texte de l'association, état
 * actuel et — pour un responsable qui agit pour l'enfant — les actions. Le jeune
 * lui-même ne peut que consulter ; il voit qu'il attend ses parents.
 */
export function AuthorizationBlock({
  eventId,
  authorization,
  onAuthorizationChange,
}: AuthorizationBlockProps) {
  const labels = useActingLabels();
  const { delegated } = useMusicianSession();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authorized = authorization.status === "authorized";
  const missing = !authorized;
  const dateLabel = formatAuthorizedDate(authorization.authorizedAt);

  async function send(authorize: boolean) {
    setPending(authorize ? "authorize" : "withdraw");
    setError(null);
    try {
      const response = await fetch("/api/musician/authorizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, authorize }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        authorization?: PresenceAuthorization | null;
        error?: string;
      };
      if (!response.ok || !data.success) {
        throw new Error(data.error || "L'autorisation n'a pas pu être enregistrée.");
      }
      onAuthorizationChange(data.authorization ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "L'autorisation n'a pas pu être enregistrée.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section
      aria-label={labels.authTitle}
      className={cn(
        "rounded-lg border p-3 text-sm",
        missing ? "border-warning/40 bg-warning/5" : "border-border bg-muted/40"
      )}
    >
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {labels.authTitle}
      </h3>

      {authorization.details && (
        <p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">
          {authorization.details}
        </p>
      )}

      <p
        className={cn(
          "mt-2 flex items-start gap-1.5 font-medium",
          authorized && !authorization.outdated ? "text-success" : "text-warning"
        )}
      >
        {authorized && !authorization.outdated ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span>
          {authorized
            ? labels.authAuthorizedBy(authorization.authorizedBy, dateLabel)
            : labels.authMissing}
        </span>
      </p>

      {authorized && authorization.outdated && (
        <p
          role="alert"
          className="mt-2 flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-2 text-xs font-medium text-warning"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {labels.authOutdated}
        </p>
      )}

      {missing && !delegated && !authorization.canAuthorize && (
        <p className="mt-1 text-xs text-muted-foreground">{labels.authWaitingParents}</p>
      )}

      {authorization.canAuthorize && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {(missing || authorization.outdated) && (
            <Button
              type="button"
              onClick={() => void send(true)}
              disabled={pending !== null}
              className="h-11 w-full whitespace-normal sm:h-9 sm:w-auto"
            >
              {pending === "authorize" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {labels.authAuthorize}
            </Button>
          )}
          {authorized && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void send(false)}
              disabled={pending !== null}
              className="h-11 w-full whitespace-normal sm:h-9 sm:w-auto"
            >
              {pending === "withdraw" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {authorization.authorizedBy?.byYou
                ? labels.authWithdrawMine
                : labels.authWithdrawOther}
            </Button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
