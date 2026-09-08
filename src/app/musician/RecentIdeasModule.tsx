"use client";

import { useMemo } from "react";
import type { ComponentRef } from "react";
import { useReducedMotion } from "framer-motion";
import { Heart } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CATEGORY_LABELS, formatIdeaDate } from "./idea-filters";
import { useAutoScrollLoop } from "./useAutoScrollLoop";
import type { IdeaPreview } from "./musician-types";

interface RecentIdeasModuleProps {
  loading: boolean;
  ideas: IdeaPreview[];
}

/**
 * En dessous de ce nombre, la bande ne déborde presque jamais sur un écran
 * courant : dupliquer la liste et l'animer serait inutile, voire ridicule
 * (deux ou trois cartes qui tiennent déjà entièrement à l'écran, bouclant
 * sur elles-mêmes). Le défilement automatique reste alors désactivé et la
 * bande se comporte comme une simple liste défilable au clavier/à la souris.
 */
const MIN_IDEAS_TO_LOOP = 4;

/**
 * Remplace `IdeaBoxCard` (simple lien verrouillé) par un aperçu du mur
 * public : les dernières idées, avec leur auteur (Phase 2b, piège de
 * cohérence n°2 — voir le rapport).
 *
 * Bande défilante en boucle continue, lente, de type bandeau ambiant — une
 * demande explicite qui revient sur l'interdiction posée en Phase 2b.
 * Conformité WCAG 2.2.2 ("Pause, Stop, Hide") assurée par
 * `useAutoScrollLoop` : le mouvement s'arrête au survol de la bande, au
 * focus clavier (la bande reste un `<ul>` focusable, `tabIndex=0`), et
 * pendant toute interaction manuelle (molette, glisser, tactile) — voir ce
 * hook pour le détail. `prefers-reduced-motion` coupe l'animation
 * entièrement via `useReducedMotion` (comme dans `MusicianHome.tsx`), et la
 * bande n'est jamais dupliquée/animée s'il y a trop peu d'idées pour que la
 * boucle ait un sens (`MIN_IDEAS_TO_LOOP`). Techniquement, la boucle avance
 * `scrollLeft` (pas de transform CSS) : le défilement automatique et le
 * défilement natif de l'utilisateur partagent le même mécanisme et ne se
 * battent donc jamais l'un contre l'autre — d'où aussi l'abandon du
 * scroll-snap pendant que la boucle tourne, pour ne pas ressaisir la
 * position à chaque frame.
 *
 * N'affiche jamais `unreadIdeasCount` ici (piège de cohérence n°1) : ce
 * compteur porte sur les idées **des autres** non lues, alors que cette
 * liste inclut aussi les idées du lecteur lui-même — les deux nombres ne
 * coïncident pas.
 */
export function RecentIdeasModule({ loading, ideas }: RecentIdeasModuleProps) {
  const shouldReduceMotion = useReducedMotion();
  const shouldLoop = !shouldReduceMotion && ideas.length >= MIN_IDEAS_TO_LOOP;

  const { ref, pause, resume } = useAutoScrollLoop<ComponentRef<"ul">>({
    disabled: !shouldLoop,
    speed: 20,
  });

  // Clone dupliqué à la suite pour un rebouclage sans coupure : masqué aux
  // technologies d'assistance (voir `aria-hidden` posé sur chaque clone
  // ci-dessous), donc jamais annoncé deux fois.
  const displayedIdeas = useMemo(
    () => (shouldLoop ? [...ideas, ...ideas] : ideas),
    [shouldLoop, ideas]
  );

  return (
    <section
      aria-labelledby="ideas-heading"
      className="rounded-xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 id="ideas-heading" className="font-heading text-lg font-bold text-foreground">
            Dernières idées du mur
          </h3>
          <p className="text-sm text-muted-foreground">
            Propositions publiques partagées par les musiciens.
          </p>
        </div>
        <a
          href="/musician/idee"
          className="shrink-0 text-sm font-medium text-primary hover:text-primary/80"
        >
          Voir la boîte à idées
        </a>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-60 w-72 shrink-0 rounded-lg" />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune idée publique pour le moment.</p>
      ) : (
        <ul
          ref={ref}
          tabIndex={0}
          aria-label="Idées récentes, défilement horizontal"
          onMouseEnter={() => pause("hover")}
          onMouseLeave={() => resume("hover")}
          onFocus={() => pause("focus")}
          onBlur={() => resume("focus")}
          className={cn(
            "flex gap-4 overflow-x-auto pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "[mask-image:linear-gradient(to_right,transparent,black_1.5rem,black_calc(100%-1.5rem),transparent)]",
            !shouldLoop && "snap-x snap-mandatory"
          )}
        >
          {displayedIdeas.map((idea, index) => {
            const isClone = shouldLoop && index >= ideas.length;
            return (
              <li
                key={isClone ? `clone-${idea.id}` : idea.id}
                aria-hidden={isClone || undefined}
                className={cn(
                  "flex h-60 w-72 shrink-0 flex-col rounded-lg border border-border bg-background p-4",
                  !shouldLoop && "snap-center"
                )}
              >
                <p className="mb-1 text-xs font-medium text-primary">
                  {CATEGORY_LABELS[idea.category]}
                </p>
                <p className="mb-1 font-semibold leading-tight text-foreground line-clamp-2">
                  {idea.title}
                </p>
                <p className="mb-3 flex-1 line-clamp-3 text-sm text-muted-foreground">
                  {idea.description}
                </p>
                <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                  <span className="truncate">{idea.author_first_name ?? "Un musicien"}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                    {idea.likes_count}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatIdeaDate(idea.created_at)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
