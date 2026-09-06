"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Send, Users } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ListSkeleton } from "@/app/components/ui/skeleton";
import type { IdeaWithLikes } from "@/db/types";
import { DeleteIdeaDialog } from "./DeleteIdeaDialog";
import { IdeaComposerDialog } from "./IdeaComposerDialog";
import { IdeaLikersDialog } from "./IdeaLikersDialog";
import { IdeaResponseDialog } from "./IdeaResponseDialog";
import { MyIdeasTab } from "./MyIdeasTab";
import { PublicWallTab } from "./PublicWallTab";
import type { IdeaFilterCategory, IdeaSortOption } from "./idea-filters";

type IdeaTab = "my-ideas" | "public-wall";

export function MusicianIdeeClient() {
  const [myIdeas, setMyIdeas] = useState<IdeaWithLikes[]>([]);
  const [publicIdeas, setPublicIdeas] = useState<IdeaWithLikes[]>([]);
  const [activeTab, setActiveTab] = useState<IdeaTab>("my-ideas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [likingId, setLikingId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<IdeaFilterCategory>("all");
  const [sortBy, setSortBy] = useState<IdeaSortOption>("newest");
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<number>>(new Set());
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [viewingResponse, setViewingResponse] = useState<IdeaWithLikes | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState<IdeaWithLikes | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [likersDialogOpen, setLikersDialogOpen] = useState(false);
  const [viewingLikers, setViewingLikers] = useState<IdeaWithLikes | null>(null);
  const myIdeasTabRef = useRef<HTMLButtonElement>(null);
  const publicWallTabRef = useRef<HTMLButtonElement>(null);

  const fetchIdeas = useCallback(async (withLoading = true) => {
    if (withLoading) setLoading(true);
    setError(null);
    try {
      const [myResponse, publicResponse] = await Promise.all([
        fetch("/api/musician/ideas"),
        fetch("/api/musician/ideas?view=public"),
      ]);
      if (!myResponse.ok || !publicResponse.ok) {
        throw new Error("Erreur lors du chargement des idées.");
      }
      const [myData, publicData] = await Promise.all([
        myResponse.json() as Promise<IdeaWithLikes[]>,
        publicResponse.json() as Promise<IdeaWithLikes[]>,
      ]);
      setMyIdeas(myData);
      setPublicIdeas(publicData);
    } catch (fetchError) {
      console.error("Error fetching ideas:", fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Une erreur inattendue est survenue lors du chargement des idées."
      );
    } finally {
      if (withLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchIdeas();
  }, [fetchIdeas]);

  const handleDelete = useCallback(async () => {
    if (!ideaToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/musician/ideas?id=${ideaToDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Erreur lors de la suppression de l'idée.");
      }
      void fetchIdeas(false);
    } catch (deleteError) {
      console.error("Error deleting idea:", deleteError);
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Erreur lors de la suppression de l'idée."
      );
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setIdeaToDelete(null);
    }
  }, [fetchIdeas, ideaToDelete]);

  const handleLike = useCallback(async (idea: IdeaWithLikes) => {
    setLikingId(idea.id);
    try {
      const action = idea.user_has_liked ? "unlike" : "like";
      const response = await fetch(`/api/musician/ideas?id=${idea.id}&action=${action}`, {
        method: "PUT",
      });
      if (!response.ok) {
        throw new Error("Impossible de modifier ce like.");
      }
      const nextLiked = !idea.user_has_liked;
      const updateIdea = (current: IdeaWithLikes[]) =>
        current.map((currentIdea) =>
          currentIdea.id === idea.id
            ? {
                ...currentIdea,
                likes_count: idea.user_has_liked
                  ? currentIdea.likes_count - 1
                  : currentIdea.likes_count + 1,
                user_has_liked: nextLiked,
              }
            : currentIdea
        );
      setPublicIdeas(updateIdea);
      setMyIdeas(updateIdea);
    } catch (likeError) {
      console.error("Error toggling like:", likeError);
      setError(likeError instanceof Error ? likeError.message : "Impossible de modifier ce like.");
    } finally {
      setLikingId(null);
    }
  }, []);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentTab: IdeaTab) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextTab: IdeaTab = currentTab === "my-ideas" ? "public-wall" : "my-ideas";
    setActiveTab(nextTab);
    const nextRef = nextTab === "my-ideas" ? myIdeasTabRef : publicWallTabRef;
    nextRef.current?.focus();
  };

  function openResponse(idea: IdeaWithLikes) {
    setViewingResponse(idea);
    setResponseDialogOpen(true);
  }

  function resetFilters() {
    setCategoryFilter("all");
    setSearchQuery("");
    setSortBy("newest");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Boîte à idée</h1>
          <p className="mt-1 text-muted-foreground">
            Vous avez une idée pour faire évoluer l'association ou enrichir la vie de l'orchestre ?
            Partagez-la avec nous !
          </p>
        </div>
        <Button type="button" onClick={() => setComposerOpen(true)} className="gap-2">
          <Send className="h-4 w-4" />
          Soumettre une idée
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchIdeas()}
            className="font-medium underline-offset-2 hover:underline"
          >
            Réessayer
          </button>
        </div>
      )}

      <div className="flex gap-2 border-b border-border">
        <button
          ref={myIdeasTabRef}
          type="button"
          aria-pressed={activeTab === "my-ideas"}
          onClick={() => setActiveTab("my-ideas")}
          onKeyDown={(event) => handleTabKeyDown(event, "my-ideas")}
          className={`cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === "my-ideas"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Mes idées
        </button>
        <button
          ref={publicWallTabRef}
          type="button"
          aria-pressed={activeTab === "public-wall"}
          onClick={() => setActiveTab("public-wall")}
          onKeyDown={(event) => handleTabKeyDown(event, "public-wall")}
          className={`flex cursor-pointer items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            activeTab === "public-wall"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          Mur d'idées
          {publicIdeas.length > 0 && (
            <Badge variant="primary" className="rounded-full px-2 py-0.5">
              {publicIdeas.length}
            </Badge>
          )}
        </button>
      </div>

      {loading ? (
        <ListSkeleton count={3} showAvatar={false} linesPerItem={3} />
      ) : activeTab === "my-ideas" ? (
        <MyIdeasTab
          ideas={myIdeas}
          onOpenComposer={() => setComposerOpen(true)}
          onDelete={(idea) => {
            setIdeaToDelete(idea);
            setDeleteDialogOpen(true);
          }}
          onViewResponse={openResponse}
        />
      ) : (
        <PublicWallTab
          ideas={publicIdeas}
          searchQuery={searchQuery}
          categoryFilter={categoryFilter}
          sortBy={sortBy}
          showFilters={showFilters}
          expandedDescriptions={expandedDescriptions}
          likingId={likingId}
          onToggleFilters={() => setShowFilters((current) => !current)}
          onSearchChange={setSearchQuery}
          onCategoryChange={(value: IdeaFilterCategory) => setCategoryFilter(value)}
          onSortChange={(value: IdeaSortOption) => setSortBy(value)}
          onResetFilters={resetFilters}
          onToggleExpanded={(ideaId) => {
            setExpandedDescriptions((previous) => {
              const next = new Set(previous);
              if (next.has(ideaId)) next.delete(ideaId);
              else next.add(ideaId);
              return next;
            });
          }}
          onLike={handleLike}
          onViewResponse={openResponse}
          onViewLikers={(idea) => {
            setViewingLikers(idea);
            setLikersDialogOpen(true);
          }}
        />
      )}

      <IdeaComposerDialog
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onSubmitted={() => void fetchIdeas(false)}
      />
      <IdeaResponseDialog
        open={responseDialogOpen}
        idea={viewingResponse}
        onOpenChange={setResponseDialogOpen}
      />
      <IdeaLikersDialog
        open={likersDialogOpen}
        idea={viewingLikers}
        onOpenChange={setLikersDialogOpen}
      />
      <DeleteIdeaDialog
        open={deleteDialogOpen}
        idea={ideaToDelete}
        deleting={deleting}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
