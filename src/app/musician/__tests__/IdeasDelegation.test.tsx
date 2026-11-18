import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IdeaWithLikes } from "@/db/types";
import { IdeaCard } from "../IdeaCard";
import { MusicianIdeeClient } from "../MusicianIdee";
import { MyIdeasTab } from "../MyIdeasTab";
import { LEA, SELF, withSession } from "./session-fixtures";

function createIdea(overrides: Partial<IdeaWithLikes> = {}): IdeaWithLikes {
  return {
    id: 5,
    user_id: 21,
    title: "Un concert de films",
    description: "Jouer des musiques de film.",
    category: "harmonie",
    is_public: 1,
    admin_notes: null,
    created_at: "2026-09-01 12:00:00",
    updated_at: "2026-09-01 12:00:00",
    likes_count: 2,
    user_has_liked: false,
    ...overrides,
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

describe("Idées en délégation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("IdeaCard (mes idées) : modifier et supprimer sont désactivés en lecture seule", () => {
    render(
      <IdeaCard
        mode="mine"
        idea={createIdea()}
        readOnly
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onViewResponse={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: "Modifier l'idée" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Modifier l'idée" })).not.toHaveAttribute("title");
    expect(screen.getByRole("button", { name: "Supprimer l'idée" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Supprimer l'idée" })).not.toHaveAttribute("title");
  });

  it("IdeaCard (mur) : « j'aime » est désactivé en lecture seule, actif sinon", () => {
    const props = {
      mode: "public" as const,
      idea: createIdea(),
      expanded: false,
      liking: false,
      onLike: vi.fn(),
      onToggleExpanded: vi.fn(),
      onViewResponse: vi.fn(),
      onViewLikers: vi.fn(),
    };
    const { rerender } = render(<IdeaCard {...props} readOnly />);
    expect(screen.getByRole("button", { name: "J'aime" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "J'aime" })).not.toHaveAttribute("title");
    rerender(<IdeaCard {...props} />);
    expect(screen.getByRole("button", { name: "J'aime" })).toBeEnabled();
  });

  it("MyIdeasTab : pas de bouton « Soumettre une idée » en lecture seule", () => {
    render(
      <MyIdeasTab
        ideas={[]}
        readOnly
        onOpenComposer={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onViewResponse={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /Soumettre une idée/ })).not.toBeInTheDocument();
  });

  it("la page explique que les idées sont personnelles et désactive les actions", async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("view=public")) return jsonResponse([createIdea()]);
      return jsonResponse([createIdea({ id: 6, title: "Idée de Léa" })]);
    });

    const user = userEvent.setup();
    render(
      withSession(
        { profiles: [SELF, LEA], userId: LEA.userId, delegated: true },
        <MusicianIdeeClient />
      )
    );

    expect(await screen.findByRole("note")).toHaveTextContent(
      "Les idées sont personnelles : vous pouvez les lire, mais pas en proposer, les modifier, les supprimer ni les aimer à la place de Léa."
    );
    expect(screen.getByRole("button", { name: /Soumettre une idée/ })).toBeDisabled();
    expect(await screen.findByRole("button", { name: "J'aime" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Mes idées/ }));
    expect(await screen.findByRole("button", { name: "Modifier l'idée" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Supprimer l'idée" })).toBeDisabled();

    // Aucune écriture n'est partie : uniquement les deux lectures.
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    for (const [, init] of vi.mocked(fetch).mock.calls) {
      expect(init?.method ?? "GET").toBe("GET");
    }
  });

  it("hors délégation, les actions restent actives et aucune explication n'apparaît", async () => {
    vi.mocked(fetch).mockImplementation(async () => jsonResponse([createIdea()]));
    render(withSession({ profiles: [SELF, LEA] }, <MusicianIdeeClient />));

    expect(await screen.findByRole("button", { name: "J'aime" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Soumettre une idée/ })).toBeEnabled();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
