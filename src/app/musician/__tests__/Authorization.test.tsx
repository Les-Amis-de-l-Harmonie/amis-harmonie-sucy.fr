import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicianDisponibilites } from "../MusicianDisponibilites";
import { PresenceCard } from "../PresenceCard";
import type { PresenceAuthorization, PresenceEvent } from "../musician-types";
import { GUARDIAN_SELF, LEA, SELF, withSession } from "./session-fixtures";

const DETAILS = "Départ en car à 8 h. Prévoir un pique-nique.";

function authorization(overrides: Partial<PresenceAuthorization> = {}): PresenceAuthorization {
  return {
    details: DETAILS,
    status: "missing",
    authorizedBy: null,
    authorizedAt: null,
    outdated: false,
    canAuthorize: true,
    ...overrides,
  };
}

function createEvent(
  auth: PresenceAuthorization | null | undefined,
  overrides: Partial<PresenceEvent> = {}
): PresenceEvent {
  return {
    id: 8,
    title: "Sortie à Provins",
    date: "2099-06-20",
    time: "08:00",
    location: null,
    address: null,
    response_deadline: null,
    response: { status: null, comment: null, updated_at: null },
    roster: [],
    counts: { present: 0, absent: 0, noAnswer: 1, totalMembers: 1 },
    ...(auth !== undefined ? { authorization: auth } : {}),
    ...overrides,
  };
}

