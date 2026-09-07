"use client";

import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from "@/app/components/ui/label";
import { Badge } from "@/app/components/ui/badge";
import { Search, SlidersHorizontal, X } from "lucide-react";
import type { IdeaCategory } from "@/db/types";
import { CATEGORY_LABELS, type IdeaFilterCategory, type IdeaSortOption } from "./idea-filters";
import { cn } from "@/lib/utils";

interface IdeaFiltersBarProps {
  showFilters: boolean;
  searchQuery: string;
  categoryFilter: IdeaFilterCategory;
  sortBy: IdeaSortOption;
  onToggle: () => void;
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: IdeaFilterCategory) => void;
  onSortChange: (value: IdeaSortOption) => void;
  onReset: () => void;
}

export function IdeaFiltersBar({
  showFilters,
  searchQuery,
  categoryFilter,
  sortBy,
  onToggle,
  onSearchChange,
  onCategoryChange,
  onSortChange,
  onReset,
}: IdeaFiltersBarProps) {
  const activeFilterCount = [categoryFilter !== "all", searchQuery !== ""].filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between sm:hidden">
        <span className="text-sm font-medium text-muted-foreground">Filtrer et trier</span>
        <Button type="button" variant="outline" size="sm" onClick={onToggle} className="gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtres
          {activeFilterCount > 0 && (
            <Badge variant="primary" className="h-5 min-w-5 justify-center rounded-full px-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      <div
        className={cn(
          "rounded-lg border border-border bg-muted/50 p-4",
          showFilters ? "block" : "hidden sm:block"
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Filtrer et trier</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            Réinitialiser
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher une idée..."
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="idea-category-filter" className="text-xs">
              Catégorie
            </Label>
            <select
              id="idea-category-filter"
              value={categoryFilter}
              onChange={(event) => onCategoryChange(event.target.value as IdeaFilterCategory)}
              className="w-full cursor-pointer rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              <option value="all">Toutes</option>
              {(Object.keys(CATEGORY_LABELS) as IdeaCategory[]).map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="idea-sort" className="text-xs">
              Trier par
            </Label>
            <select
              id="idea-sort"
              value={sortBy}
              onChange={(event) => onSortChange(event.target.value as IdeaSortOption)}
              className="w-full cursor-pointer rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            >
              <option value="newest">Plus récent</option>
              <option value="oldest">Plus ancien</option>
              <option value="most_liked">Plus aimé</option>
              <option value="least_liked">Moins aimé</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
