import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PresenceAdminClient } from "../PresenceAdmin";
import type { PresenceAuthorization } from "../presence-authorization";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const authorized: PresenceAuthorization = {
  status: "authorized",
  authorizedBy: { name: "Nathalie Leroy", relation: "mère", kind: "parent", paper: false },
  authorizedAt: "2026-11-12T17:30:00Z",
  outdated: false,
};
const outdated: PresenceAuthorization = { ...authorized, outdated: true };
const missing: PresenceAuthorization = {
  status: "missing",
  authorizedBy: null,
  authorizedAt: null,
  outdated: false,
};

function member(
  userId: number,
  firstName: string,
  lastName: string,
  authorization: PresenceAuthorization | null
) {
  return {
    userId,
    firstName,
    lastName,
    instruments: ["Clarinette"],
    primaryInstrument: "Clarinette",
    answers: {
      "42": {
        status: "present",
        comment: null,
        changedAfterDeadline: false,
        ...(authorization ? { authorization } : {}),
      },
    },
  };
}

const grid = {
  events: [
    {
      id: 42,
      title: "Sortie à la mer",
      date: "2026-12-01",
      response_deadline: "2026-11-25",
      parentalAuthorizationRequired: true,
      authorizationDetails: "Départ en car à 8 h, retour à 19 h.",
    },
    {
      id: 43,
      title: "Répétition",
      date: "2026-12-05",
      response_deadline: null,
      parentalAuthorizationRequired: false,
      authorizationDetails: null,
    },
  ],
  members: [
    member(1, "Hugo", "Leroy", authorized),
    member(2, "Noé", "Leroy", missing),
    member(3, "Camille", "Bernard", outdated),
    member(4, "Lucas", "Martin", null), // adulte non relié : non concerné
  ],
};

const guardianEntries = [
  {
    linkId: 1,
    userId: 100,
    firstName: "Nathalie",
    lastName: "Leroy",
    email: "nathalie@example.com",
    kind: "guardian",
    relation: "mère",
    isActive: true,
  },
  {
    linkId: 2,
    userId: 101,
    firstName: "Paul",
    lastName: "Leroy",
    email: "paul@example.com",
    kind: "guardian",
    relation: "père",
    isActive: true,
  },
];

const users = [
  {
    id: 100,
    email: "nathalie@example.com",
    role: "MUSICIAN",
    kind: "guardian",
    is_active: 1,
    first_name: "Nathalie",
    last_name: "Leroy",
    phone: "06 11 22 33 44",
  },
  {
    id: 1,
    email: "hugo@example.com",
    role: "MUSICIAN",
    kind: "member",
    is_active: 1,
    first_name: "Hugo",
    last_name: "Leroy",
    date_of_birth: "2010-05-10",
  },
  {
    id: 2,
    email: null,
    role: "MUSICIAN",
    kind: "managed",
    is_active: 1,
    first_name: "Noé",
    last_name: "Leroy",
    date_of_birth: "2018-02-01",
  },
  {
    id: 3,
    email: "camille@example.com",
    role: "MUSICIAN",
    kind: "member",
    is_active: 1,
    first_name: "Camille",
    last_name: "Bernard",
    date_of_birth: "2006-03-02",
  },
];
const links = [
  { linkId: 1, guardianUserId: 100, childUserId: 1, relation: "mère" },
  { linkId: 2, guardianUserId: 100, childUserId: 2, relation: "mère" },
  { linkId: 3, guardianUserId: 100, childUserId: 3, relation: "mère" },
];

interface Call {
  url: string;
  method: string;
  body: Record<string, unknown> | undefined;
}

function mockApi(options: { authorizationResponse?: Response } = {}) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: Parameters<typeof fetch>[1]) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({
        url,
        method,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      });
      if (url.startsWith("/api/admin/presence")) return json(grid);
      if (url === "/api/admin/authorizations") {
        return options.authorizationResponse ?? json({ success: true });
      }
      if (url.startsWith("/api/admin/guardians?userId=")) {
        return json({ guardians: guardianEntries, children: [] });
      }
      if (url === "/api/admin/guardians") return json({ links });
      if (url === "/api/admin/users") return json(users);
      return json({});
    })
  );
  return calls;
}

