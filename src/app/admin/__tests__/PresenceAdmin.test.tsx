import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PresenceAdminClient } from "../PresenceAdmin";

type PresenceStatus = "present" | "absent" | null;

interface PresenceGridAnswer {
  status: PresenceStatus;
  comment: string | null;
  changedAfterDeadline: boolean;
}

interface PresenceGridMember {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  instruments: string[];
  primaryInstrument: string | null;
  answers: Record<string, PresenceGridAnswer>;
}

interface PresenceGridEvent {
  id: number;
  title: string;
  date: string;
  response_deadline: string | null;
}

interface PresenceGridData {
  events: PresenceGridEvent[];
  members: PresenceGridMember[];
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

function createEvent(overrides: Partial<PresenceGridEvent> = {}): PresenceGridEvent {
  return {
    id: 42,
    title: "Répétition générale",
    date: "2026-12-01",
    response_deadline: "2026-11-25",
    ...overrides,
  };
}

function createMember(overrides: Partial<PresenceGridMember> = {}): PresenceGridMember {
  return {
    userId: 1,
    firstName: "Alice",
    lastName: "Martin",
    instruments: ["Clarinette"],
    primaryInstrument: "Clarinette",
    answers: {},
    ...overrides,
  };
}

function createGrid(
  events: PresenceGridEvent[] = [createEvent()],
  members: PresenceGridMember[] = [createMember()]
): PresenceGridData {
  return { events, members };
}

describe("PresenceAdminClient", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-27"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("affiche les groupes de pupitres dans l'ordre Direction puis instruments puis sans pupitre", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        createGrid(
          [createEvent()],
          [
            createMember({
              userId: 1,
              firstName: "Zoé",
              lastName: "Orchestre",
              instruments: ["Chef d'orchestre"],
              primaryInstrument: "Chef d'orchestre",
            }),
            createMember({
              userId: 2,
              firstName: "Alice",
              lastName: "Adjointe",
              instruments: ["Chef adjoint"],
              primaryInstrument: "Chef adjoint",
            }),
            createMember({
              userId: 3,
              firstName: "Paul",
              lastName: "Trompette",
              instruments: ["Chef d'orchestre", "Trompette"],
              primaryInstrument: "Trompette",
            }),
            createMember({
              userId: 4,
              firstName: "Claire",
              lastName: "Clarinette",
              instruments: ["Clarinette"],
              primaryInstrument: "Clarinette",
            }),
            createMember({
              userId: 5,
              firstName: "Nina",
              lastName: "Trompette",
              instruments: ["Trompette"],
              primaryInstrument: "Trompette",
            }),
            createMember({
              userId: 6,
              firstName: "Noé",
              lastName: "Sanspupitre",
              instruments: [],
              primaryInstrument: null,
            }),
          ]
        )
      )
    );

    render(<PresenceAdminClient />);

    const table = await screen.findByRole("table");
    const groupLabels = within(table)
      .getAllByText(/^(Direction|Clarinette|Trompette|Sans pupitre renseigné)$/)
      .filter((element) => element.tagName === "SPAN");
    expect(
      groupLabels.map((element) => element.textContent?.replace(/\(\d+\)$/, "").trim())
    ).toEqual(["Direction", "Clarinette", "Trompette", "Sans pupitre renseigné"]);

    const directionGroup = groupLabels[0]?.closest("tbody");
    expect(directionGroup).not.toBeNull();
    if (!directionGroup) throw new Error("Le groupe Direction est absent");
    const directionText = directionGroup.textContent ?? "";
    expect(directionText.indexOf("Zoé Orchestre")).toBeLessThan(
      directionText.indexOf("Alice Adjointe")
    );
    expect(directionText).toContain("Paul Trompette");

    const trompetteGroup = groupLabels[2]?.closest("tbody");
    expect(trompetteGroup).not.toBeNull();
    if (!trompetteGroup) throw new Error("Le groupe Trompette est absent");
    expect(trompetteGroup.textContent).not.toContain("Paul Trompette");
  });

  it("affiche le taux de réponse par événement selon les statuts répondus", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        createGrid(
          [createEvent()],
          [
            createMember({
              userId: 1,
              answers: { "42": { status: "present", comment: null, changedAfterDeadline: false } },
            }),
            createMember({
              userId: 2,
              answers: { "42": { status: "present", comment: null, changedAfterDeadline: false } },
            }),
            createMember({
              userId: 3,
              answers: { "42": { status: "absent", comment: null, changedAfterDeadline: false } },
            }),
            createMember({
              userId: 4,
              answers: { "42": { status: null, comment: null, changedAfterDeadline: false } },
            }),
          ]
        )
      )
    );

    render(<PresenceAdminClient />);

    expect(await screen.findByText(/75\s*%/)).toBeInTheDocument();
  });

  it("refait la requête avec includePast=1 après activation du filtre", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(() => Promise.resolve(jsonResponse(createGrid())));

    render(<PresenceAdminClient />);
    await screen.findByRole("table");

    const toggle = screen.getByRole("checkbox", { name: /Inclure les événements passés/i });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/admin/presence?grid=1");

    await userEvent.setup().click(toggle);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("/api/admin/presence?grid=1&includePast=1");
  });

  it("affiche le commentaire du musicien en lecture seule dans la boîte d'édition", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        createGrid(
          [createEvent()],
          [
            createMember({
              answers: {
                "42": {
                  status: "present",
                  comment: "Indisponible après 20 h",
                  changedAfterDeadline: false,
                },
              },
            }),
          ]
        )
      )
    );

    const user = userEvent.setup();
    render(<PresenceAdminClient />);
    await user.click(
      await screen.findByRole("button", { name: /Alice Martin.*Répétition générale/i })
    );

    expect(await screen.findByText(/Indisponible après 20 h/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("expose le marqueur de modification tardive uniquement pour les cellules concernées", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        createGrid(
          [createEvent(), createEvent({ id: 43, title: "Concert de quartier" })],
          [
            createMember({
              answers: {
                "42": { status: "present", comment: null, changedAfterDeadline: true },
                "43": { status: "present", comment: null, changedAfterDeadline: false },
              },
            }),
          ]
        )
      )
    );

    render(<PresenceAdminClient />);

    expect(
      await screen.findByRole("button", {
        name: /Alice Martin.*Répétition générale.*modifié après la date limite/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Alice Martin.*Concert de quartier/i })
    ).not.toHaveAccessibleName(/modifié après la date limite/i);
  });

  it("met à jour la cellule avec la réponse serveur, y compris le commentaire et le marqueur tardif", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          createGrid(
            [createEvent()],
            [
              createMember({
                answers: { "42": { status: null, comment: null, changedAfterDeadline: false } },
              }),
            ]
          )
        )
      )
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          eventId: 42,
          userId: 1,
          status: "present",
          comment: "gardé",
          changedAfterDeadline: true,
        })
      );

    const user = userEvent.setup();
    render(<PresenceAdminClient />);
    await user.click(
      await screen.findByRole("button", { name: /Alice Martin.*Répétition générale/i })
    );
    await user.click(screen.getByRole("button", { name: "Présent" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(
      await screen.findByRole("button", {
        name: /Alice Martin.*Répétition générale.*modifié après la date limite/i,
      })
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Alice Martin.*Répétition générale.*modifié après la date limite/i,
      })
    );
    expect(await screen.findByText(/gardé/)).toBeInTheDocument();
  });

  it("demande confirmation avant une prestation passée, puis ouvre directement les choix pour une future", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        createGrid(
          [
            createEvent({ id: 41, title: "Prestation passée", date: "2026-08-01" }),
            createEvent({ id: 42, title: "Prestation future" }),
          ],
          [createMember()]
        )
      )
    );

    const user = userEvent.setup();
    render(<PresenceAdminClient />);

    await user.click(await screen.findByRole("button", { name: /Prestation passée/i }));
    expect(await screen.findByRole("heading", { name: "Prestation passée" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Présent" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(await screen.findByRole("button", { name: "Présent" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Close" }));

    await user.click(screen.getByRole("button", { name: /Prestation future/i }));
    expect(await screen.findByRole("button", { name: "Présent" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Prestation passée" })).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
