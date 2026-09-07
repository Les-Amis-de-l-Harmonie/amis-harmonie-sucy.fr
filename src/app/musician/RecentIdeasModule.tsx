import { Heart } from "lucide-react";
import { Skeleton } from "@/app/components/ui/skeleton";
import { CATEGORY_LABELS, formatIdeaDate } from "./idea-filters";
import type { IdeaPreview } from "./musician-types";

interface RecentIdeasModuleProps {
  loading: boolean;
  ideas: IdeaPreview[];
}

/**
 * Remplace `IdeaBoxCard` (simple lien verrouillé) par un aperçu du mur
 * public : les dernières idées, avec leur auteur (Phase 2b, piège de
 * cohérence n°2 — voir le rapport). Bande défilante pilotée par
 * l'utilisateur (`snap-x`, `overflow-x-auto`, `tabIndex`) — jamais
 * d'auto-scroll, voir la direction Phase 2b sur WCAG 2.2.2.
 *
 * N'affiche jamais `unreadIdeasCount` ici (piège de cohérence n°1) : ce
 * compteur porte sur les idées **des autres** non lues, alors que cette
 * liste inclut aussi les idées du lecteur lui-même — les deux nombres ne
 * coïncident pas.
 */
export function RecentIdeasModule({ loading, ideas }: RecentIdeasModuleProps) {
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
            <Skeleton key={i} className="h-44 w-72 shrink-0 rounded-lg" />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune idée publique pour le moment.</p>
      ) : (
        <ul
          tabIndex={0}
          aria-label="Idées récentes, défilement horizontal"
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {ideas.map((idea) => (
            <li
              key={idea.id}
              className="flex w-72 shrink-0 snap-center flex-col rounded-lg border border-border bg-background p-4"
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
          ))}
        </ul>
      )}
    </section>
  );
}
