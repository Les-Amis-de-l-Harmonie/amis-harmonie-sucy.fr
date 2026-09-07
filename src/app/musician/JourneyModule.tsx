"use client";

import { CheckCircle2, ChevronRight, Circle } from "lucide-react";
import { Progress } from "@/app/components/ui/progress";
import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { buildProfileJourney } from "./profile-journey";
import type { ProfileWithExtras, UpcomingEvent } from "./musician-types";

interface JourneyModuleProps {
  loading: boolean;
  profile: ProfileWithExtras | null;
  planningUrgent: boolean;
  urgentEvent: UpcomingEvent | null;
  pendingCount: number;
}

/**
 * Remplace `EssentialsZone` + la grille de 10 cartes (Phase 2b) : un parcours
 * chiffré à quatre étapes (profil → adhésion → assurance → présence) plutôt
 * qu'un empilement de bandeaux d'alerte et de cartes verrouillées. Chaque
 * étape reste cliquable quel que soit son état — voir `profile-journey.ts`.
 */
export function JourneyModule({
  loading,
  profile,
  planningUrgent,
  urgentEvent,
  pendingCount,
}: JourneyModuleProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6" aria-hidden="true">
        <Skeleton className="mb-1 h-5 w-48" />
        <Skeleton className="mb-4 h-4 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const steps = buildProfileJourney(profile, planningUrgent, urgentEvent, pendingCount);
  const doneCount = steps.filter((step) => step.status === "done").length;
  const allDone = doneCount === steps.length;

  return (
    <section
      aria-labelledby="journey-heading"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="journey-heading" className="font-heading text-lg font-bold text-foreground">
            Votre progression
          </h2>
          <p className="text-sm text-muted-foreground">
            {allDone
              ? "Tout est en ordre : profil, adhésion, assurance et présences à jour."
              : `${doneCount} étape${doneCount > 1 ? "s" : ""} sur ${steps.length} en ordre.`}
          </p>
        </div>
        <Progress
          value={doneCount}
          max={steps.length}
          aria-label={`Progression du parcours, ${doneCount} étape${
            doneCount > 1 ? "s" : ""
          } sur ${steps.length}`}
          className="w-full max-w-[12rem] sm:w-40"
        />
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step.key}>
            <a
              href={step.href}
              className={cn(
                "group flex h-full min-h-[8rem] flex-col gap-2 rounded-lg border p-4 transition-colors",
                step.status === "done"
                  ? "border-success/30 bg-success/5 hover:bg-success/10"
                  : "border-warning/30 bg-warning/5 hover:bg-warning/10"
              )}
            >
              <div className="flex items-center gap-2">
                {step.status === "done" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                )}
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Étape {index + 1}
                </span>
              </div>
              <p className="font-semibold text-foreground">{step.title}</p>
              <p className="flex-1 text-sm text-muted-foreground">{step.detail}</p>
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-sm font-medium",
                  step.status === "done" ? "text-success" : "text-warning"
                )}
              >
                {step.cta}
                <ChevronRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:group-hover:translate-x-0"
                  aria-hidden="true"
                />
              </span>
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
