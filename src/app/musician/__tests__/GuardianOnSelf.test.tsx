import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicianAssuranceClient } from "../MusicianAssurance";
import { MusicianDisponibilites } from "../MusicianDisponibilites";
import { MusicianHomeClient } from "../MusicianHome";
import { MusicianIdeeClient } from "../MusicianIdee";
import { MusicianProfileClient } from "../MusicianProfile";
import { MusicianTrombinoscopeClient } from "../MusicianTrombinoscope";
import { GUARDIAN_SELF, LEA, THEO, withSession } from "./session-fixtures";

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

const guardianSession = { profiles: [GUARDIAN_SELF, LEA, THEO], actor: GUARDIAN_SELF };

describe("Responsable sur « Moi »", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: "Interdit" }, 403))
    );
    reloadPage.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("l'accueil propose de choisir un musicien sans appeler aucune API", async () => {
    render(
      withSession(
        guardianSession,
        <MusicianHomeClient userId={GUARDIAN_SELF.userId} firstName="Claire" lastName="Martin" />
      )
    );

    expect(screen.getByRole("heading", { name: "Bonjour, Claire !" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Choisissez un musicien" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Léa Martin/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Théo Martin/ })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("choisir un enfant lance la bascule puis recharge", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true }));
    render(
      withSession(
        guardianSession,
        <MusicianHomeClient userId={GUARDIAN_SELF.userId} firstName="Claire" lastName="Martin" />
      )
    );

    await user.click(screen.getByRole("button", { name: /Léa Martin/ }));
    await waitFor(() => expect(reloadPage).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "/api/musician/acting",
      expect.objectContaining({ body: JSON.stringify({ userId: LEA.userId }) })
    );
  });

  it.each([
    ["idées", <MusicianIdeeClient key="i" />],
    ["assurance", <MusicianAssuranceClient key="a" />],
    ["trombinoscope", <MusicianTrombinoscopeClient key="t" />],
    ["prestations", <MusicianDisponibilites key="d" />],
  ])("la page %s affiche l'état « Choisissez un musicien » sans appeler d'API", (_name, page) => {
    render(withSession(guardianSession, page));

    expect(screen.getByRole("heading", { name: "Choisissez un musicien" })).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sans enfant relié, l'état renvoie vers le bureau", () => {
    render(
      withSession({ profiles: [GUARDIAN_SELF], actor: GUARDIAN_SELF }, <MusicianIdeeClient />)
    );
    expect(screen.getByText(/Aucun musicien n'est relié à votre compte/)).toBeInTheDocument();
  });

  it("le profil ne propose que les coordonnées et n'enregistre que ces trois champs", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockImplementation(async (_input, init) =>
      init?.method === "PUT"
        ? jsonResponse({ success: true })
        : jsonResponse({
            first_name: "Claire",
            last_name: "Martin",
            phone: "06 12 34 56 78",
            email: "claire@example.com",
          })
    );
    render(withSession(guardianSession, <MusicianProfileClient userId={GUARDIAN_SELF.userId} />));

    expect(await screen.findByLabelText("Prénom")).toHaveValue("Claire");
    expect(screen.getByLabelText("Téléphone")).toHaveValue("06 12 34 56 78");
    expect(screen.queryByText("Droit à l'image")).not.toBeInTheDocument();
    expect(screen.queryByText("Photo de profil")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Téléphone"));
    await user.type(screen.getByLabelText("Téléphone"), "07 00 00 00 00");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Vos coordonnées sont enregistrées."
    );
    const put = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "PUT");
    expect(JSON.parse(String(put?.[1]?.body))).toEqual({
      first_name: "Claire",
      last_name: "Martin",
      phone: "07 00 00 00 00",
    });
  });

  it("en délégation, l'accueil charge normalement les données de Léa", async () => {
    const responses: Record<string, unknown> = {
      "/api/musician/profile": { first_name: "Léa", last_name: "Martin" },
      "/api/outing-settings": { is_active: 0 },
      "/api/info-settings": { is_active: 0 },
      "/api/musician/birthdays": [],
      "/api/musician/ideas?count=unread": { count: 0, recent: [] },
      "/api/musician/planning-check": {
        urgent: false,
        nextEvents: [],
        urgentEvent: null,
        pendingCount: 0,
      },
      "/api/videos": [],
    };
    vi.mocked(fetch).mockImplementation(async (input) => jsonResponse(responses[String(input)]));

    render(
      withSession(
        { profiles: [GUARDIAN_SELF, LEA], userId: LEA.userId, delegated: true },
        <MusicianHomeClient userId={LEA.userId} firstName="Léa" lastName="Martin" />
      )
    );

    expect(await screen.findByRole("heading", { name: "Prochaines prestations" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Choisissez un musicien" })).not.toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/musician/ideas?count=unread");
  });

  it("en délégation, le profil complet affiche celui de Léa sans exposer son e-mail", async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        first_name: "Léa",
        last_name: "Martin",
        phone: "06 12 34 56 78",
        email: null,
        instruments: [],
        harmonieInstruments: [],
      })
    );

    render(
      withSession(
        { profiles: [GUARDIAN_SELF, LEA], userId: LEA.userId, delegated: true },
        <MusicianProfileClient userId={LEA.userId} />
      )
    );

    expect(await screen.findByRole("heading", { name: "Profil de Léa" })).toBeInTheDocument();
    expect(document.getElementById("email")).toBeNull();
    expect(fetch).toHaveBeenCalledWith("/api/musician/profile");
  });

  it("refuse d'enregistrer sans prénom ni nom", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ first_name: null, last_name: null, phone: null, email: "c@example.com" })
    );
    render(withSession(guardianSession, <MusicianProfileClient userId={GUARDIAN_SELF.userId} />));

    await screen.findByLabelText("Prénom");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(await screen.findByText("Prénom obligatoire")).toBeInTheDocument();
    expect(screen.getByText("Nom obligatoire")).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
