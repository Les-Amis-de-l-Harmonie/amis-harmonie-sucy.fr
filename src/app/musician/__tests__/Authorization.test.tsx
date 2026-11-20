import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicianDisponibilites } from "../MusicianDisponibilites";
import { PresenceDetail } from "../PresenceSheet";
import type { PresenceAuthorization, PresenceEvent } from "../musician-types";
import { GUARDIAN_SELF, LEA, SELF, withSession } from "./session-fixtures";

// Le bouton principal d'une ligne commence par la date ; les boutons rapides, eux, par la réponse.
const ROW_PROVINS = /^[A-Z][a-zé]{2}\. 20 juin/;

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

const saver = { save: vi.fn(), pending: {}, errors: {} };

function renderCard(
  event: PresenceEvent,
  session: Parameters<typeof withSession>[0] = parentSession
) {
  const onUpdate = vi.fn();
  render(
    withSession(
      session,
      <PresenceDetail event={event} currentUserId={null} onUpdate={onUpdate} saver={saver} />
    )
  );
  return { onUpdate };
}

function authorizationBlock() {
  return screen.getByRole("region", { name: "Autorisation parentale" });
}

describe("Autorisation parentale dans la feuille de détail", () => {
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

  it("parent : autoriser envoie la demande puis rafraîchit l'événement", async () => {
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
          authorizedBy: {
            name: null,
            relation: null,
            byYou: true,
            byAssociation: false,
            paper: false,
          },
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
          authorizedBy: {
            name: null,
            relation: null,
            byYou: false,
            byAssociation: true,
            paper: false,
          },
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

  it("affiche l'erreur du serveur sans rafraîchir l'événement", async () => {
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

  function mockEvent(event: PresenceEvent, currentUserId: number) {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ currentUserId, events: [event] }));
  }

  it("garde visible une sortie déjà répondue dont l'autorisation manque, et ouvre le bloc au toucher de la ligne", async () => {
    const user = userEvent.setup();
    mockEvent(createEvent(authorization(), answeredPresent), LEA.userId);
    render(withSession(parentSession, <MusicianDisponibilites />));

    const row = await screen.findByRole("button", { name: ROW_PROVINS });
    expect(row).toHaveTextContent("Autorisation parentale manquante");
    expect(screen.getByText("1 autorisation parentale à donner pour Léa")).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Autorisation parentale" })
    ).not.toBeInTheDocument();

    await user.click(row);

    const block = await screen.findByRole("region", { name: "Autorisation parentale" });
    expect(
      within(block).getByRole("button", { name: "J'autorise Léa à participer" })
    ).toBeInTheDocument();
  });

  it("parent : une autorisation donnée reste visible pour pouvoir la retirer, sans compter en attente", async () => {
    const user = userEvent.setup();
    mockEvent(createEvent(authorization(grantedByOther), answeredPresent), LEA.userId);
    render(withSession(parentSession, <MusicianDisponibilites />));

    const row = await screen.findByRole("button", { name: ROW_PROVINS });
    expect(row).toHaveTextContent("Autorisation parentale donnée");
    expect(screen.queryByText(/autorisation(s)? parentale(s)? à donner/)).not.toBeInTheDocument();

    await user.click(row);
    const block = await screen.findByRole("region", { name: "Autorisation parentale" });
    expect(
      within(block).getByRole("button", { name: "Retirer l'autorisation" })
    ).toBeInTheDocument();
  });

  it("jeune : une autorisation donnée n'ajoute aucun indicateur sur la ligne", async () => {
    mockEvent(
      createEvent(authorization({ ...grantedByOther, canAuthorize: false }), answeredPresent),
      SELF.userId
    );
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const row = await screen.findByRole("button", { name: ROW_PROVINS });
    expect(row).not.toHaveTextContent(/Autorisation parentale/);
    expect(
      screen.getByText("Vous avez répondu pour toutes les prestations à venir")
    ).toBeInTheDocument();
    expect(screen.queryByText(/autorisation(s)? parentale(s)? en attente/)).not.toBeInTheDocument();
  });

  it("jeune : une autorisation manquante est signalée sur la ligne, en attente des parents", async () => {
    const user = userEvent.setup();
    mockEvent(createEvent(authorization({ canAuthorize: false }), answeredPresent), SELF.userId);
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const row = await screen.findByRole("button", { name: ROW_PROVINS });
    expect(row).toHaveTextContent("Autorisation parentale manquante");
    expect(screen.getByText("1 autorisation parentale en attente")).toBeInTheDocument();

    await user.click(row);
    expect(
      await screen.findByText("En attente de l'autorisation de vos parents")
    ).toBeInTheDocument();
  });

  it("autoriser dans la feuille met à jour l'indicateur de la ligne", async () => {
    const user = userEvent.setup();
    const granted = authorization({
      status: "authorized",
      authorizedBy: { name: null, relation: null, byYou: true, byAssociation: false, paper: false },
      authorizedAt: "2026-11-18 10:00:00",
    });
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        jsonResponse({
          currentUserId: LEA.userId,
          events: [createEvent(authorization(), answeredPresent)],
        })
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, authorization: granted }));
    render(withSession(parentSession, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: ROW_PROVINS }));
    await user.click(await screen.findByRole("button", { name: "J'autorise Léa à participer" }));

    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(await screen.findByRole("button", { name: ROW_PROVINS })).toHaveTextContent(
      "Autorisation parentale donnée"
    );
    expect(screen.queryByText(/autorisation(s)? parentale(s)? à donner/)).not.toBeInTheDocument();
  });
});
