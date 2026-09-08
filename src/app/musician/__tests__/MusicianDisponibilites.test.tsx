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
    vi.setSystemTime(new Date("2026-08-27"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
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

  it("nomme le tableau sans afficher l'ancien en-tête explicatif", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(jsonResponse({ events: [createEvent()] }));

    render(<MusicianDisponibilites />);

    expect(
      await screen.findByRole("region", { name: "Qui vient à quelle date" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Qui vient à quelle date" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Votre ligne porte le badge/)).not.toBeInTheDocument();
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
                primaryInstrument: "Clarinette",
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
          primaryInstrument: "Trompette",
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
          primaryInstrument: "Trompette",
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
          primaryInstrument: "Trompette",
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

  it("groupe les pupitres avec Direction en tête et Sans pupitre renseigné en dernier", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent({
      roster: [
        {
          userId: 1,
          firstName: "Zoé",
          lastName: "Orchestre",
          instruments: ["Chef d'orchestre"],
          primaryInstrument: "Chef d'orchestre",
          status: null,
        },
        {
          userId: 2,
          firstName: "Alice",
          lastName: "Adjointe",
          instruments: ["Chef adjoint"],
          primaryInstrument: "Chef adjoint",
          status: null,
        },
        {
          userId: 3,
          firstName: "Paul",
          lastName: "Principal",
          instruments: ["Chef d'orchestre", "Trompette"],
          primaryInstrument: "Trompette",
          status: null,
        },
        {
          userId: 4,
          firstName: "Claire",
          lastName: "Clarinette",
          instruments: ["Clarinette"],
          primaryInstrument: "Clarinette",
          status: null,
        },
        {
          userId: 5,
          firstName: "Nina",
          lastName: "Trompette",
          instruments: ["Trompette"],
          primaryInstrument: "Trompette",
          status: null,
        },
        {
          userId: 6,
          firstName: "Noé",
          lastName: "Sanspupitre",
          instruments: [],
          primaryInstrument: null,
          status: null,
        },
      ],
    });
    fetchMock.mockResolvedValueOnce(presenceResponse([event], 999));

    render(<MusicianDisponibilites />);

    const table = await screen.findByRole("table");
    const groups = Array.from(table.querySelectorAll("tbody"));
    expect(
      groups.map((group) =>
        group
          .querySelector('th[scope="rowgroup"]')
          ?.textContent?.replace(/\(\d+\)$/, "")
          .trim()
      )
    ).toEqual(["Direction", "Clarinette", "Trompette", "Sans pupitre renseigné"]);

    const direction = groups[0];
    const trompette = groups[2];
    expect(direction).toBeDefined();
    expect(trompette).toBeDefined();
    if (!direction || !trompette) throw new Error("Les groupes attendus sont absents");

    const directionText = direction.textContent ?? "";
    expect(directionText.indexOf("Zoé Orchestre")).toBeLessThan(
      directionText.indexOf("Alice Adjointe")
    );
    expect(directionText).toContain("Paul Principal");
    expect(trompette.textContent).not.toContain("Paul Principal");
  });

  it("charge les prestations passées via le filtre et désactive leurs contrôles", async () => {
    const fetchMock = vi.mocked(fetch);
    const upcomingEvent = createEvent({
      roster: [
        {
          userId: 2,
          firstName: "Lucas",
          lastName: "Martin",
          instruments: ["Trompette"],
          primaryInstrument: "Trompette",
          status: null,
        },
      ],
    });
    const pastEvent = createEvent({
      id: 7,
      title: "Répétition passée",
      date: "2026-08-01",
      roster: upcomingEvent.roster,
    });
    fetchMock
      .mockResolvedValueOnce(presenceResponse([upcomingEvent], 2))
      .mockResolvedValueOnce(presenceResponse([pastEvent], 2));

    const user = userEvent.setup();
    render(<MusicianDisponibilites />);
    await screen.findByRole("table");
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("/api/musician/presence");

    await user.click(screen.getByRole("checkbox", { name: /Prestations passées/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("/api/musician/presence?includePast=1");

    expect(await screen.findByRole("heading", { name: "Répétition passée" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Présent" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Absent" })).toBeDisabled();
  });

  it("laisse le musicien connecté dans son pupitre tout en affichant le badge Vous", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent({
      roster: [
        {
          userId: 1,
          firstName: "Aaron",
          lastName: "Martin",
          instruments: ["Trompette"],
          primaryInstrument: "Trompette",
          status: "absent",
        },
        {
          userId: 2,
          firstName: "Lucas",
          lastName: "Martin",
          instruments: ["Trompette"],
          primaryInstrument: "Trompette",
          status: null,
        },
      ],
    });
    fetchMock.mockResolvedValueOnce(presenceResponse([event], 2));

    render(<MusicianDisponibilites />);

    const table = await screen.findByRole("table");
    await waitFor(() => expect(within(table).getByText("Vous")).toBeInTheDocument());

    const groups = table.querySelectorAll("tbody");
    const trompetteGroup = groups[0];
    expect(trompetteGroup).toBeDefined();
    if (!trompetteGroup) throw new Error("Le groupe Trompette est absent");

    const rows = within(trompetteGroup).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[2] as HTMLElement).getByText("Lucas Martin")).toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText("Vous")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).queryByText("Lucas Martin")).not.toBeInTheDocument();
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
          primaryInstrument: "Clarinette",
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

describe("effacement d'une réponse", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-27"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function answeredEvent(comment: string | null = null) {
    return createEvent({
      response: { status: "present", comment, updated_at: "2026-08-20 10:00:00" },
      roster: [
        {
          userId: 2,
          firstName: "Lucas",
          lastName: "Martin",
          instruments: ["Trompette"],
          primaryInstrument: "Trompette",
          status: "present",
        },
      ],
      counts: { present: 1, absent: 0, noAnswer: 0, totalMembers: 1 },
    });
  }

  function clearedEvent(event: ReturnType<typeof answeredEvent>) {
    return {
      ...event,
      response: { ...event.response, status: null, comment: null, updated_at: null },
      roster: [
        {
          userId: 2,
          firstName: "Lucas",
          lastName: "Martin",
          instruments: ["Trompette"],
          primaryInstrument: "Trompette",
          status: null,
        },
      ],
      counts: { present: 0, absent: 0, noAnswer: 1, totalMembers: 1 },
    };
  }

  it("efface immédiatement une réponse sans commentaire et réinitialise le brouillon", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = answeredEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event], 2))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: clearedEvent(event) }));

    const user = userEvent.setup();
    render(<MusicianDisponibilites />);
    await user.click(await screen.findByRole("button", { name: /modifier votre réponse/i }));
    await user.click(screen.getByRole("button", { name: "Effacer ma réponse" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const postOptions = fetchMock.mock.calls[1]?.[1] as { body?: unknown } | undefined;
    expect(postOptions).toBeDefined();
    if (!postOptions) throw new Error("La requête POST est absente");
    expect(JSON.parse(String(postOptions.body))).toEqual({
      eventId: 8,
      status: null,
      comment: null,
    });
    expect(screen.getByText("À répondre")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ajouter un commentaire" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("demande confirmation avant d'effacer un commentaire puis réconcilie la réponse serveur", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = answeredEvent("Motif à supprimer");
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event], 2))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: clearedEvent(event) }));

    const user = userEvent.setup();
    render(<MusicianDisponibilites />);
    await user.click(await screen.findByRole("button", { name: /modifier votre réponse/i }));
    await user.click(screen.getByRole("button", { name: "Effacer ma réponse" }));

    expect(screen.getByText("Votre commentaire sera aussi supprimé.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Confirmer" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const postOptions = fetchMock.mock.calls[1]?.[1] as { body?: unknown } | undefined;
    expect(postOptions).toBeDefined();
    if (!postOptions) throw new Error("La requête POST est absente");
    expect(JSON.parse(String(postOptions.body))).toEqual({
      eventId: 8,
      status: null,
      comment: null,
    });
    expect(screen.queryByText("Motif à supprimer")).not.toBeInTheDocument();
    expect(screen.getByText("À répondre")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ajouter un commentaire" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});

describe("disparition des cartes après une réponse", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.setSystemTime(new Date("2026-08-27"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function unansweredEvent() {
    return createEvent({
      response: { status: null, comment: null, updated_at: null },
      roster: [
        {
          userId: 2,
          firstName: "Lucas",
          lastName: "Martin",
          instruments: ["Trompette"],
          primaryInstrument: "Trompette",
          status: null,
        },
      ],
      counts: { present: 0, absent: 0, noAnswer: 1, totalMembers: 1 },
    });
  }

  function savedEvent(event: ReturnType<typeof unansweredEvent>) {
    return {
      ...event,
      response: { status: "present" as const, comment: null, updated_at: "2026-08-27 10:00:00" },
      roster: [
        {
          userId: 2,
          firstName: "Lucas",
          lastName: "Martin",
          instruments: ["Trompette"],
          primaryInstrument: "Trompette",
          status: "present" as const,
        },
      ],
      counts: { present: 1, absent: 0, noAnswer: 0, totalMembers: 1 },
    };
  }

  it("retire la carte immédiatement après une réponse réussie", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = unansweredEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event], 2))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: savedEvent(event) }));

    const user = userEvent.setup();
    render(<MusicianDisponibilites />);
    await user.click(await screen.findByRole("button", { name: "Présent" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("heading", { name: event.title })).not.toBeInTheDocument();
  });

  it("conserve la carte si l'enregistrement échoue", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = unansweredEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event], 2))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, error: "Erreur serveur" }), { status: 500 })
      );

    const user = userEvent.setup();
    render(<MusicianDisponibilites />);
    await user.click(await screen.findByRole("button", { name: "Présent" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
    expect(screen.getByText("Erreur serveur")).toBeInTheDocument();
  });
});
