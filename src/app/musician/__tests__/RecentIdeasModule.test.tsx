import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecentIdeasModule } from "../RecentIdeasModule";
import type { IdeaPreview } from "../musician-types";

// Le mode réduit masquait la duplication dans l'ancienne implémentation.
vi.mock("framer-motion", () => ({ useReducedMotion: () => false }));

function createIdeas(count: number): IdeaPreview[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `Proposition ${index + 1}`,
    description: `Description de la proposition ${index + 1}`,
    category: "harmonie",
    created_at: "2026-09-01T12:00:00Z",
    author_first_name: "Camille",
    likes_count: index,
  }));
}

describe("RecentIdeasModule", () => {
  it.each([4, 5])(
    "affiche chacune des %i idées une seule fois, même sans réduction des animations",
    (count) => {
      const ideas = createIdeas(count);
      const { container } = render(<RecentIdeasModule loading={false} ideas={ideas} />);

      // Compter aussi les clones aria-hidden : ils restent visibles à l'écran.
      expect(container.querySelectorAll("li")).toHaveLength(count);
      for (const idea of ideas) {
        expect(screen.getAllByText(idea.title, { exact: true })).toHaveLength(1);
      }
    }
  );

  it("conserve une liste courte défilable au clavier avec focus visible et alignement des cartes", () => {
    render(<RecentIdeasModule loading={false} ideas={createIdeas(2)} />);

    const list = screen.getByRole("list", { name: "Idées récentes, défilement horizontal" });
    expect(screen.getAllByRole("listitem", { hidden: true })).toHaveLength(2);
    expect(list).toHaveAttribute("tabindex", "0");
    expect(list).toHaveClass(
      "overflow-x-auto",
      "snap-x",
      "snap-mandatory",
      "focus-visible:ring-2",
      "focus-visible:ring-primary"
    );
    for (const card of screen.getAllByRole("listitem")) {
      expect(card).toHaveClass("snap-center");
    }
  });

  it("affiche les espaces réservés pendant le chargement sans afficher les idées", () => {
    const { container } = render(<RecentIdeasModule loading ideas={createIdeas(5)} />);

    expect(container.querySelectorAll("li")).toHaveLength(0);
    expect(screen.queryByText("Proposition 1")).not.toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')?.children).toHaveLength(3);
    expect(screen.queryByText("Aucune idée publique pour le moment.")).not.toBeInTheDocument();
  });

  it("affiche le message de liste vide", () => {
    render(<RecentIdeasModule loading={false} ideas={[]} />);

    expect(screen.getByText("Aucune idée publique pour le moment.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("conserve le lien vers la boîte à idées", () => {
    render(<RecentIdeasModule loading={false} ideas={createIdeas(1)} />);

    expect(screen.getByRole("link", { name: "Voir la boîte à idées" })).toHaveAttribute(
      "href",
      "/musician/idee"
    );
  });
});