const parentSession = {
  profiles: [GUARDIAN_SELF, LEA],
  userId: LEA.userId,
  delegated: true,
  actor: GUARDIAN_SELF,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderCard(
  event: PresenceEvent,
  session: Parameters<typeof withSession>[0] = parentSession
) {
  const onUpdate = vi.fn();
  render(
    withSession(
      session,
      <PresenceCard event={event} onUpdate={onUpdate} onStatusChanged={vi.fn()} />
    )
  );
  return { onUpdate };
}

function authorizationBlock() {
  return screen.getByRole("region", { name: "Autorisation parentale" });
}

describe("Autorisation parentale sur la carte de présence", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("n'affiche aucun bloc quand l'événement ne demande rien", () => {
    renderCard(createEvent(null));
    expect(
      screen.queryByRole("region", { name: "Autorisation parentale" })
    ).not.toBeInTheDocument();
  });

  it("n'affiche aucun bloc avec une API qui n'envoie pas encore `authorization`", () => {
    renderCard(createEvent(undefined));
    expect(screen.queryByText("Autorisation parentale")).not.toBeInTheDocument();
  });

  it("parent : détails, autorisation manquante et bouton à la troisième personne", () => {
    renderCard(createEvent(authorization()));
    const block = authorizationBlock();
    expect(within(block).getByText(DETAILS)).toBeInTheDocument();
    expect(within(block).getByText("Autorisation manquante")).toBeInTheDocument();
    expect(
      within(block).getByRole("button", { name: "J'autorise Léa à participer" })
    ).toBeEnabled();
    expect(within(block).queryByRole("button", { name: /Retirer/ })).not.toBeInTheDocument();
  });

  it("parent : autoriser envoie la demande puis rafraîchit la carte", async () => {
    const user = userEvent.setup();
    const granted = authorization({
      status: "authorized",
      authorizedBy: { name: null, relation: null, byYou: true, byAssociation: false, paper: false },
      authorizedAt: "2026-11-18 10:00:00",
    });
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true, authorization: granted }));
    const { onUpdate } = renderCard(createEvent(authorization()));

    await user.click(screen.getByRole("button", { name: "J'autorise Léa à participer" }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "/api/musician/authorizations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ eventId: 8, authorize: true }),
      })
    );
    expect(onUpdate.mock.calls[0][0].authorization).toEqual(granted);
    expect(onUpdate.mock.calls[0][0].id).toBe(8);
  });

  it("parent : « Autorisé par vous » avec la date, et retrait de son autorisation", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: true, authorization: authorization() })
    );
    const { onUpdate } = renderCard(
      createEvent(
        authorization({
          status: "authorized",
          authorizedBy: { name: null, relation: null, byYou: true, byAssociation: false, paper: false },
          authorizedAt: "2026-11-12 09:30:00",
        })
      )
    );

    expect(screen.getByText("Autorisé par vous le 12 novembre 2026")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /J'autorise/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Retirer mon autorisation" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe(
      JSON.stringify({ eventId: 8, authorize: false })
    );
  });

  it("indique une autorisation papier signée par le parent connecté et garde son libellé de retrait", () => {
    renderCard(
      createEvent(
        authorization({
          status: "authorized",
          authorizedBy: {
            name: "Aurélie",
            relation: "mère",
            byYou: true,
            byAssociation: false,
            paper: true,
          },
          authorizedAt: "2026-11-12 09:30:00",
        })
      )
    );

    expect(screen.getByText("Autorisé par vous (papier) le 12 novembre 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirer mon autorisation" })).toBeInTheDocument();
  });

  it("parent : autorisation donnée par l'autre parent (prénom et lien de parenté)", () => {
    renderCard(
      createEvent(
        authorization({
          status: "authorized",
          authorizedBy: {
            name: "Aurélie",
            relation: "mère",
            byYou: false,
            byAssociation: false,
            paper: false,
          },
          authorizedAt: "2026-11-12 09:30:00",
        })
      )
    );
    expect(screen.getByText("Autorisé par Aurélie (mère) le 12 novembre 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retirer l'autorisation" })).toBeInTheDocument();
  });

  it("indique que l'autorisation de l'autre parent a été saisie sur papier", () => {
    renderCard(
      createEvent(
        authorization({
          status: "authorized",
          authorizedBy: {
            name: "Aurélie",
            relation: "mère",
            byYou: false,
            byAssociation: false,
            paper: true,
          },
          authorizedAt: "2026-11-12 09:30:00",
        })
      )
    );

    expect(
      screen.getByText("Autorisé par Aurélie (mère), sur papier le 12 novembre 2026")
    ).toBeInTheDocument();
  });

  it("parent : autorisation saisie par l'association", () => {
    renderCard(
      createEvent(
        authorization({
          status: "authorized",
          authorizedBy: { name: null, relation: null, byYou: false, byAssociation: true, paper: false },
          authorizedAt: "2026-11-12 09:30:00",
        })
      )
    );
    expect(screen.getByText("Autorisé par l'association le 12 novembre 2026")).toBeInTheDocument();
  });

  it("avertit quand les informations ont changé et propose de confirmer à nouveau", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ success: true, authorization: authorization({ status: "authorized" }) })
    );
    renderCard(
      createEvent(
        authorization({
          status: "authorized",
          outdated: true,
          authorizedBy: {
            name: "Aurélie",
            relation: "mère",
            byYou: false,
            byAssociation: false,
            paper: false,
          },
          authorizedAt: "2026-11-12 09:30:00",
        })
      )
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Les informations ont changé depuis l'autorisation : vérifiez-les et confirmez à nouveau."
    );
    await user.click(screen.getByRole("button", { name: "J'autorise Léa à participer" }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(vi.mocked(fetch).mock.calls[0][1]?.body).toBe(
      JSON.stringify({ eventId: 8, authorize: true })
    );
  });

  it("ne montre pas l'avertissement quand rien n'a changé", () => {
    renderCard(
      createEvent(
        authorization({
          status: "authorized",
          authorizedBy: {
            name: "Aurélie",
            relation: "mère",
            byYou: false,
            byAssociation: false,
            paper: false,
          },
        })
      )
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("affiche l'erreur du serveur sans rafraîchir la carte", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: "Événement passé." }, 403));
    const { onUpdate } = renderCard(createEvent(authorization()));

    await user.click(screen.getByRole("button", { name: "J'autorise Léa à participer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Événement passé.");
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "J'autorise Léa à participer" })).toBeEnabled();
  });

  it("événement passé en délégation : aucune action, pas de message d'attente des parents", () => {
    renderCard(createEvent(authorization({ canAuthorize: false }), { date: "2020-01-10" }));
    const block = authorizationBlock();
    expect(within(block).getByText("Autorisation manquante")).toBeInTheDocument();
    expect(within(block).queryByRole("button")).not.toBeInTheDocument();
    expect(within(block).queryByText(/En attente de l'autorisation/)).not.toBeInTheDocument();
  });

  it("jeune : lecture seule, en attente de l'autorisation de ses parents", () => {
    renderCard(createEvent(authorization({ canAuthorize: false })), { profiles: [SELF] });
    const block = authorizationBlock();
    expect(within(block).getByText(DETAILS)).toBeInTheDocument();
    expect(within(block).getByText("Autorisation manquante")).toBeInTheDocument();
    expect(
      within(block).getByText("En attente de l'autorisation de vos parents")
    ).toBeInTheDocument();
    expect(within(block).queryByRole("button")).not.toBeInTheDocument();
  });

  it("jeune : voit qui a autorisé, sans aucune action", () => {
    renderCard(
      createEvent(
        authorization({
          status: "authorized",
          canAuthorize: false,
          authorizedBy: {
            name: "Aurélie",
            relation: "mère",
            byYou: false,
            byAssociation: false,
            paper: false,
          },
          authorizedAt: "2026-11-12 09:30:00",
        })
      ),
      { profiles: [SELF] }
    );
    const block = authorizationBlock();
    expect(
      within(block).getByText("Autorisé par Aurélie (mère) le 12 novembre 2026")
    ).toBeInTheDocument();
    expect(within(block).queryByRole("button")).not.toBeInTheDocument();
    expect(within(block).queryByText(/En attente/)).not.toBeInTheDocument();
  });
});

