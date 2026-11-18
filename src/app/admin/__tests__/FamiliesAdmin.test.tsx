import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FamiliesAdminClient } from "../FamiliesAdmin";
import type { GuardianLink } from "../families";
import type { UserWithProfile } from "../users-shared";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function account(overrides: Partial<UserWithProfile>): UserWithProfile {
  return {
    email: "x@example.com",
    role: "MUSICIAN",
    kind: "member",
    is_active: 1,
    date_of_birth: "1990-01-01",
    ...overrides,
  };
}

const thisYear = new Date().getFullYear();

const users: UserWithProfile[] = [
  account({
    id: 100,
    kind: "guardian",
    first_name: "Nathalie",
    last_name: "Leroy",
    email: "nathalie@example.com",
    phone: "06 11 22 33 44",
  }),
  account({
    id: 8,
    first_name: "Hugo",
    last_name: "Leroy",
    date_of_birth: `${thisYear - 15}-01-01`,
    emergency_contact_first_name: "Tante",
    emergency_contact_last_name: "Leroy",
    emergency_contact_phone: "06 99 99 99 99",
  }),
  account({
    id: 101,
    kind: "managed",
    email: null,
    first_name: "Noé",
    last_name: "Leroy",
    date_of_birth: `${thisYear - 8}-01-01`,
  }),
  account({ id: 2, first_name: "Lucas", last_name: "Martin" }),
  account({
    id: 3,
    first_name: "Camille",
    last_name: "Bernard",
    date_of_birth: `${thisYear - 20}-01-01`,
  }),
  account({
    id: 120,
    first_name: "Tom",
    last_name: "Petit",
    date_of_birth: `${thisYear - 10}-06-01`,
  }),
  account({ id: 121, first_name: "Anna", last_name: "Sansdate", date_of_birth: null }),
];

const links: GuardianLink[] = [
  { linkId: 1, guardianUserId: 100, childUserId: 8, relation: "mère" },
  { linkId: 2, guardianUserId: 100, childUserId: 101, relation: "mère" },
  { linkId: 3, guardianUserId: 2, childUserId: 3, relation: "père" },
];

function mockApi(overrides: { usersStatus?: number; linksStatus?: number } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.startsWith("/api/admin/guardians")) {
        return overrides.linksStatus
          ? json({ error: "Erreur" }, overrides.linksStatus)
          : json({ links });
      }
      return overrides.usersStatus ? json({ error: "Erreur" }, overrides.usersStatus) : json(users);
    })
  );
}

describe("FamiliesAdminClient", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/admin/familles");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("charge les utilisateurs et tous les liens", async () => {
    mockApi();
    render(<FamiliesAdminClient />);

    await screen.findByText("2 familles");
    const urls = vi.mocked(fetch).mock.calls.map(([input]) => String(input));
    expect(urls).toContain("/api/admin/users");
    expect(urls).toContain("/api/admin/guardians");
  });

  it("affiche chaque famille avec responsable, enfants, âge, type de compte et coordonnées", async () => {
    mockApi();
    render(<FamiliesAdminClient />);

    await screen.findByText("2 familles");
    const leroy = screen.getByText("Nathalie Leroy").closest("[class*=space-y-4]") as HTMLElement;

    expect(within(leroy).getByText("· mère")).toBeInTheDocument();
    expect(within(leroy).getByText("06 11 22 33 44")).toBeInTheDocument();
    expect(within(leroy).getByText("nathalie@example.com")).toBeInTheDocument();
    expect(within(leroy).getByText("15 ans")).toBeInTheDocument();
    expect(within(leroy).getByText("8 ans")).toBeInTheDocument();
    expect(within(leroy).getByText("Géré")).toBeInTheDocument();
    expect(within(leroy).getByText("Hugo Leroy").closest("a")).toHaveAttribute(
      "href",
      "/admin/users?user=8"
    );
  });

  it("filtre les familles par nom d'enfant ou de parent", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<FamiliesAdminClient />);
    await screen.findByText("2 familles");

    await user.type(screen.getByLabelText("Rechercher une famille"), "camille");

    expect(screen.getByText("1 famille sur 2")).toBeInTheDocument();
    expect(screen.queryByText("Nathalie Leroy")).toBeNull();
    expect(screen.getByText("Lucas Martin")).toBeInTheDocument();
  });

  it("montre les quatre listes « À vérifier » avec des liens vers les fiches", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<FamiliesAdminClient />);
    await screen.findByText("2 familles");

    // Le compteur de l'onglet : Tom (mineur sans responsable), Anna (sans date),
    // Camille (majeure reliée), Noé n'est pas concerné (il a un responsable).
    const tab = screen.getByRole("tab", { name: /À vérifier/ });
    expect(tab).toHaveTextContent("3");
    await user.click(tab);

    const minors = screen.getByTestId("attention-minors");
    expect(within(minors).getByText("Tom Petit")).toBeInTheDocument();
    expect(within(minors).getByRole("link", { name: "Ouvrir la fiche" })).toHaveAttribute(
      "href",
      "/admin/users?user=120"
    );
    expect(
      within(screen.getByTestId("attention-birthdate")).getByText("Anna Sansdate")
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("attention-managed")).getByText("Rien à signaler.")
    ).toBeInTheDocument();
    const adults = screen.getByTestId("attention-adults");
    expect(within(adults).getByText("Camille Bernard")).toBeInTheDocument();
    expect(within(adults).getByText("Responsable : Lucas Martin")).toBeInTheDocument();
  });

  it("ouvre directement « À vérifier » avec ?vue=a-verifier (lien du tableau de bord)", async () => {
    window.history.replaceState(null, "", "/admin/familles?vue=a-verifier");
    mockApi();
    render(<FamiliesAdminClient />);

    expect(await screen.findByTestId("attention-minors")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /À vérifier/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("propose la liste des mineurs à imprimer, avec les téléphones des parents", async () => {
    const user = userEvent.setup();
    const print = vi.fn();
    vi.stubGlobal("print", print);
    mockApi();
    render(<FamiliesAdminClient />);
    await screen.findByText("2 familles");

    await user.click(screen.getByRole("tab", { name: "Liste des mineurs" }));

    expect(
      screen.getByRole("heading", { name: "Mineurs et téléphones des parents" })
    ).toBeInTheDocument();
    const table = screen.getByRole("table");
    const hugoRow = within(table).getByText("Hugo Leroy").closest("tr") as HTMLElement;
    expect(within(hugoRow).getByText(/Nathalie Leroy/)).toBeInTheDocument();
    expect(within(hugoRow).getByText("06 11 22 33 44")).toBeInTheDocument();
    expect(within(hugoRow).getByText("06 99 99 99 99")).toBeInTheDocument();
    const tomRow = within(table).getByText("Tom Petit").closest("tr") as HTMLElement;
    expect(within(tomRow).getByText("Aucun responsable lié")).toBeInTheDocument();
    // Les autres vues ne sont pas dans la page : l'impression ne sort que la liste.
    expect(screen.queryByText("2 familles")).toBeNull();

    const printButton = screen.getByRole("button", { name: /Imprimer/ });
    expect(printButton.className).toContain("print:hidden");
    await user.click(printButton);
    expect(print).toHaveBeenCalledTimes(1);
  });

  it("affiche une erreur claire si le chargement échoue", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockApi({ linksStatus: 500 });
    render(<FamiliesAdminClient />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Impossible de charger les familles"
    );
  });
});
