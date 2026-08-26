import { render, screen, waitFor } from "@testing-library/react";
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
    fetchMock.mockResolvedValueOnce(jsonResponse({ events: [event] })).mockResolvedValueOnce(
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
});
