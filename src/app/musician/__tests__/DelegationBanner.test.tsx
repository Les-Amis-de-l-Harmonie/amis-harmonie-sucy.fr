import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DelegationBanner } from "../DelegationBanner";
import { MusicianLayout } from "../MusicianLayout";
import { actorOf, GUARDIAN_SELF, LEA, SELF, THEO, withSession } from "./session-fixtures";

const reloadPage = vi.fn();

vi.mock("../profile-switch", async () => {
  const actual = await vi.importActual<typeof import("../profile-switch")>("../profile-switch");
  return { ...actual, reloadPage: () => reloadPage() };
});

describe("Bandeau « Vous agissez pour »", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: true })))
    );
    reloadPage.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("n'apparaît pas quand on agit pour soi", () => {
    render(withSession({ profiles: [SELF, LEA] }, <DelegationBanner />));
    expect(screen.queryByRole("region", { name: "Profil actif" })).not.toBeInTheDocument();
  });

  it("indique pour qui on agit et permet de revenir à son espace", async () => {
    const user = userEvent.setup();
    render(
      withSession(
        { profiles: [SELF, LEA], userId: LEA.userId, delegated: true },
        <DelegationBanner />
      )
    );

    const banner = screen.getByRole("region", { name: "Profil actif" });
    expect(banner).toHaveTextContent("Vous agissez pour Léa Martin");
    expect(screen.queryByRole("button", { name: "Changer" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Revenir à mon espace" }));
    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe(JSON.stringify({ userId: null }));
  });

  it("propose de changer d'enfant quand il y en a plusieurs", async () => {
    const user = userEvent.setup();
    render(
      withSession(
        { profiles: [GUARDIAN_SELF, LEA, THEO], userId: LEA.userId, delegated: true },
        <DelegationBanner />
      )
    );

    await user.click(screen.getByRole("button", { name: "Changer" }));
    await user.click(screen.getByRole("button", { name: /Théo Martin/ }));

    await waitFor(() => expect(reloadPage).toHaveBeenCalled());
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe(JSON.stringify({ userId: THEO.userId }));
  });

  it("est affiché par la coquille du portail sans masquer la navigation", () => {
    render(
      <MusicianLayout
        pathname="/musician/"
        firstName="Léa"
        lastName="Martin"
        userId={LEA.userId}
        actor={actorOf(SELF)}
        delegated
        profiles={[SELF, LEA]}
      >
        <p>Contenu de la page</p>
      </MusicianLayout>
    );

    expect(screen.getByRole("region", { name: "Profil actif" })).toHaveTextContent(
      "Vous agissez pour Léa Martin"
    );
    expect(screen.getByText("Contenu de la page")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Navigation mobile" })).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Sections de l'espace musicien" })
    ).toBeInTheDocument();
    // Rappel permanent dans l'en-tête mobile.
    expect(screen.getByText("Pour Léa")).toBeInTheDocument();
  });

  it("n'affiche pas de bandeau dans la coquille hors délégation", () => {
    render(
      <MusicianLayout
        pathname="/musician/"
        firstName="Claire"
        lastName="Martin"
        userId={SELF.userId}
        actor={actorOf(SELF)}
        delegated={false}
        profiles={[SELF]}
      >
        <p>Contenu</p>
      </MusicianLayout>
    );
    expect(screen.queryByRole("region", { name: "Profil actif" })).not.toBeInTheDocument();
  });
});
