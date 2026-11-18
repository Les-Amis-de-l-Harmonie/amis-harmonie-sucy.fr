import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "cloudflare:workers";
import { AdminDashboard } from "../Dashboard";
import { AttentionCard } from "../AttentionCard";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const originalDb = env.DB;
const thisYear = new Date().getFullYear();

interface Row {
  id: number;
  email: string;
  role: "MUSICIAN" | "ADMIN";
  kind: "member" | "guardian" | "managed";
  is_active: number;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
}

interface LinkRow {
  linkId: number;
  guardianUserId: number;
  childUserId: number;
  relation: string | null;
}

function user(id: number, overrides: Partial<Row> = {}): Row {
  return {
    id,
    email: `u${id}@example.com`,
    role: "MUSICIAN",
    kind: "member",
    is_active: 1,
    first_name: `Prénom${id}`,
    last_name: `Nom${id}`,
    date_of_birth: "1990-01-01",
    ...overrides,
  };
}

function stubDatabase(users: Row[], links: LinkRow[], failUsers = false) {
  env.DB = {
    prepare(sql: string) {
      return {
        first: async () => ({ count: 0 }),
        all: async () => {
          if (sql.includes("FROM guardian_links")) return { results: links };
          if (failUsers) throw new Error("no such table");
          return { results: users };
        },
      };
    },
  } as unknown as typeof env.DB;
}

describe("AttentionCard", () => {
  it("affiche les compteurs et renvoie vers la page Familles", () => {
    render(
      <AttentionCard
        counts={{
          minorsWithoutGuardian: 2,
          missingBirthDate: 0,
          managedWithoutGuardian: 1,
          adultsStillLinked: 3,
        }}
      />
    );

    const card = screen.getByTestId("attention-card");
    expect(card).toHaveAttribute("href", "/admin/familles?vue=a-verifier");
    expect(within(card).getByText("Mineurs sans responsable").nextElementSibling).toHaveTextContent(
      "2"
    );
    expect(
      within(card).getByText("Dates de naissance manquantes").nextElementSibling
    ).toHaveTextContent("0");
    expect(
      within(card).getByText("Majeurs encore reliés à un responsable").nextElementSibling
    ).toHaveTextContent("3");
  });

  it("dit « Rien à signaler » quand tout est en ordre", () => {
    render(
      <AttentionCard
        counts={{
          minorsWithoutGuardian: 0,
          missingBirthDate: 0,
          managedWithoutGuardian: 0,
          adultsStillLinked: 0,
        }}
      />
    );

    expect(screen.getByText("Rien à signaler.")).toBeInTheDocument();
    expect(screen.queryByText("Mineurs sans responsable")).toBeNull();
  });
});

describe("AdminDashboard — carte « À vérifier »", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 }))
    );
  });

  afterEach(() => {
    env.DB = originalDb;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("calcule les compteurs à partir des comptes et des liens", async () => {
    stubDatabase(
      [
        user(1, { kind: "guardian" }),
        user(2, { date_of_birth: `${thisYear - 12}-01-01` }), // mineur relié : rien à signaler
        user(3, { date_of_birth: `${thisYear - 9}-01-01` }), // mineur sans responsable
        user(4, { date_of_birth: null }), // sans date
        user(5, { kind: "managed", date_of_birth: `${thisYear - 7}-01-01` }), // géré sans responsable
        user(6, { date_of_birth: `${thisYear - 21}-01-01` }), // majeur encore relié
        user(7, { role: "ADMIN", date_of_birth: null }), // admin : ignoré
        user(8, { is_active: 0, date_of_birth: `${thisYear - 5}-01-01` }), // inactif : ignoré
      ],
      [
        { linkId: 1, guardianUserId: 1, childUserId: 2, relation: "mère" },
        { linkId: 2, guardianUserId: 1, childUserId: 6, relation: "mère" },
      ]
    );

    render(await AdminDashboard());

    const card = screen.getByTestId("attention-card");
    const count = (label: string) => within(card).getByText(label).nextElementSibling?.textContent;
    expect(count("Mineurs sans responsable")).toBe("2"); // 3 et 5
    expect(count("Dates de naissance manquantes")).toBe("1");
    expect(count("Comptes gérés sans responsable")).toBe("1");
    expect(count("Majeurs encore reliés à un responsable")).toBe("1");
  });

  it("garde le tableau de bord quand les compteurs ne peuvent pas être calculés", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    stubDatabase([], [], true);

    render(await AdminDashboard());

    expect(screen.getByRole("heading", { name: "Tableau de bord" })).toBeInTheDocument();
    expect(screen.queryByTestId("attention-card")).toBeNull();
  });
});