describe("Page Prestations : autorisations à traiter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("garde visible une sortie déjà répondue dont l'autorisation manque", async () => {
    const event = createEvent(authorization(), {
      response: { status: "present", comment: null, updated_at: "2026-11-01 10:00:00" },
    });
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ currentUserId: LEA.userId, events: [event] })
    );
    render(withSession(parentSession, <MusicianDisponibilites />));

    expect(
      await screen.findByRole("region", { name: "Autorisation parentale" })
    ).toBeInTheDocument();
    expect(screen.getByText("1 autorisation parentale à donner pour Léa")).toBeInTheDocument();
  });

  const answeredPresent = {
    response: { status: "present" as const, comment: null, updated_at: "2026-11-01 10:00:00" },
  };
  const grantedByOther = {
    status: "authorized" as const,
    authorizedBy: {
      name: "Aurélie",
      relation: "mère",
      byYou: false,
      byAssociation: false,
      paper: false,
    },
  };

  it("parent : garde la carte visible une fois autorisé, pour pouvoir retirer, sans compter en attente", async () => {
    const event = createEvent(authorization(grantedByOther), answeredPresent);
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ currentUserId: LEA.userId, events: [event] })
    );
    render(withSession(parentSession, <MusicianDisponibilites />));

    const block = await screen.findByRole("region", { name: "Autorisation parentale" });
    expect(
      within(block).getByRole("button", { name: "Retirer l'autorisation" })
    ).toBeInTheDocument();
    expect(screen.queryByText(/autorisation(s)? parentale(s)? à donner/)).not.toBeInTheDocument();
  });

  it("jeune : une autorisation donnée n'ajoute pas de carte", async () => {
    const event = createEvent(
      authorization({ ...grantedByOther, canAuthorize: false }),
      answeredPresent
    );
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ currentUserId: SELF.userId, events: [event] })
    );
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    expect(
      (await screen.findAllByText(/Vous avez répondu (pour|à) toutes les prestations/)).length
    ).toBeGreaterThan(0);
    expect(
      screen.queryByRole("region", { name: "Autorisation parentale" })
    ).not.toBeInTheDocument();
  });

  it("jeune : une autorisation manquante garde la carte visible, en attente des parents", async () => {
    const event = createEvent(authorization({ canAuthorize: false }), answeredPresent);
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ currentUserId: SELF.userId, events: [event] })
    );
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    expect(
      await screen.findByText("En attente de l'autorisation de vos parents")
    ).toBeInTheDocument();
    expect(screen.getByText("1 autorisation parentale en attente")).toBeInTheDocument();
  });

  it("mobile : la liste des réponses signale l'autorisation et ouvre la carte au toucher", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(() => true),
    }));
    const user = userEvent.setup();
    const event = createEvent(authorization(), answeredPresent);
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({ currentUserId: LEA.userId, events: [event] })
    );
    render(withSession(parentSession, <MusicianDisponibilites />));

    expect(await screen.findByText("Autorisation parentale manquante")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Autorisation parentale" })
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Modifier : Sortie à Provins/ }));
    expect(
      within(screen.getByRole("region", { name: "Autorisation parentale" })).getByRole("button", {
        name: "J'autorise Léa à participer",
      })
    ).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
