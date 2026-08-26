import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicianDisponibilites } from "../MusicianDisponibilites";

function createEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 8,
    title: "Cérémonie du 11 novembre",
    date: "2026-11-11",
    time: "10:30",
    location: "Monument aux morts de Sucy-en-Brie",
    address: "Place de l'Église, 94370 Sucy-en-Brie",
    response_deadline: "2026-09-05",
    response: {
      status: null,
      comment: null,
      updated_at: null,
    },
    roster: [],
    counts: {
      present: 0,
      absent: 0,
      noAnswer: 8,
      totalMembers: 8,
    },
    ...overrides,
  };
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

// L'identifiant du musicien connecté est renvoyé par /api/musician/presence lui-même,
// dérivé de la session : aucun appel séparé au profil n'est nécessaire.
function presenceResponse(events: unknown[], currentUserId = 2): Response {
  return jsonResponse({ currentUserId, events });
}

describe("MusicianDisponibilites", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("distingue une absence de réponse des boutons de présence sélectionnés", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ events: [createEvent()] }));

    render(<MusicianDisponibilites />);

    expect(await screen.findByText("À répondre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Présent" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: "Absent" })).toHaveAttribute("aria-pressed", "false");
  });

  it("envoie exactement le statut absent accepté par l'API", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent();
    fetchMock.mockResolvedValueOnce(presenceResponse([event])).mockResolvedValueOnce(
      jsonResponse({
        success: true,
        event: { ...event, response: { ...event.response, status: "absent" } },
      })
    );

    const user = userEvent.setup();
    render(<MusicianDisponibilites />);
    await user.click(await screen.findByRole("button", { name: "Absent" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const postOptions = fetchMock.mock.calls[1]?.[1] as { body?: unknown } | undefined;
    expect(postOptions).toBeDefined();
    if (!postOptions) throw new Error("La requête POST est absente");

    expect(JSON.parse(String(postOptions.body))).toEqual({
      eventId: 8,
      status: "absent",
      comment: null,
    });
  });

  it("n'affiche pas les commentaires présents dans les entrées du roster", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        events: [
          createEvent({
            roster: [
              {
                userId: 42,
                firstName: "Camille",
                lastName: "Bernard",
                instruments: ["Clarinette"],
                status: "present",
                comment: "SENTINEL_UI",
              },
            ],
            counts: { present: 1, absent: 0, noAnswer: 7, totalMembers: 8 },
          }),
        ],
      })
    );

    render(<MusicianDisponibilites />);

    expect(await screen.findByText("Camille Bernard")).toBeInTheDocument();
    expect(screen.queryByText("SENTINEL_UI")).not.toBeInTheDocument();
  });

  it("affiche l'absence de date limite sans provoquer d'erreur", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ events: [createEvent({ response_deadline: null })] })
    );

    render(<MusicianDisponibilites />);

    expect(await screen.findByText("Pas de date limite fixée")).toBeInTheDocument();
  });

  it("masque la carte d'une prestation déjà répondue mais la garde en colonne du tableau", async () => {
    const fetchMock = vi.mocked(fetch);
    const answeredEvent = createEvent({
      id: 4,
      title: "Concert de rentrée",
      date: "2026-09-06",
      response: { status: "present", comment: null, updated_at: "2026-08-20 10:00:00" },
      roster: [
        {
          userId: 2,
          firstName: "Lucas",
          lastName: "Martin",
          instruments: ["Trompette"],
          status: "present",
        },
      ],
    });
    const pendingEvent = createEvent({
      id: 8,
      title: "Cérémonie du 11 novembre",
      date: "2026-11-11",
      roster: [
        {
          userId: 2,
          firstName: "Lucas",
          lastName: "Martin",
          instruments: ["Trompette"],
          status: null,
        },
      ],
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ events: [answeredEvent, pendingEvent] }));

    render(<MusicianDisponibilites />);

    expect(
      await screen.findByRole("heading", { name: "Cérémonie du 11 novembre" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Concert de rentrée" })).not.toBeInTheDocument();
    expect(screen.getByText("Concert de rentrée")).toBeInTheDocument();
  });

  it("rouvre la carte correspondante quand on clique sur l'icône d'édition de sa propre réponse", async () => {
    const fetchMock = vi.mocked(fetch);
    const answeredEvent = createEvent({
      id: 4,
      title: "Concert de rentrée",
      date: "2026-09-06",
      response: { status: "present", comment: null, updated_at: "2026-08-20 10:00:00" },
      roster: [
        {
          userId: 2,
          firstName: "Lucas",
          lastName: "Martin",
          instruments: ["Trompette"],
          status: "present",
        },
      ],
    });
    fetchMock.mockResolvedValueOnce(presenceResponse([answeredEvent], 2));

    const user = userEvent.setup();
    render(<MusicianDisponibilites />);

    await screen.findByRole("table");
    expect(screen.queryByRole("heading", { name: "Concert de rentrée" })).not.toBeInTheDocument();

    const editButton = await screen.findByRole("button", { name: /modifier votre réponse/i });
    await user.click(editButton);

    expect(await screen.findByRole("heading", { name: "Concert de rentrée" })).toBeInTheDocument();
  });

  it("place le musicien connecté en première ligne du tableau", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent({
      roster: [
        {
          userId: 1,
          firstName: "Autre",
          lastName: "Musicien",
          instruments: ["Clarinette"],
          status: "absent",
        },
        {
          userId: 2,
          firstName: "Lucas",
          lastName: "Martin",
          instruments: ["Trompette"],
          status: null,
        },
      ],
    });
    fetchMock.mockResolvedValueOnce(presenceResponse([event], 2));

    render(<MusicianDisponibilites />);

    const table = await screen.findByRole("table");
    await waitFor(() => expect(within(table).getByText("Vous")).toBeInTheDocument());

    const rows = within(table).getAllByRole("row");
    // rows[0] est la ligne d'en-tête, rows[1] la première ligne de musicien.
    expect(within(rows[1]).getByText("Vous")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Lucas Martin")).toBeInTheDocument();
  });

  it("rend une cellule status: null comme « sans réponse », jamais comme « absent »", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent({
      roster: [
        {
          userId: 42,
          firstName: "Camille",
          lastName: "Bernard",
          instruments: ["Clarinette"],
          status: null,
        },
      ],
    });
    fetchMock.mockResolvedValueOnce(jsonResponse({ events: [event] }));

    render(<MusicianDisponibilites />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Sans réponse")).toBeInTheDocument();
    expect(within(table).queryByText("Absent")).not.toBeInTheDocument();
  });
});
