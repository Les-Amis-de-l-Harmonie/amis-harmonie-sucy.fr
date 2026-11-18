import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UsersAdminClient } from "../UsersAdmin";
import type { UserWithProfile } from "../users-shared";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

const users: UserWithProfile[] = [
  account({ id: 1, guardian_names: "Marie Dupont", date_of_birth: "1990-03-02" }),
  account({
    id: 2,
    email: "marie@example.com",
    kind: "guardian",
    first_name: "Marie",
    last_name: "Dupont",
    children_names: "Léa Dupont",
  }),
  account({
    id: 3,
    email: null,
    kind: "managed",
    first_name: "Tom",
    last_name: "Petit",
    guardian_names: "Marie Dupont",
    date_of_birth: "2015-06-01",
  }),
  account({
    id: 4,
    email: "paul@example.com",
    first_name: "Paul",
    last_name: "Durand",
    children_names: "Tom Petit, Léa Dupont",
  }),
];

interface Call {
  url: string;
  method: string;
  body: unknown;
}

function mockApi() {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: Parameters<typeof fetch>[1]) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ url, method, body });
      if (url.startsWith("/api/admin/guardians")) {
        return jsonResponse({
          guardians: [
            {
              linkId: 5,
              userId: 2,
              firstName: "Marie",
              lastName: "Dupont",
              email: "marie@example.com",
              kind: "guardian",
              relation: "mère",
              isActive: true,
            },
          ],
          children: [],
        });
      }
      if (method === "GET") return jsonResponse(users);
      return jsonResponse({ success: true });
    })
  );
  return calls;
}

function row(name: string): HTMLElement {
  const cell = screen.getAllByText(name)[0];
  const tr = cell.closest("tr");
  if (!tr) throw new Error(`Ligne introuvable pour ${name}`);
  return tr;
}