describe("PresenceAdminClient — autorisations parentales", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-27"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("repère chaque musicien concerné et résume l'événement dans l'en-tête", async () => {
    mockApi();
    render(<PresenceAdminClient />);

    await screen.findByRole("table");
    const hugo = screen.getByRole("button", { name: /Hugo Leroy — Sortie à la mer/ });
    expect(hugo.getAttribute("aria-label")).toContain(
      "Autorisation parentale : Autorisée par Nathalie (mère)"
    );
    expect(
      screen.getByRole("button", { name: /Noé Leroy — Sortie à la mer/ }).getAttribute("aria-label")
    ).toContain("Autorisation parentale : Autorisation manquante");
    expect(
      screen
        .getByRole("button", { name: /Camille Bernard — Sortie à la mer/ })
        .getAttribute("aria-label")
    ).toContain("Autorisée sur un texte antérieur");
    // Non concerné : aucune mention.
    expect(
      screen
        .getByRole("button", { name: /Lucas Martin — Sortie à la mer/ })
        .getAttribute("aria-label")
    ).not.toContain("Autorisation parentale");

    // 2 reçues (dont une antérieure) sur 3 concernés.
    expect(
      screen.getByRole("button", { name: /Autorisations parentales Sortie à la mer : 2 sur 3/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Autorisations parentales Répétition/ })
    ).toBeNull();
  });

  it("n'affiche aucune légende ni repère pour un événement qui n'en demande pas", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      json({ events: [grid.events[1]], members: [member(1, "Hugo", "Leroy", null)] })
    );
    render(<PresenceAdminClient />);

    await screen.findByRole("table");
    expect(screen.queryByText("Autorisation parentale reçue")).toBeNull();
    expect(screen.queryByRole("button", { name: /Autorisations parentales/ })).toBeNull();
  });

  describe("saisie papier et retrait", () => {
    it("enregistre une autorisation papier avec le responsable choisi", async () => {
      const user = userEvent.setup();
      const calls = mockApi();
      render(<PresenceAdminClient />);
      await user.click(await screen.findByRole("button", { name: /Noé Leroy — Sortie à la mer/ }));

      const panel = await screen.findByTestId("authorization-panel");
      expect(within(panel).getByText("Autorisation manquante")).toBeInTheDocument();
      expect(within(panel).getByText("Départ en car à 8 h, retour à 19 h.")).toBeInTheDocument();
      expect(within(panel).queryByRole("button", { name: /Retirer/ })).toBeNull();

      await user.click(
        within(panel).getByRole("button", { name: "Enregistrer une autorisation papier" })
      );
      const select = await within(panel).findByLabelText(/Responsable qui a signé/);
      await within(panel).findByRole("option", { name: "Nathalie Leroy (mère)" });
      await user.selectOptions(select, "100");
      await user.click(within(panel).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() =>
        expect(
          within(panel).getByText(/Autorisée par Nathalie \(mère\), saisie papier par un admin/)
        ).toBeInTheDocument()
      );
      expect(calls.find((call) => call.url === "/api/admin/authorizations")).toMatchObject({
        method: "POST",
        body: { eventId: 42, childUserId: 2, authorize: true, guardianUserId: 100 },
      });
      expect(calls.some((call) => call.url === "/api/admin/guardians?userId=2")).toBe(true);
    });

    it("met la grille à jour après la saisie", async () => {
      const user = userEvent.setup();
      mockApi();
      render(<PresenceAdminClient />);
      await user.click(await screen.findByRole("button", { name: /Noé Leroy — Sortie à la mer/ }));
      const panel = await screen.findByTestId("authorization-panel");
      await user.click(
        within(panel).getByRole("button", { name: "Enregistrer une autorisation papier" })
      );
      await within(panel).findByRole("option", { name: "Non précisé" });
      await user.click(within(panel).getByRole("button", { name: "Enregistrer" }));
      await waitFor(() =>
        expect(within(panel).getByText(/Autorisée, saisie papier par un admin/)).toBeInTheDocument()
      );
      await user.keyboard("{Escape}");

      await waitFor(() =>
        expect(
          screen
            .getByRole("button", { name: /Noé Leroy — Sortie à la mer/ })
            .getAttribute("aria-label")
        ).toContain("Autorisée, saisie papier par un admin")
      );
      expect(
        screen.getByRole("button", { name: /Autorisations parentales Sortie à la mer : 3 sur 3/ })
      ).toBeInTheDocument();
    });

    it("demande confirmation avant de retirer une autorisation", async () => {
      const user = userEvent.setup();
      const calls = mockApi();
      render(<PresenceAdminClient />);
      await user.click(await screen.findByRole("button", { name: /Hugo Leroy — Sortie à la mer/ }));

      const panel = await screen.findByTestId("authorization-panel");
      expect(within(panel).queryByRole("button", { name: /autorisation papier/ })).toBeNull();
      await user.click(within(panel).getByRole("button", { name: "Retirer l'autorisation" }));
      expect(within(panel).getByText(/Les parents devront la redonner/)).toBeInTheDocument();
      expect(calls.some((call) => call.url === "/api/admin/authorizations")).toBe(false);

      await user.click(within(panel).getByRole("button", { name: "Confirmer le retrait" }));

      await waitFor(() =>
        expect(within(panel).getByText("Autorisation manquante")).toBeInTheDocument()
      );
      expect(calls.find((call) => call.url === "/api/admin/authorizations")?.body).toEqual({
        eventId: 42,
        childUserId: 1,
        authorize: false,
      });
    });

    it("explique une autorisation donnée sur un texte antérieur et permet de la renouveler", async () => {
      const user = userEvent.setup();
      mockApi();
      render(<PresenceAdminClient />);
      await user.click(
        await screen.findByRole("button", { name: /Camille Bernard — Sortie à la mer/ })
      );

      const panel = await screen.findByTestId("authorization-panel");
      expect(
        within(panel).getByText(/Les informations données aux parents ont changé/)
      ).toBeInTheDocument();
      expect(
        within(panel).getByRole("button", { name: "Enregistrer une autorisation papier" })
      ).toBeInTheDocument();
      expect(
        within(panel).getByRole("button", { name: "Retirer l'autorisation" })
      ).toBeInTheDocument();
    });

    it("affiche l'erreur de l'API sans changer l'état", async () => {
      const user = userEvent.setup();
      mockApi({
        authorizationResponse: json({ error: "Cet événement n'demande pas d'autorisation." }, 409),
      });
      render(<PresenceAdminClient />);
      await user.click(await screen.findByRole("button", { name: /Noé Leroy — Sortie à la mer/ }));
      const panel = await screen.findByTestId("authorization-panel");
      await user.click(
        within(panel).getByRole("button", { name: "Enregistrer une autorisation papier" })
      );
      await within(panel).findByRole("option", { name: "Non précisé" });
      await user.click(within(panel).getByRole("button", { name: "Enregistrer" }));

      expect(await within(panel).findByRole("alert")).toHaveTextContent(
        "Cet événement n'demande pas d'autorisation."
      );
      expect(within(panel).getByText("Autorisation manquante")).toBeInTheDocument();
    });

    it("ne montre pas le panneau pour un musicien non concerné ou un autre événement", async () => {
      const user = userEvent.setup();
      mockApi();
      render(<PresenceAdminClient />);
      await user.click(
        await screen.findByRole("button", { name: /Lucas Martin — Sortie à la mer/ })
      );
      await screen.findByRole("dialog");
      expect(screen.queryByTestId("authorization-panel")).toBeNull();
    });
  });

  describe("liste imprimable", () => {
    async function openList() {
      const user = userEvent.setup();
      const calls = mockApi();
      render(<PresenceAdminClient />);
      await user.click(
        await screen.findByRole("button", { name: /Autorisations parentales Sortie à la mer/ })
      );
      return { user, calls };
    }

    it("remplace le tableau par la liste : manquantes avec téléphones, puis reçues", async () => {
      await openList();

      const list = await screen.findByTestId("authorizations-list");
      expect(screen.queryByText("Qui répond, qui ne répond jamais")).toBeNull();
      expect(
        within(list).getByRole("heading", { name: "Autorisations parentales : Sortie à la mer" })
      ).toBeInTheDocument();
      expect(
        within(list).getByText(/2 autorisées \(dont 1 sur un texte antérieur\) · 1 manquante/)
      ).toBeInTheDocument();
      expect(within(list).getByText("Départ en car à 8 h, retour à 19 h.")).toBeInTheDocument();

      const missingSection = within(list).getByRole("region", { name: /Manquantes \(1\)/ });
      const noeRow = within(missingSection).getByText("Noé Leroy").closest("tr") as HTMLElement;
      await waitFor(() => expect(within(noeRow).getByText("06 11 22 33 44")).toBeInTheDocument());
      expect(within(noeRow).getByText(/Nathalie Leroy/)).toBeInTheDocument();
      expect(within(noeRow).getByText("8")).toBeInTheDocument();

      const receivedSection = within(list).getByRole("region", { name: /Reçues \(2\)/ });
      const camilleRow = within(receivedSection)
        .getByText("Camille Bernard")
        .closest("tr") as HTMLElement;
      expect(within(camilleRow).getByText("par Nathalie (mère)")).toBeInTheDocument();
      expect(within(camilleRow).getByText("12/11/2026")).toBeInTheDocument();
      expect(within(camilleRow).getByText("Autorisée sur un texte antérieur")).toBeInTheDocument();
      // Le musicien non concerné n'y figure pas.
      expect(within(list).queryByText("Lucas Martin")).toBeNull();
    });

    it("charge les coordonnées une seule fois et n'imprime que la liste", async () => {
      const { user, calls } = await openList();
      const print = vi.fn();
      vi.stubGlobal("print", print);

      const list = await screen.findByTestId("authorizations-list");
      await waitFor(() => expect(calls.some((call) => call.url === "/api/admin/users")).toBe(true));
      const button = within(list).getByRole("button", { name: /Imprimer/ });
      expect(button.className).toContain("print:hidden");
      expect(within(list).getByRole("button", { name: /Retour au tableau/ }).className).toContain(
        "print:hidden"
      );
      await user.click(button);
      expect(print).toHaveBeenCalledTimes(1);
    });

    it("revient au tableau avec « Retour au tableau »", async () => {
      const { user } = await openList();
      await user.click(await screen.findByRole("button", { name: /Retour au tableau/ }));

      expect(await screen.findByRole("table")).toBeInTheDocument();
      expect(screen.queryByTestId("authorizations-list")).toBeNull();
    });

    it("garde la liste utilisable si les coordonnées ne se chargent pas", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const user = userEvent.setup();
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string | URL | Request) => {
          const url = String(input);
          if (url.startsWith("/api/admin/presence")) return json(grid);
          return json({ error: "Erreur" }, 500);
        })
      );
      render(<PresenceAdminClient />);
      await user.click(
        await screen.findByRole("button", { name: /Autorisations parentales Sortie à la mer/ })
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Les téléphones des parents n'ont pas pu être chargés."
      );
      const list = screen.getByTestId("authorizations-list");
      expect(within(list).getByText("Noé Leroy")).toBeInTheDocument();
      expect(within(list).getAllByText("Aucun responsable").length).toBeGreaterThan(0);
    });
  });
});
