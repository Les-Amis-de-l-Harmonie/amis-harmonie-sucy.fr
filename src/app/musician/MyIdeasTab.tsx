"use client";

import { Button } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Lightbulb, Send } from "lucide-react";
import type { IdeaWithLikes } from "@/db/types";
import { IdeaCard } from "./IdeaCard";

interface MyIdeasTabProps {
  ideas: IdeaWithLikes[];
  onOpenComposer: () => void;
  onDelete: (idea: IdeaWithLikes) => void;
  onViewResponse: (idea: IdeaWithLikes) => void;
}

export function MyIdeasTab({ ideas, onOpenComposer, onDelete, onViewResponse }: MyIdeasTabProps) {
  if (ideas.length === 0) {
    return (
      <EmptyState
        icon={<Lightbulb className="h-12 w-12" />}
        title="Vous n'avez pas encore soumis d'idée"
        description="Partagez vos idées pour faire évoluer l'association ou enrichir la vie de l'orchestre."
        action={
          <Button type="button" onClick={onOpenComposer} className="gap-2">
            <Send className="h-4 w-4" />
            Soumettre une idée
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Mes idées soumises</h2>
      {ideas.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
          mode="mine"
          onDelete={onDelete}
          onViewResponse={onViewResponse}
        />
      ))}
    </div>
  );
}
