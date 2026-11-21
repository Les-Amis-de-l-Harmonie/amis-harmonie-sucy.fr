"use client";

import { ExternalLink, FileSpreadsheet } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { PRESENCE_SHEET_URL } from "@/lib/presence-beta";
import { cn } from "@/lib/utils";
import { useActingLabels } from "./acting-labels";

/** Bouton vers le fichier des présences : nouvel onglet, sans transmettre `opener`. */
export function PresenceSheetButton({
  className,
  size = "default",
  variant = "default",
}: {
  className?: string;
  size?: "default" | "sm" | "lg";
  variant?: "default" | "outline";
}) {
  const labels = useActingLabels();
  return (
    <Button asChild size={size} variant={variant} className={className}>
      <a href={PRESENCE_SHEET_URL} target="_blank" rel="noopener noreferrer">
        {labels.presenceSheetButton}
        <ExternalLink className="ml-2 h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
      </a>
    </Button>
  );
}

/**
 * Pendant la bêta des réponses en ligne, la plupart des comptes continuent de répondre
 * dans le fichier des présences. Ce bloc le dit clairement et donne le lien ; il remplace
 * tout ce qui permettrait de répondre sur le site.
 */
export function PresenceLockedNotice({ className }: { className?: string }) {
  const labels = useActingLabels();
  return (
    <section
      aria-labelledby="presence-locked-title"
      className={cn("rounded-xl border border-primary/30 bg-primary/10 p-5 sm:p-6", className)}
    >
      <div className="flex items-start gap-3">
        <FileSpreadsheet className="mt-0.5 h-6 w-6 shrink-0 text-foreground" aria-hidden="true" />
        <div className="min-w-0 space-y-2">
          <h2
            id="presence-locked-title"
            className="font-heading text-lg font-bold leading-snug text-foreground"
          >
            {labels.presenceLockedTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{labels.presenceLockedText}</p>
        </div>
      </div>
      <PresenceSheetButton className="mt-4 h-11 w-full whitespace-normal sm:w-auto" />
    </section>
  );
}
