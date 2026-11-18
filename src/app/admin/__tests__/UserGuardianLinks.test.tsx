import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ManagedAccountNotice } from "../ManagedAccountNotice";
import { UserGuardianLinks } from "../UserGuardianLinks";
import type { GuardianLinkEntry } from "../guardians-client";
import type { UserWithProfile } from "../users-shared";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function entry(overrides: Partial<GuardianLinkEntry> = {}): GuardianLinkEntry {
  return {
    linkId: 11,
    userId: 20,
    firstName: "Marie",
    lastName: "Dupont",
    email: "marie@example.com",
    kind: "guardian",
    relation: "mère",
    isActive: true,
    ...overrides,
  };
}

function account(overrides: Partial<UserWithProfile> = {}): UserWithProfile {
  return {
    id: 1,
    email: "lea@example.com",
    role: "MUSICIAN",
    kind: "member",
    is_active: 1,
    first_name: "Léa",
    last_name: "Dupont",
    ...overrides,
  };
}

interface Call {
  url: string;
  method: string;
  body: unknown;
}

/** Simule /api/admin/guardians : renvoie `links` en GET, puis la réponse donnée pour chaque écriture. */
function mockGuardiansApi(options: {
  guardians?: GuardianLinkEntry[];
  children?: GuardianLinkEntry[];
  onGet?: (count: number) => Response;
  onWrite?: (call: Call) => Response;
  /** Valeur effective du droit à l'image relue après une saisie (GET /api/admin/users?id=). */
  effectiveConsent?: number | null;
}) {
  const calls: Call[] = [];
  let getCount = 0;
  const fetchMock = vi.fn(
    async (input: string | URL | Request, init?: Parameters<typeof fetch>[1]) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      const call = { url, method, body };
      calls.push(call);
      if (method === "GET" && url.startsWith("/api/admin/users")) {
        return jsonResponse({ image_consent: options.effectiveConsent ?? null });
      }
      if (method === "GET") {
        getCount += 1;
        if (options.onGet) return options.onGet(getCount);
        return jsonResponse({
          guardians: options.guardians ?? [],
          children: options.children ?? [],
        });
      }
      return options.onWrite ? options.onWrite(call) : jsonResponse({ success: true });
    }
  );
  vi.stubGlobal("fetch", fetchMock);
  return { calls, writes: () => calls.filter((call) => call.method !== "GET") };
}

const directory: UserWithProfile[] = [
  account(),
  account({ id: 20, email: "marie@example.com", kind: "guardian", first_name: "Marie" }),
  account({ id: 21, email: "paul@example.com", first_name: "Paul", last_name: "Durand" }),
  account({ id: 22, email: "admin@example.com", role: "ADMIN", first_name: "Alice" }),
  account({ id: 23, email: null, kind: "managed", first_name: "Tom", last_name: "Géré" }),
  account({ id: 24, email: "inactif@example.com", is_active: 0, first_name: "Ines" }),
];

function renderLinks(props: Partial<React.ComponentProps<typeof UserGuardianLinks>> = {}): Required<
  Pick<React.ComponentProps<typeof UserGuardianLinks>, "onLinksChanged">
> & {
  onAccountChanged: ReturnType<typeof vi.fn>;
  onLinksChanged: ReturnType<typeof vi.fn>;
} {
  const onLinksChanged = vi.fn();
  const onAccountChanged = vi.fn();
  render(
    <UserGuardianLinks
      user={account()}
      users={directory}
      canManageAccounts
      onLinksChanged={onLinksChanged}
      onAccountChanged={onAccountChanged}
      {...props}
    />
  );
  return { onLinksChanged, onAccountChanged };
}

