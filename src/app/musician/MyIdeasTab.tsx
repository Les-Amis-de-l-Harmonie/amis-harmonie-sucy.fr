"use client";

import { Button } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Lightbulb, Send } from "lucide-react";
import type { IdeaWithLikes } from "@/db/types";
import { getActingLabels } from "./acting-labels";
import { IdeaCard } from "./IdeaCard";

interface MyIdeasTabProps {
  ideas: IdeaWithLikes[];
  onOpenComposer: () => void;
  onEdit: (idea: IdeaWithLikes) => void;
  onDelete: (idea: IdeaWithLikes) => void;
  onViewResponse: (idea: IdeaWithLikes) => void;
  /** Responsable qui agit pour un enfant : lecture seule. */
  readOnly?: boolean;
  /** Prénom du musicien pour qui l'on agit (titre à la 3e personne). */
  actingForName?: string | null;
}

export function MyIdeasTab({
  ideas,
  onOpenComposer,
  onEdit,
  onDelete,
  onViewResponse,
  readOnly = false,
  actingForName = null,
}: MyIdeasTabProps) {
  const labels = getActingLabels(readOnly ? actingForName : null);
  if (ideas.length === 0) {
    return (
      <EmptyState
        icon={<Lightbulb className="h-12 w-12" />}
        title={readOnly ? "Aucune idée soumise" : "Vous n'avez pas encore soumis d'idée"}
        description={
          readOnly
            ? "Ce musicien n'a pas encore soumis d'idée."
            : "Partagez vos idées pour faire évoluer l'association ou enrichir la vie de l'harmonie."
        }
        action={
          readOnly ? undefined : (
            <Button type="button" onClick={onOpenComposer} className="gap-2">
              <Send className="h-4 w-4" />
              Soumettre une idée
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">{labels.myIdeasHeading}</h2>
      {ideas.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          mode="mine"
          onEdit={onEdit}
          onDelete={onDelete}
          onViewResponse={onViewResponse}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}