describe("UsersAdminClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("liste", () => {
    it("signale quand la liste ne peut pas être chargée", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: "Session expirée." }, 401));
      render(
        <UsersAdminClient currentUserRole="SUPER_ADMIN" currentUserEmail="root@example.com" />
      );

      expect(await screen.findByRole("status")).toHaveTextContent(
        "La liste des utilisateurs n'a pas pu être actualisée. Rechargez la page."
      );
    });

    it("affiche badges, responsables et compte sans e-mail sans planter", async () => {
      mockApi();
      render(
        <UsersAdminClient currentUserRole="SUPER_ADMIN" currentUserEmail="root@example.com" />
      );

      await screen.findByText("Tom Petit");

      const guardianRow = within(row("Marie Dupont"));
      expect(guardianRow.getByText("Responsable")).toBeTruthy();
      expect(guardianRow.getByText("Responsable de Léa Dupont")).toBeTruthy();

      const managedRow = within(row("Tom Petit"));
      expect(managedRow.getByText("Géré")).toBeTruthy();
      expect(managedRow.getByText("Pas d'e-mail")).toBeTruthy();
      expect(managedRow.getByText("Responsable : Marie Dupont")).toBeTruthy();
    });

    it("indique les enfants d'un parent même si son compte est un compte musicien", async () => {
      mockApi();
      render(
        <UsersAdminClient currentUserRole="SUPER_ADMIN" currentUserEmail="root@example.com" />
      );
      await screen.findByText("Tom Petit");

      expect(
        within(row("Paul Durand")).getByText("Responsable de Tom Petit, Léa Dupont")
      ).toBeTruthy();
    });

    it("signale un majeur dont le responsable est encore lié, et seulement lui", async () => {
      mockApi();
      render(
        <UsersAdminClient currentUserRole="SUPER_ADMIN" currentUserEmail="root@example.com" />
      );

      await screen.findByText("Tom Petit");

      expect(screen.getAllByText("Majeur, responsable encore lié")).toHaveLength(1);
      expect(within(row("Léa Dupont")).getByText("Majeur, responsable encore lié")).toBeTruthy();
    });

    it("retrouve un compte par le nom de son responsable", async () => {
      const user = userEvent.setup();
      mockApi();
      render(
        <UsersAdminClient currentUserRole="SUPER_ADMIN" currentUserEmail="root@example.com" />
      );
      await screen.findByText("Tom Petit");

      await user.type(screen.getByPlaceholderText(/Rechercher/), "paul");

      expect(screen.queryByText("Tom Petit")).toBeNull();
      expect(screen.getByText("Paul Durand")).toBeTruthy();
    });
  });

  describe("lien direct depuis la page Familles", () => {
    afterEach(() => {
      window.history.replaceState(null, "", "/");
    });

    it("ouvre la fiche de l'utilisateur demandé avec ?user=ID", async () => {
      window.history.replaceState(null, "", "/admin/users?user=3");
      mockApi();
      render(
        <UsersAdminClient currentUserRole="SUPER_ADMIN" currentUserEmail="root@example.com" />
      );

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("Pas de connexion, géré par", { exact: false })).toBeTruthy();
      expect(within(dialog).getByText("Petit")).toBeTruthy();
    });

    it("n'ouvre rien si l'identifiant est inconnu", async () => {
      window.history.replaceState(null, "", "/admin/users?user=99999");
      mockApi();
      render(
        <UsersAdminClient currentUserRole="SUPER_ADMIN" currentUserEmail="root@example.com" />
      );
      await screen.findByText("Tom Petit");

      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  describe("permissions", () => {
    it("cache la création d'utilisateur à un administrateur", async () => {
      mockApi();
      render(<UsersAdminClient currentUserRole="ADMIN" currentUserEmail="admin@example.com" />);
      await screen.findByText("Tom Petit");

      expect(screen.queryByRole("button", { name: /Nouvel utilisateur/ })).toBeNull();
    });

    it("n'offre pas le transfert d'adresse à un administrateur dans la fiche", async () => {
      const user = userEvent.setup();
      mockApi();
      render(<UsersAdminClient currentUserRole="ADMIN" currentUserEmail="admin@example.com" />);
      await screen.findByText("Tom Petit");

      await user.click(within(row("Léa Dupont")).getByText("lea@example.com"));
      const dialog = await screen.findByRole("dialog");

      expect(await within(dialog).findByText("Marie Dupont")).toBeTruthy();
      expect(within(dialog).getByRole("button", { name: /Lier un compte existant/ })).toBeTruthy();
      expect(within(dialog).queryByRole("button", { name: /Transférer l'adresse/ })).toBeNull();
      expect(within(dialog).queryByRole("button", { name: /Créer un responsable/ })).toBeNull();
    });
  });

  describe("fiche d'un compte géré", () => {
    it("remplace l'e-mail par « géré par … » et propose un accès personnel au super-admin", async () => {
      const user = userEvent.setup();
      mockApi();
      render(
        <UsersAdminClient currentUserRole="SUPER_ADMIN" currentUserEmail="root@example.com" />
      );
      await screen.findByText("Tom Petit");

      await user.click(within(row("Tom Petit")).getByText("Pas d'e-mail"));
      const dialog = await screen.findByRole("dialog");

      expect(within(dialog).getByText(/Pas de connexion, géré par/)).toBeTruthy();
      expect(
        within(dialog).getByRole("button", { name: "Donner un accès personnel" })
      ).toBeTruthy();
    });
  });

  // Saisies au clavier dans un gros formulaire : délai élargi pour la suite complète en parallèle.
  describe("création", { timeout: 20_000 }, () => {
    it("crée un musicien sans e-mail : pas de champ e-mail, noEmail envoyé", async () => {
      const user = userEvent.setup();
      const calls = mockApi();
      render(
        <UsersAdminClient currentUserRole="SUPER_ADMIN" currentUserEmail="root@example.com" />
      );
      await screen.findByText("Tom Petit");

      await user.click(screen.getByRole("button", { name: /Nouvel utilisateur/ }));
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByLabelText("Email *")).toBeTruthy();

      await user.click(within(dialog).getByRole("radio", { name: /Musicien sans e-mail/ }));
      expect(within(dialog).queryByLabelText("Email *")).toBeNull();
      expect(within(dialog).getByText(/Pas d'adresse e-mail/)).toBeTruthy();

      await user.type(within(dialog).getByPlaceholderText("Jean"), "Zoé");
      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(calls.some((call) => call.method === "POST")).toBe(true));
      const post = calls.find((call) => call.method === "POST");
      expect(post?.url).toBe("/api/admin/users");
      expect(post?.body).toMatchObject({ noEmail: true, kind: "member", role: "MUSICIAN" });
      expect(post?.body).not.toHaveProperty("email");
      expect(await screen.findByRole("status")).toBeTruthy();
    });

    it("crée un responsable légal : e-mail obligatoire, pas de champs de musicien", async () => {
      const user = userEvent.setup();
      const calls = mockApi();
      render(
        <UsersAdminClient currentUserRole="SUPER_ADMIN" currentUserEmail="root@example.com" />
      );
      await screen.findByText("Tom Petit");

      await user.click(screen.getByRole("button", { name: /Nouvel utilisateur/ }));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("radio", { name: /Responsable légal/ }));

      expect(within(dialog).queryByText("Adresse postale")).toBeNull();
      expect(within(dialog).queryByText("Adhésion 2026-2027")).toBeNull();
      expect(within(dialog).getByRole("button", { name: "Enregistrer" })).toHaveProperty(
        "disabled",
        true
      );

      await user.type(within(dialog).getByLabelText("Email *"), "parent@example.com");
      await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

      await waitFor(() => expect(calls.some((call) => call.method === "POST")).toBe(true));
      expect(calls.find((call) => call.method === "POST")?.body).toMatchObject({
        kind: "guardian",
        role: "MUSICIAN",
        email: "parent@example.com",
      });
    });
  });
});
