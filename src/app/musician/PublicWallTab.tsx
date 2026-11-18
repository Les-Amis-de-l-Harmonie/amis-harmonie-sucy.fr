"use client";

import { useMemo } from "react";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Search } from "lucide-react";
import type { IdeaWithLikes } from "@/db/types";
import { getActingLabels } from "./acting-labels";
import { IdeaCard } from "./IdeaCard";
import { IdeaFiltersBar } from "./IdeaFiltersBar";
import { filterAndSortIdeas, type IdeaFilterCategory, type IdeaSortOption } from "./idea-filters";

interface PublicWallTabProps {
  ideas: IdeaWithLikes[];
  searchQuery: string;
  categoryFilter: IdeaFilterCategory;
  sortBy: IdeaSortOption;
  showFilters: boolean;
  expandedDescriptions: Set<number>;
  likingId: number | null;
  onToggleFilters: () => void;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: IdeaFilterCategory) => void;
  onSortChange: (value: IdeaSortOption) => void;
  onResetFilters: () => void;
  onToggleExpanded: (ideaId: number) => void;
  onLike: (idea: IdeaWithLikes) => void;
  onViewResponse: (idea: IdeaWithLikes) => void;
  onViewLikers: (idea: IdeaWithLikes) => void;
  /** Responsable qui agit pour un enfant : « j'aime » désactivé. */
  readOnly?: boolean;
  actingForName?: string | null;
}

export function PublicWallTab({
  ideas,
  searchQuery,
  categoryFilter,
  sortBy,
  showFilters,
  expandedDescriptions,
  likingId,
  onToggleFilters,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onResetFilters,
  onToggleExpanded,
  onLike,
  onViewResponse,
  onViewLikers,
  readOnly = false,
  actingForName = null,
}: PublicWallTabProps) {
  const filteredIdeas = useMemo(
    () => filterAndSortIdeas(ideas, searchQuery, categoryFilter, sortBy),
    [categoryFilter, ideas, searchQuery, sortBy]
  );

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">Mur d'idées</h2>
      <IdeaFiltersBar
        showFilters={showFilters}
        searchQuery={searchQuery}
        categoryFilter={categoryFilter}
        sortBy={sortBy}
        onToggle={onToggleFilters}
        onSearchChange={onSearchChange}
        onCategoryChange={onCategoryChange}
        onSortChange={onSortChange}
        onReset={onResetFilters}
      />

      {filteredIdeas.length === 0 ? (
        <EmptyState
          icon={<Search className="h-12 w-12" />}
          title="Aucune idée ne correspond à vos critères"
          description="Essayez de modifier vos filtres."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {readOnly
              ? getActingLabels(actingForName).publicWallIntro
              : getActingLabels(null).publicWallIntro}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredIdeas.map((idea) => (
              <IdeaCard
                key={idea.id}
                idea={idea}
                mode="public"
                expanded={expandedDescriptions.has(idea.id)}
                liking={likingId === idea.id}
                onLike={onLike}
                onToggleExpanded={onToggleExpanded}
                onViewResponse={onViewResponse}
                onViewLikers={onViewLikers}
                readOnly={readOnly}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
