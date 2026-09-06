import { describe, expect, it } from "vitest";
import type { IdeaWithLikes } from "@/db/types";
import { filterAndSortIdeas } from "../idea-filters";

function createIdea(overrides: Partial<IdeaWithLikes>): IdeaWithLikes {
  return {
    id: 1,
    user_id: 2,
    title: "Concert de musique de film",
    description: "Une idée pour le prochain concert.",
    category: "association",
    is_public: 1,
    admin_notes: null,
    created_at: "2026-01-01 12:00:00",
    updated_at: "2026-01-01 12:00:00",
    likes_count: 0,
    user_has_liked: false,
    ...overrides,
  };
}

describe("filterAndSortIdeas", () => {
  it("filtre par recherche et catégorie sans modifier la liste source", () => {
    const ideas = [
      createIdea({ id: 1, title: "Concert de musique de film", category: "association" }),
      createIdea({ id: 2, title: "Nouveau site", category: "website" }),
    ];

    const result = filterAndSortIdeas(ideas, "film", "association", "newest");

    expect(result.map((idea) => idea.id)).toEqual([1]);
    expect(ideas.map((idea) => idea.id)).toEqual([1, 2]);
  });

  it("trie les idées par date et par nombre de likes", () => {
    const ideas = [
      createIdea({ id: 1, created_at: "2026-01-01", likes_count: 2 }),
      createIdea({ id: 2, created_at: "2026-03-01", likes_count: 1 }),
      createIdea({ id: 3, created_at: "2026-02-01", likes_count: 5 }),
    ];

    expect(filterAndSortIdeas(ideas, "", "all", "newest").map((idea) => idea.id)).toEqual([
      2, 3, 1,
    ]);
    expect(filterAndSortIdeas(ideas, "", "all", "most_liked").map((idea) => idea.id)).toEqual([
      3, 1, 2,
    ]);
  });

  it("conserve toutes les idées quand aucun filtre n'est actif", () => {
    const ideas = [createIdea({ id: 1 }), createIdea({ id: 2 })];

    expect(filterAndSortIdeas(ideas, "", "all", "newest")).toHaveLength(2);
  });
});
