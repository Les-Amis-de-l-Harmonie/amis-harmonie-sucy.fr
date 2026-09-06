import type { IdeaCategory, IdeaWithLikes } from "@/db/types";

export const CATEGORY_LABELS: Record<IdeaCategory, string> = {
  association: "Les Amis de l'Harmonie",
  harmonie: "Harmonie Municipale de Sucy-en-Brie",
  website: "Site internet",
};

export type IdeaFilterCategory = "all" | IdeaCategory;
export type IdeaSortOption = "newest" | "oldest" | "most_liked" | "least_liked";

export function formatIdeaDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function filterAndSortIdeas(
  ideas: IdeaWithLikes[],
  searchQuery: string,
  categoryFilter: IdeaFilterCategory,
  sortBy: IdeaSortOption
): IdeaWithLikes[] {
  const normalizedSearch = searchQuery.toLowerCase();
  const filtered = ideas.filter((idea) => {
    const matchesSearch =
      normalizedSearch === "" ||
      idea.title.toLowerCase().includes(normalizedSearch) ||
      idea.description.toLowerCase().includes(normalizedSearch);
    const matchesCategory = categoryFilter === "all" || idea.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return filtered.sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "most_liked":
        return (b.likes_count || 0) - (a.likes_count || 0);
      case "least_liked":
        return (a.likes_count || 0) - (b.likes_count || 0);
      default:
        return 0;
    }
  });
}
