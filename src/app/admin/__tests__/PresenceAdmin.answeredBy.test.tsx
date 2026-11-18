import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PresenceAdminClient } from "../PresenceAdmin";

interface Answer {
  status: "present" | "absent" | null;
  comment: string | null;
  changedAfterDeadline: boolean;
  answeredBy?: {
    name: string | null;
    relation: string | null;
    isAdmin: boolean;
    kind?: "parent" | "admin" | "deleted" | "noProfile";
  } | null;
  answeredAt?: string | null;
}

function member(userId: number, firstName: string, answer: Answer | null) {
  return {
    userId,
    firstName,
    lastName: "Martin",
    instruments: ["Clarinette"],
    primaryInstrument: "Clarinette",
    answers: answer ? { "42": answer } : {},
  };
}

function gridResponse(members: ReturnType<typeof member>[]): Response {
  return new Response(
    JSON.stringify({
      events: [{ id: 42, title: "Concert", date: "2026-12-01", response_deadline: "2026-11-25" }],
      members,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

const base = { comment: null, changedAfterDeadline: false };

describe("PresenceAdminClient — réponse saisie par un tiers", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-27"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("indique « par Aurélie (mère) » avec la date en info-bulle quand un parent a répondu", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      gridResponse([
        member(1, "Léa", {
          ...base,
          status: "present",
          answeredBy: {
            name: "Aurélie Martin",
            relation: "mère",
            isAdmin: false,
            kind: "parent",
          },
          answeredAt: "2026-11-12 17:30:00",
        }),
      ])
    );

    render(<PresenceAdminClient />);

    const mention = await screen.findByTestId("answered-by");
    expect(mention.textContent).toBe("par Aurélie (mère)");
    const cell = mention.closest("button");
    expect(cell?.getAttribute("title")).toBe(
      "Réponse donnée par Aurélie Martin (mère) le 12/11/2026 à 18:30"
    );
    expect(cell?.getAttribute("aria-label")).toContain("Réponse donnée par Aurélie Martin (mère)");
    // Repère visuel pour les petits écrans, où la mention texte est masquée.
    expect(within(cell as HTMLElement).getByTestId("answered-by-marker")).toBeInTheDocument();
  });

  it("indique « par Mario (admin) » pour un administrateur", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      gridResponse([
        member(1, "Léa", {
          ...base,
          status: "absent",
          answeredBy: { name: "Mario Rossi", relation: null, isAdmin: true, kind: "admin" },
          answeredAt: "2026-11-12T08:00:00Z",
        }),
      ])
    );

    render(<PresenceAdminClient />);

    expect((await screen.findByTestId("answered-by")).textContent).toBe("par Mario (admin)");
  });

  it("n'ajoute rien quand le musicien a répondu lui-même, ou sans réponse", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      gridResponse([
        member(1, "Léa", { ...base, status: "present", answeredBy: null, answeredAt: null }),
        member(2, "Tom", { ...base, status: "absent" }),
        member(3, "Zoé", {
          ...base,
          status: null,
          answeredBy: {
            name: "Aurélie Martin",
            relation: "mère",
            isAdmin: false,
            kind: "parent",
          },
          answeredAt: "2026-11-12 17:30:00",
        }),
      ])
    );

    render(<PresenceAdminClient />);

    await screen.findByRole("table");
    expect(screen.queryByTestId("answered-by")).toBeNull();
    expect(screen.queryByTestId("answered-by-marker")).toBeNull();
  });

  it("rappelle qui a répondu dans la boîte de modification", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      gridResponse([
        member(1, "Léa", {
          ...base,
          status: "present",
          answeredBy: {
            name: "Aurélie Martin",
            relation: "mère",
            isAdmin: false,
            kind: "parent",
          },
          answeredAt: "2026-11-12 17:30:00",
        }),
      ])
    );
    vi.setSystemTime(new Date("2026-01-01"));

    render(<PresenceAdminClient />);
    await user.click(await screen.findByRole("button", { name: /Léa Martin — Concert/ }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Réponse donnée par Aurélie Martin (mère) le 12/11/2026 à 18:30")
    ).toBeInTheDocument();
  });

  it("formate les replis noProfile et deleted envoyés par la grille", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      gridResponse([
        member(1, "Léa", {
          ...base,
          status: "present",
          answeredBy: { name: null, relation: null, isAdmin: true, kind: "noProfile" },
        }),
        member(2, "Tom", {
          ...base,
          status: "absent",
          answeredBy: { name: null, relation: null, isAdmin: false, kind: "deleted" },
        }),
      ])
    );

    render(<PresenceAdminClient />);

    expect(await screen.findByText("par un administrateur")).toBeInTheDocument();
    expect(screen.getByText("par un compte supprimé")).toBeInTheDocument();
  });

  it("désactive le choix du statut actuel pour éviter de réattribuer la réponse", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      gridResponse([member(1, "Léa", { ...base, status: "present" })])
    );

    render(<PresenceAdminClient />);
    await user.click(await screen.findByRole("button", { name: /Léa Martin — Concert/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /Présent.*Actuel/ })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Absent" })).toBeEnabled();
  });
});
