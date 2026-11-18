import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicianUserSummary } from "../MusicianUserSummary";
import { GUARDIAN_SELF, LEA, SELF, THEO, withSession } from "./session-fixtures";

const reloadPage = vi.fn();

vi.mock("../profile-switch", async () => {
  const actual = await vi.importActual<typeof import("../profile-switch")>("../profile-switch");
  return { ...actual, reloadPage: () => reloadPage() };
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Sélecteur de profil", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    reloadPage.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("n'apparaît pas quand le compte n'a qu'un profil", () => {
    render(
      withSession(
        { profiles: [SELF] },
        <MusicianUserSummary firstName="Claire" lastName="Martin" />
      )
    );

    expect(screen.getByText("Claire Martin")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /changer de profil/i })).not.toBeInTheDocument();
  });

  it("n'apparaît pas dans un rendu isolé quand le compte n'a qu'un profil", () => {
    render(
      withSession(
        { profiles: [SELF] },
        <MusicianUserSummary firstName="Claire" lastName="Martin" />
      )
    );
    expect(screen.queryByRole("button", { name: /changer de profil/i })).not.toBeInTheDocument();
  });

  it("liste « Moi » et les enfants, et marque le profil courant", async () => {
    const user = userEvent.setup();
    render(
      withSession(
        { profiles: [SELF, LEA, THEO], userId: LEA.userId, delegated: true },
        <MusicianUserSummary firstName="Léa" lastName="Martin" />
      )
    );

    const toggle = screen.getByRole("button", { name: /changer de profil/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const options = screen.getAllByRole("button").filter((b) => b !== toggle);
    expect(options).toHaveLength(3);
    expect(within(options[0]).getByText("Moi")).toBeInTheDocument();
    expect(options[1]).toHaveAttribute("aria-current", "true");
    expect(options[1]).toHaveTextContent("Léa Martin");
    expect(options[1]).toHaveTextContent("(profil actuel)");
    expect(options[2]).not.toHaveAttribute("aria-current");
  });

  it("bascule vers un enfant (POST) puis recharge la page", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true }));
    render(
      withSession(
        { profiles: [SELF, LEA, THEO] },
        <MusicianUserSummary firstName="Claire" lastName="Martin" />
      )
    );

    await user.click(screen.getByRole("button", { name: /changer de profil/i }));
    await user.click(screen.getByRole("button", { name: /Théo Martin/ }));

    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "/api/musician/acting",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ userId: THEO.userId }) })
    );
  });

  it("revient à « Moi » en envoyant userId null", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true }));
    render(
      withSession(
        { profiles: [SELF, LEA], userId: LEA.userId, delegated: true },
        <MusicianUserSummary firstName="Léa" lastName="Martin" />
      )
    );

    await user.click(screen.getByRole("button", { name: /changer de profil/i }));
    await user.click(screen.getByRole("button", { name: /Moi/ }));

    await waitFor(() => expect(reloadPage).toHaveBeenCalled());
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe(JSON.stringify({ userId: null }));
  });

  it("affiche le message du serveur sans recharger quand la bascule est refusée", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ error: "Vous ne pouvez pas agir pour ce profil." }, 403)
    );
    render(
      withSession(
        { profiles: [SELF, LEA] },
        <MusicianUserSummary firstName="Claire" lastName="Martin" />
      )
    );

    await user.click(screen.getByRole("button", { name: /changer de profil/i }));
    await user.click(screen.getByRole("button", { name: /Léa Martin/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vous ne pouvez pas agir pour ce profil."
    );
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it("affiche un message clair quand le réseau échoue", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValue(new TypeError("network"));
    render(
      withSession(
        { profiles: [SELF, LEA] },
        <MusicianUserSummary firstName="Claire" lastName="Martin" />
      )
    );

    await user.click(screen.getByRole("button", { name: /changer de profil/i }));
    await user.click(screen.getByRole("button", { name: /Léa Martin/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Impossible de changer de profil/);
    expect(reloadPage).not.toHaveBeenCalled();
  });

  it("précise que « Moi » d'un responsable ne donne accès qu'aux coordonnées", async () => {
    const user = userEvent.setup();
    render(
      withSession(
        { profiles: [GUARDIAN_SELF, LEA], actor: GUARDIAN_SELF },
        <MusicianUserSummary firstName="Claire" lastName="Martin" />
      )
    );
    await user.click(screen.getByRole("button", { name: /changer de profil/i }));
    expect(screen.getByText("Mes coordonnées")).toBeInTheDocument();
  });
});