describe("UserGuardianLinks", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("fiche d'un musicien", () => {
    it("liste les responsables avec lien de parenté, e-mail et marqueur d'inactivité", async () => {
      mockGuardiansApi({
        guardians: [
          entry(),
          entry({
            linkId: 12,
            userId: 21,
            firstName: "Paul",
            lastName: "Dupont",
            email: "paul@example.com",
            relation: null,
            isActive: false,
          }),
        ],
      });
      renderLinks();

      expect(screen.getByRole("heading", { name: "Responsables légaux" })).toBeTruthy();
      expect(await screen.findByText("Marie Dupont")).toBeTruthy();
      expect(screen.getByText(/mère/)).toBeTruthy();
      expect(screen.getByText("marie@example.com")).toBeTruthy();
      expect(screen.getByText("Compte inactif")).toBeTruthy();
    });

    it("propose toutes les actions à un super-administrateur", async () => {
      mockGuardiansApi({});
      renderLinks({ canManageAccounts: true });

      expect(await screen.findByText("Aucun responsable légal.")).toBeTruthy();
      expect(screen.getByRole("button", { name: /Lier un compte existant/ })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Créer un responsable/ })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Transférer l'adresse à un parent/ })).toBeTruthy();
    });

    it("ne laisse à un administrateur que le lien et le retrait", async () => {
      mockGuardiansApi({ guardians: [entry()] });
      renderLinks({ canManageAccounts: false });

      expect(await screen.findByText("Marie Dupont")).toBeTruthy();
      expect(screen.getByRole("button", { name: /Lier un compte existant/ })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Retirer Marie Dupont" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Créer un responsable/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /Transférer l'adresse/ })).toBeNull();
      expect(screen.getByText(/réservé aux super-administrateurs/)).toBeTruthy();
    });

    it("masque le transfert d'adresse pour un compte géré et alerte s'il n'a aucun responsable", async () => {
      mockGuardiansApi({});
      renderLinks({ user: account({ id: 23, email: null, kind: "managed" }) });

      expect(
        await screen.findByText(/aucun responsable : personne ne peut ouvrir son/)
      ).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Transférer l'adresse/ })).toBeNull();
      expect(screen.getByRole("button", { name: /Créer un responsable/ })).toBeTruthy();
    });

    it("prévient quand le musicien est majeur et a encore un responsable", async () => {
      mockGuardiansApi({ guardians: [entry()] });
      renderLinks({ user: account({ date_of_birth: "1990-01-01" }) });

      expect(await screen.findByText(/Ce musicien est majeur/)).toBeTruthy();
    });

    it("n'affiche rien pour un compte administrateur", () => {
      mockGuardiansApi({});
      renderLinks({ user: account({ role: "ADMIN" }) });

      expect(screen.queryByTestId("guardian-links")).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe("droit à l'image des responsables", () => {
    const answered = [
      entry({ linkId: 11, userId: 20, imageConsent: 1, imageConsentRecordedByAdmin: false }),
      entry({
        linkId: 12,
        userId: 21,
        firstName: "Paul",
        lastName: "Dupont",
        email: "paul@example.com",
        relation: "père",
        imageConsent: 0,
        imageConsentRecordedByAdmin: true,
      }),
      entry({
        linkId: 13,
        userId: 22,
        firstName: "Rita",
        lastName: "Dupont",
        email: "rita@example.com",
        relation: "tante",
        imageConsent: null,
      }),
    ];

    function rowOf(name: string): HTMLElement {
      return screen.getByText(name, { exact: false }).closest("li") as HTMLElement;
    }

    it("montre la réponse de chaque responsable : oui, non, pas de réponse, saisi par un admin", async () => {
      mockGuardiansApi({ guardians: answered });
      renderLinks({ user: account({ image_consent: 0 }) });

      await screen.findByText("Marie Dupont");
      expect(within(rowOf("Marie Dupont")).getByText("Oui")).toBeInTheDocument();
      expect(within(rowOf("Marie Dupont")).queryByText("saisi par un admin")).toBeNull();
      expect(within(rowOf("Paul Dupont")).getByText("Non")).toBeInTheDocument();
      expect(within(rowOf("Paul Dupont")).getByText("saisi par un admin")).toBeInTheDocument();
      expect(within(rowOf("Rita Dupont")).getByText("Pas de réponse")).toBeInTheDocument();
      expect(screen.getByTestId("image-consent-summary")).toHaveTextContent(
        "Droit à l'image appliqué : refusé"
      );
    });

    it("n'affiche pas ces réponses dans la fiche d'un responsable", async () => {
      mockGuardiansApi({ children: [entry({ linkId: 31, userId: 1, kind: "member" })] });
      renderLinks({ user: account({ id: 20, kind: "guardian" }) });

      await screen.findByText("Marie Dupont");
      expect(screen.queryByText("Droit à l'image :")).toBeNull();
      expect(screen.queryByTestId("image-consent-summary")).toBeNull();
    });

    it("laisse un super-administrateur saisir une réponse papier, puis relit la valeur effective", async () => {
      const user = userEvent.setup();
      const api = mockGuardiansApi({ guardians: answered, effectiveConsent: 0 });
      const { onLinksChanged } = renderLinks({ user: account({ image_consent: 1 }) });

      await user.click(
        await screen.findByRole("button", { name: "Saisir la réponse de Rita Dupont" })
      );
      expect(screen.getByText(/Réponse reçue sur papier de Rita Dupont/)).toBeInTheDocument();
      // Rien à effacer tant qu'il n'y a pas de réponse.
      expect(screen.queryByRole("button", { name: "Effacer la réponse" })).toBeNull();
      await user.click(screen.getByRole("button", { name: "N'autorise pas" }));

      await waitFor(() => expect(onLinksChanged).toHaveBeenCalled());
      expect(api.writes()).toEqual([
        {
          url: "/api/admin/guardians?action=image-consent",
          method: "POST",
          body: { childUserId: 1, guardianUserId: 22, consent: 0 },
        },
      ]);
      expect(onLinksChanged.mock.calls[0][0]).toMatchObject({ imageConsent: 0 });
    });

    it("permet d'effacer une réponse déjà saisie", async () => {
      const user = userEvent.setup();
      const api = mockGuardiansApi({ guardians: answered });
      renderLinks();

      await user.click(
        await screen.findByRole("button", { name: "Saisir la réponse de Paul Dupont" })
      );
      await user.click(screen.getByRole("button", { name: "Effacer la réponse" }));

      await waitFor(() => expect(api.writes()).toHaveLength(1));
      expect(api.writes()[0].body).toEqual({ childUserId: 1, guardianUserId: 21, consent: null });
    });

    it("affiche l'erreur de l'API si la saisie échoue", async () => {
      const user = userEvent.setup();
      mockGuardiansApi({
        guardians: answered,
        onWrite: () => jsonResponse({ error: "Ce responsable n'est plus relié." }, 409),
      });
      renderLinks();

      await user.click(
        await screen.findByRole("button", { name: "Saisir la réponse de Rita Dupont" })
      );
      await user.click(screen.getByRole("button", { name: "Autorise" }));

      expect(await screen.findByText("Ce responsable n'est plus relié.")).toBeInTheDocument();
    });

    it("n'offre pas la saisie à un administrateur, qui voit quand même les réponses", async () => {
      mockGuardiansApi({ guardians: answered });
      renderLinks({ canManageAccounts: false });

      await screen.findByText("Marie Dupont");
      expect(within(rowOf("Marie Dupont")).getByText("Oui")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Saisir la réponse/ })).toBeNull();
    });
  });

  describe("fiche d'un responsable", () => {
    it("affiche le bloc « Enfants » sans action de création", async () => {
      mockGuardiansApi({
        children: [
          entry({ linkId: 31, userId: 1, firstName: "Léa", lastName: "Dupont", kind: "member" }),
        ],
      });
      renderLinks({ user: account({ id: 20, kind: "guardian" }) });

      expect(screen.getByRole("heading", { name: "Enfants" })).toBeTruthy();
      expect(await screen.findByText("Léa Dupont")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Retirer Léa Dupont" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Lier un compte existant/ })).toBeNull();
      expect(screen.queryByRole("button", { name: /Créer un responsable/ })).toBeNull();
    });
  });

  describe("retrait d'un lien", () => {
    it("demande confirmation puis supprime le lien et recharge", async () => {
      const user = userEvent.setup();
      const api = mockGuardiansApi({ guardians: [entry()] });
      const { onLinksChanged } = renderLinks();

      await user.click(await screen.findByRole("button", { name: "Retirer Marie Dupont" }));
      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText(/ne pourra plus agir pour Léa Dupont/)).toBeTruthy();
      expect(api.writes()).toHaveLength(0);

      await user.click(within(dialog).getByRole("button", { name: "Retirer" }));

      await waitFor(() => expect(onLinksChanged).toHaveBeenCalled());
      expect(api.writes()).toEqual([
        { url: "/api/admin/guardians?id=11", method: "DELETE", body: undefined },
      ]);
    });

    it("avertit quand on retire le dernier responsable d'un compte géré", async () => {
      const user = userEvent.setup();
      mockGuardiansApi({ guardians: [entry()] });
      renderLinks({ user: account({ id: 23, email: null, kind: "managed" }) });

      await user.click(await screen.findByRole("button", { name: "Retirer Marie Dupont" }));
      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText(/plus personne ne pourra ouvrir son espace/)).toBeTruthy();
    });

    it("ne remplace pas les noms de la fiche si le rechargement échoue après le retrait", async () => {
      const user = userEvent.setup();
      const api = mockGuardiansApi({
        guardians: [entry()],
        onGet: (count) =>
          count === 1
            ? jsonResponse({ guardians: [entry()], children: [] })
            : jsonResponse({ error: "Session expirée." }, 401),
      });
      const { onLinksChanged } = renderLinks();

      await user.click(await screen.findByRole("button", { name: "Retirer Marie Dupont" }));
      await user.click(
        within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Retirer" })
      );

      expect(await screen.findByRole("alert")).toHaveTextContent("Session expirée.");
      expect(api.writes()).toHaveLength(1);
      expect(onLinksChanged).not.toHaveBeenCalled();
    });

    it("affiche l'erreur de l'API si le retrait échoue", async () => {
      const user = userEvent.setup();
      mockGuardiansApi({
        guardians: [entry()],
        onWrite: () => jsonResponse({ error: "Ce lien est introuvable." }, 404),
      });
      renderLinks();

      await user.click(await screen.findByRole("button", { name: "Retirer Marie Dupont" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Retirer" }));

      expect(await screen.findByText("Ce lien est introuvable.")).toBeTruthy();
    });
  });

  describe("lier un compte existant", () => {
    it("ne propose ni administrateurs, ni comptes gérés, ni inactifs, ni l'enfant, ni les déjà liés", async () => {
      const user = userEvent.setup();
      mockGuardiansApi({ guardians: [entry({ userId: 20 })] });
      renderLinks();

      await user.click(await screen.findByRole("button", { name: /Lier un compte existant/ }));
      const search = screen.getByLabelText("Compte du responsable");

      await user.type(search, "example.com");
      const options = await screen.findAllByRole("option");
      expect(options.map((option) => option.textContent)).toEqual([
        expect.stringContaining("paul@example.com"),
      ]);
      await user.clear(search);
      await user.type(search, "Alice");
      expect(await screen.findByText(/Aucun compte trouvé/)).toBeTruthy();
      await user.clear(search);
      await user.type(search, "Tom");
      expect(await screen.findByText(/Aucun compte trouvé/)).toBeTruthy();
    });

    it("envoie le lien avec le lien de parenté puis recharge", async () => {
      const user = userEvent.setup();
      const api = mockGuardiansApi({});
      const { onLinksChanged } = renderLinks();

      await user.click(await screen.findByRole("button", { name: /Lier un compte existant/ }));
      await user.type(screen.getByLabelText("Compte du responsable"), "paul");
      await user.click(await screen.findByRole("option", { name: /Paul Durand/ }));
      await user.type(screen.getByLabelText(/Lien de parenté/), "père");
      await user.click(screen.getByRole("button", { name: "Lier ce compte" }));

      await waitFor(() => expect(onLinksChanged).toHaveBeenCalled());
      expect(api.writes()).toEqual([
        {
          url: "/api/admin/guardians",
          method: "POST",
          body: { childUserId: 1, guardianUserId: 21, relation: "père" },
        },
      ]);
    });

    it("montre l'erreur de l'API sans fermer le formulaire", async () => {
      const user = userEvent.setup();
      mockGuardiansApi({
        onWrite: () => jsonResponse({ error: "Ce responsable est déjà lié à ce musicien." }, 409),
      });
      renderLinks();

      await user.click(await screen.findByRole("button", { name: /Lier un compte existant/ }));
      await user.type(screen.getByLabelText("Compte du responsable"), "paul");
      await user.click(await screen.findByRole("option", { name: /Paul Durand/ }));
      await user.click(screen.getByRole("button", { name: "Lier ce compte" }));

      expect(await screen.findByText("Ce responsable est déjà lié à ce musicien.")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Lier ce compte" })).toBeTruthy();
    });
  });

  describe("créer un responsable", () => {
    async function fillForm(user: ReturnType<typeof userEvent.setup>) {
      await user.click(await screen.findByRole("button", { name: /Créer un responsable/ }));
      await user.type(screen.getByLabelText("Prénom *"), "Marie");
      await user.type(screen.getByLabelText("Nom *"), "Dupont");
      await user.type(screen.getByLabelText("E-mail *"), "marie@example.com");
      await user.type(screen.getByLabelText("Téléphone"), "0612345678");
      await user.type(screen.getByLabelText(/Lien de parenté/), "mère");
    }

    it("crée le compte avec toutes les coordonnées", async () => {
      const user = userEvent.setup();
      const api = mockGuardiansApi({
        onWrite: () => jsonResponse({ success: true, guardianUserId: 50 }),
      });
      const { onLinksChanged } = renderLinks();

      await fillForm(user);
      await user.click(screen.getByRole("button", { name: "Créer le responsable" }));

      await waitFor(() => expect(onLinksChanged).toHaveBeenCalled());
      expect(api.writes()).toEqual([
        {
          url: "/api/admin/guardians?action=create-guardian",
          method: "POST",
          body: {
            childUserId: 1,
            firstName: "Marie",
            lastName: "Dupont",
            email: "marie@example.com",
            phone: "0612345678",
            relation: "mère",
          },
        },
      ]);
    });

    it("propose de lier le compte existant quand l'adresse est déjà utilisée", async () => {
      const user = userEvent.setup();
      let writes = 0;
      const api = mockGuardiansApi({
        onWrite: () => {
          writes += 1;
          return writes === 1
            ? jsonResponse({ error: "Cette adresse est déjà utilisée.", existingUserId: 21 }, 409)
            : jsonResponse({ success: true });
        },
      });
      const { onLinksChanged } = renderLinks();

      await fillForm(user);
      await user.click(screen.getByRole("button", { name: "Créer le responsable" }));

      expect(await screen.findByText("Cette adresse est déjà utilisée.")).toBeTruthy();
      expect(screen.getByText(/appartient déjà à Paul Durand/)).toBeTruthy();
      await user.click(screen.getByRole("button", { name: /Lier ce compte existant/ }));

      await waitFor(() => expect(onLinksChanged).toHaveBeenCalled());
      expect(api.writes()[1]).toEqual({
        url: "/api/admin/guardians",
        method: "POST",
        body: { childUserId: 1, guardianUserId: 21, relation: "mère" },
      });
    });
  });

  describe("transférer l'adresse à un parent", () => {
    it("explique les effets et n'agit qu'après confirmation (nouveau parent)", async () => {
      const user = userEvent.setup();
      const api = mockGuardiansApi({
        onWrite: () => jsonResponse({ success: true, guardianUserId: 60 }),
      });
      const { onAccountChanged } = renderLinks();

      await user.click(
        await screen.findByRole("button", { name: /Transférer l'adresse à un parent/ })
      );
      await user.type(screen.getByLabelText("Prénom du parent *"), "Marie");
      await user.type(screen.getByLabelText("Nom du parent *"), "Dupont");
      await user.type(screen.getByLabelText(/Lien de parenté/), "mère");
      await user.click(screen.getByRole("button", { name: "Continuer" }));

      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText("lea@example.com")).toBeTruthy();
      expect(within(dialog).getByText(/n'aura plus de connexion personnelle/)).toBeTruthy();
      expect(
        within(dialog).getByText(/connexions en cours de Léa Dupont sont fermées/)
      ).toBeTruthy();
      expect(api.writes()).toHaveLength(0);

      await user.click(within(dialog).getByRole("button", { name: "Transférer l'adresse" }));

      await waitFor(() => expect(onAccountChanged).toHaveBeenCalledTimes(1));
      expect(api.writes()).toEqual([
        {
          url: "/api/admin/guardians?action=handover",
          method: "POST",
          body: { childUserId: 1, firstName: "Marie", lastName: "Dupont", relation: "mère" },
        },
      ]);
      expect(onAccountChanged.mock.calls[0][0]).toContain("lea@example.com");
    });

    it("ne fait rien si on annule la confirmation", async () => {
      const user = userEvent.setup();
      const api = mockGuardiansApi({});
      const { onAccountChanged } = renderLinks();

      await user.click(
        await screen.findByRole("button", { name: /Transférer l'adresse à un parent/ })
      );
      await user.type(screen.getByLabelText("Prénom du parent *"), "Marie");
      await user.type(screen.getByLabelText("Nom du parent *"), "Dupont");
      await user.click(screen.getByRole("button", { name: "Continuer" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Annuler" }));

      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
      expect(api.writes()).toHaveLength(0);
      expect(onAccountChanged).not.toHaveBeenCalled();
    });

    it("indique que l'adresse de l'enfant est abandonnée quand le parent a déjà un compte", async () => {
      const user = userEvent.setup();
      const api = mockGuardiansApi({
        onWrite: () =>
          jsonResponse({ success: true, guardianUserId: 21, previousEmail: "lea@example.com" }),
      });
      const { onAccountChanged } = renderLinks();

      await user.click(
        await screen.findByRole("button", { name: /Transférer l'adresse à un parent/ })
      );
      await user.click(screen.getByRole("radio", { name: "Le parent a déjà un compte" }));
      await user.type(screen.getByLabelText("Compte du parent"), "paul");
      await user.click(await screen.findByRole("option", { name: /Paul Durand/ }));
      await user.click(screen.getByRole("button", { name: "Continuer" }));

      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText(/est abandonnée/)).toBeTruthy();
      await user.click(within(dialog).getByRole("button", { name: "Transférer l'adresse" }));

      await waitFor(() => expect(onAccountChanged).toHaveBeenCalledTimes(1));
      expect(api.writes()[0].body).toEqual({ childUserId: 1, guardianUserId: 21, relation: "" });
      expect(onAccountChanged.mock.calls[0][0]).toContain("L'ancienne adresse lea@example.com");
    });

    it("affiche l'erreur de l'API et laisse le formulaire ouvert", async () => {
      const user = userEvent.setup();
      mockGuardiansApi({
        onWrite: () =>
          jsonResponse({ error: "Cette action est réservée aux super-administrateurs." }, 403),
      });
      const { onAccountChanged } = renderLinks();

      await user.click(
        await screen.findByRole("button", { name: /Transférer l'adresse à un parent/ })
      );
      await user.type(screen.getByLabelText("Prénom du parent *"), "Marie");
      await user.type(screen.getByLabelText("Nom du parent *"), "Dupont");
      await user.click(screen.getByRole("button", { name: "Continuer" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: "Transférer l'adresse" }));

      expect(
        await screen.findByText("Cette action est réservée aux super-administrateurs.")
      ).toBeTruthy();
      expect(onAccountChanged).not.toHaveBeenCalled();
    });
  });
});

describe("ManagedAccountNotice", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("remplace l'e-mail par « Pas de connexion, géré par … »", () => {
    render(
      <ManagedAccountNotice
        userId={23}
        name="Tom Géré"
        guardianNames="Marie Dupont, Paul Dupont"
        canGiveAccess
        onGiven={vi.fn()}
      />
    );

    expect(screen.getByText(/Pas de connexion, géré par/)).toBeTruthy();
    expect(screen.getByText("Marie Dupont, Paul Dupont")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Donner un accès personnel" })).toBeTruthy();
  });

  it("cache l'action à un administrateur", () => {
    render(
      <ManagedAccountNotice
        userId={23}
        name="Tom Géré"
        guardianNames={null}
        canGiveAccess={false}
        onGiven={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: "Donner un accès personnel" })).toBeNull();
    expect(screen.getByText(/aucun responsable pour le moment/)).toBeTruthy();
    expect(screen.getByText(/Seul un super-administrateur/)).toBeTruthy();
  });

  it("donne un accès personnel avec l'adresse saisie", async () => {
    const user = userEvent.setup();
    const api = mockGuardiansApi({ onWrite: () => jsonResponse({ success: true, userId: 23 }) });
    const onGiven = vi.fn();
    render(
      <ManagedAccountNotice
        userId={23}
        name="Tom Géré"
        guardianNames="Marie Dupont"
        canGiveAccess
        onGiven={onGiven}
      />
    );

    await user.click(screen.getByRole("button", { name: "Donner un accès personnel" }));
    await user.type(screen.getByLabelText("Adresse e-mail de Tom Géré"), "Tom@Example.com");
    await user.click(screen.getByRole("button", { name: "Donner l'accès" }));

    await waitFor(() => expect(onGiven).toHaveBeenCalledTimes(1));
    expect(api.writes()).toEqual([
      {
        url: "/api/admin/guardians?action=give-access",
        method: "POST",
        body: { childUserId: 23, email: "Tom@Example.com" },
      },
    ]);
    expect(onGiven.mock.calls[0][0]).toContain("tom@example.com");
  });

  it("montre l'erreur renvoyée quand l'adresse est déjà prise", async () => {
    const user = userEvent.setup();
    mockGuardiansApi({
      onWrite: () => jsonResponse({ error: "Cette adresse e-mail est déjà utilisée." }, 409),
    });
    const onGiven = vi.fn();
    render(
      <ManagedAccountNotice
        userId={23}
        name="Tom Géré"
        guardianNames="Marie Dupont"
        canGiveAccess
        onGiven={onGiven}
      />
    );

    await user.click(screen.getByRole("button", { name: "Donner un accès personnel" }));
    await user.type(screen.getByLabelText("Adresse e-mail de Tom Géré"), "paul@example.com");
    await user.click(screen.getByRole("button", { name: "Donner l'accès" }));

    expect(await screen.findByText("Cette adresse e-mail est déjà utilisée.")).toBeTruthy();
    expect(onGiven).not.toHaveBeenCalled();
  });
});
