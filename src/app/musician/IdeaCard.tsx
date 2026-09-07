"use client";

import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Heart, Globe, Loader2, Lock, MessageCircle, Trash2 } from "lucide-react";
import type { IdeaWithLikes } from "@/db/types";
import { CATEGORY_LABELS, formatIdeaDate } from "./idea-filters";

type IdeaCardProps =
  | {
      mode: "mine";
      idea: IdeaWithLikes;
      onDelete: (idea: IdeaWithLikes) => void;
      onViewResponse: (idea: IdeaWithLikes) => void;
    }
  | {
      mode: "public";
      idea: IdeaWithLikes;
      expanded: boolean;
      liking: boolean;
      onLike: (idea: IdeaWithLikes) => void;
      onToggleExpanded: (ideaId: number) => void;
      onViewResponse: (idea: IdeaWithLikes) => void;
      onViewLikers: (idea: IdeaWithLikes) => void;
    };

export function IdeaCard(props: IdeaCardProps) {
  const { idea, mode } = props;
  if (mode === "mine") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <CardTitle className="text-lg">{idea.title}</CardTitle>
                {idea.is_public === 1 ? (
                  <Badge variant="primary">
                    <Globe className="h-3 w-3" />
                    Publique
                  </Badge>
                ) : (
                  <Badge variant="muted">
                    <Lock className="h-3 w-3" />
                    Privée
                  </Badge>
                )}
              </div>
              <CardDescription>
                {CATEGORY_LABELS[idea.category]} • {formatIdeaDate(idea.created_at)}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => props.onDelete(idea)}
              aria-label="Supprimer l'idée"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 whitespace-pre-wrap text-sm text-muted-foreground">
            {idea.description}
          </p>
          {idea.is_public === 1 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4 text-destructive" />
              <span>
                {idea.likes_count || 0} like{idea.likes_count !== 1 ? "s" : ""}
              </span>
            </div>
          )}
          {idea.admin_notes && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => props.onViewResponse(idea)}
                className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary hover:text-primary/80"
              >
                <MessageCircle className="h-4 w-4" />
                Voir la réponse du bureau
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex h-full flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-bold leading-tight text-foreground">
            {idea.title}
          </CardTitle>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {CATEGORY_LABELS[idea.category]} •{" "}
          {idea.author_first_name && idea.author_last_name
            ? `${idea.author_first_name} ${idea.author_last_name}`
            : "Un musicien"}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex-1">
          <p
            className={`whitespace-pre-wrap text-sm text-foreground ${props.expanded ? "" : "line-clamp-4"}`}
          >
            {idea.description}
          </p>
          {idea.description.length > 150 && (
            <button
              type="button"
              onClick={() => props.onToggleExpanded(idea.id)}
              className="mt-2 cursor-pointer text-xs font-medium text-primary hover:text-primary/80"
            >
              {props.expanded ? "Voir moins" : "Lire la suite"}
            </button>
          )}
          {idea.admin_notes && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => props.onViewResponse(idea)}
                className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-primary hover:text-primary/80"
              >
                <MessageCircle className="h-3 w-3" />
                Réponse du bureau
              </button>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">{formatIdeaDate(idea.created_at)}</span>
          <div className="flex items-center gap-2">
            {(idea.likes_count || 0) > 0 && (
              <button
                type="button"
                onClick={() => props.onViewLikers(idea)}
                className="cursor-pointer text-xs text-muted-foreground underline hover:text-primary"
              >
                Qui a liké ?
              </button>
            )}
            <Button
              type="button"
              variant={idea.user_has_liked ? "destructive" : "outline"}
              size="sm"
              onClick={() => props.onLike(idea)}
              disabled={props.liking}
              className="h-8 px-2"
            >
              {props.liking ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Heart
                  className={`mr-1 h-4 w-4 ${idea.user_has_liked ? "fill-destructive-foreground" : "text-destructive"}`}
                />
              )}
              <span className="text-xs">{idea.likes_count || 0}</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
