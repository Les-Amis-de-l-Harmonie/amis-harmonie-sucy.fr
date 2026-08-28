import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

describe("sursis des cartes après une réponse", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-08-27"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function answeredEvent(eventId = 8, title = "Cérémonie du 11 novembre") {
    return createEvent({
      id: eventId,
      title,
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

  function savedEvent(event: ReturnType<typeof answeredEvent>) {
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

  function getCard(title: string): HTMLElement {
    const heading = screen.getByRole("heading", { name: title });
    const card = heading.parentElement?.parentElement?.parentElement?.parentElement;
    if (!(card instanceof HTMLElement)) throw new Error(`Carte absente : ${title}`);
    return card;
  }

  function advance(milliseconds: number) {
    act(() => {
      vi.advanceTimersByTime(milliseconds);
    });
  }

  async function answerCard(
    user: ReturnType<typeof userEvent.setup>,
    card: HTMLElement,
    event: ReturnType<typeof answeredEvent>
  ) {
    await user.click(within(card).getByRole("button", { name: "Présent" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
  }

  it("garde la carte après réponse puis la retire 3000 ms après le départ du pointeur", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = answeredEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event], 2))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: savedEvent(event) }));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MusicianDisponibilites />);
    await screen.findByRole("heading", { name: event.title });
    const card = getCard(event.title);
    await answerCard(user, card, event);

    fireEvent.pointerLeave(card, { pointerType: "mouse" });
    advance(2999);
    expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
    advance(1);
    expect(screen.queryByRole("heading", { name: event.title })).not.toBeInTheDocument();
  });

  it("annule le retrait si le pointeur revient sur la carte", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = answeredEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event], 2))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: savedEvent(event) }));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MusicianDisponibilites />);
    await screen.findByRole("heading", { name: event.title });
    const card = getCard(event.title);
    await answerCard(user, card, event);

    fireEvent.pointerLeave(card, { pointerType: "mouse" });
    advance(1500);
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    advance(4000);
    expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
  });

  it("ne retire pas une carte tant que la souris la survole après la réponse", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = answeredEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event], 2))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: savedEvent(event) }));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MusicianDisponibilites />);
    await screen.findByRole("heading", { name: event.title });
    const card = getCard(event.title);
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    await answerCard(user, card, event);

    advance(4000);
    expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
  });

  it("n'arme pas le retrait si la souris survole la carte sans focus actif", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = answeredEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event], 2))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: savedEvent(event) }));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MusicianDisponibilites />);
    await screen.findByRole("heading", { name: event.title });
    const card = getCard(event.title);
    await answerCard(user, card, event);

    // Le blur arme d'abord un timer, donc le pointerenter vient ensuite l'annuler et
    // établir l'état « souris dedans » avant l'interaction testée.
    fireEvent.blur(card);
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    fireEvent.pointerDown(card, { pointerType: "mouse" });
    advance(5000);

    expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
  });

  it("arme le retrait tactile après la dernière interaction", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = answeredEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event], 2))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: savedEvent(event) }));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MusicianDisponibilites />);
    await screen.findByRole("heading", { name: event.title });
    const card = getCard(event.title);
    await answerCard(user, card, event);

    fireEvent.blur(card);
    fireEvent.pointerLeave(card, { pointerType: "mouse" });
    advance(2000);
    fireEvent.pointerDown(card, { pointerType: "touch" });
    advance(2999);
    expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
    advance(1);
    expect(screen.queryByRole("heading", { name: event.title })).not.toBeInTheDocument();
  });

  it("protège le brouillon de commentaire tant que le focus reste dans la carte", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = answeredEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event], 2))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: savedEvent(event) }));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MusicianDisponibilites />);
    await screen.findByRole("heading", { name: event.title });
    const card = getCard(event.title);
    await answerCard(user, card, event);

    // Aucun survol souris : la garde testée ici doit être focusInsideRef, pas mouseInsideRef.
    fireEvent.pointerLeave(card, { pointerType: "mouse" });
    fireEvent.click(within(card).getByRole("button", { name: "Ajouter un commentaire" }));
    const textbox = within(card).getByRole("textbox");
    fireEvent.focus(textbox);
    textbox.focus();
    await user.type(textbox, "Brouillon à conserver", { skipClick: true });

    advance(5000);
    expect(screen.getByRole("heading", { name: event.title })).toBeInTheDocument();
    expect(textbox).toHaveValue("Brouillon à conserver");

    fireEvent.blur(card);
    advance(3000);
    expect(screen.queryByRole("heading", { name: event.title })).not.toBeInTheDocument();
  });

  it("gère le délai de chaque carte indépendamment", async () => {
    const fetchMock = vi.mocked(fetch);
    const first = answeredEvent(8, "Première prestation");
    const second = answeredEvent(9, "Deuxième prestation");
    fetchMock
      .mockResolvedValueOnce(presenceResponse([first, second], 2))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: savedEvent(first) }))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: savedEvent(second) }));

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<MusicianDisponibilites />);
    await screen.findByRole("heading", { name: first.title });
    const firstCard = getCard(first.title);
    const secondCard = getCard(second.title);
    await answerCard(user, firstCard, first);
    await user.click(within(secondCard).getByRole("button", { name: "Présent" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    fireEvent.pointerEnter(firstCard, { pointerType: "mouse" });
    fireEvent.pointerEnter(secondCard, { pointerType: "mouse" });
    fireEvent.pointerLeave(firstCard, { pointerType: "mouse" });
    advance(1500);
    fireEvent.pointerEnter(secondCard, { pointerType: "mouse" });
    advance(1500);

    expect(screen.queryByRole("heading", { name: first.title })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: second.title })).toBeInTheDocument();
  });
});
