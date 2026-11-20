import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicianDisponibilites } from "../MusicianDisponibilites";
import { SELF, withSession } from "./session-fixtures";

// Le bouton principal d'une ligne commence par la date ; les boutons rapides, eux, par la réponse.
const ROW_11_NOV = /^[A-Z][a-zé]{2}\. 11 nov\./;

type UserEventInstance = ReturnType<typeof userEvent.setup>;

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

function rosterEntry(
  userId: number,
  firstName: string,
  lastName: string,
  instruments: string[],
  primaryInstrument: string | null,
  status: "present" | "absent" | null
) {
  return { userId, firstName, lastName, instruments, primaryInstrument, status };
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

function postBody(callIndex: number) {
  const options = vi.mocked(fetch).mock.calls[callIndex]?.[1] as { body?: unknown } | undefined;
  if (!options) throw new Error("La requête POST est absente");
  return JSON.parse(String(options.body));
}

function withStatus<T extends { response: Record<string, unknown> }>(
  event: T,
  status: "present" | "absent" | null,
  comment: string | null = null
) {
  return { ...event, response: { ...event.response, status, comment } };
}

async function openRow(user: UserEventInstance, title: RegExp = ROW_11_NOV) {
  await user.click(await screen.findByRole("button", { name: title }));
  return await screen.findByRole("dialog");
}

async function openTable(user: UserEventInstance) {
  await user.click(await screen.findByRole("tab", { name: "Tableau" }));
  return await screen.findByRole("table");
}

describe("MusicianDisponibilites : liste « Mes réponses »", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-27"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("affiche « Mes réponses » par défaut avec la ligne d'état et l'aide à la place de la légende", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([createEvent()]));
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    expect(await screen.findByRole("tab", { name: "Mes réponses", selected: true })).toBeVisible();
    expect(screen.getByRole("tab", { name: "Tableau", selected: false })).toBeVisible();
    expect(screen.getByText("1 prestation en attente de votre réponse")).toBeInTheDocument();
    expect(
      screen.getByText("Touchez ✓ si vous venez, ✕ si vous ne venez pas.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toBe("/api/musician/presence");
  });

  it("garde le titre h1 pour les lecteurs d'écran en le masquant sous sm", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([createEvent()]));
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const title = await screen.findByRole("heading", { level: 1, name: "Mes prestations" });
    expect(title).toHaveClass("sr-only", "sm:not-sr-only");
  });

  it("résume la ligne : date, titre, heure, présents sur total et échéance quand on n'a pas répondu", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      presenceResponse([
        createEvent({ counts: { present: 3, absent: 1, noAnswer: 4, totalMembers: 8 } }),
      ])
    );
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const row = await screen.findByRole("button", { name: ROW_11_NOV });
    expect(row).toHaveTextContent("Mer. 11 nov. · 10:30");
    expect(row).toHaveTextContent("3 présents sur 8");
    expect(row).toHaveTextContent("À répondre avant le 5 septembre");
  });

  it("distingue une absence de réponse des boutons rapides sélectionnés (null ≠ absent)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([createEvent()]));
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    expect(await screen.findByRole("button", { name: /^Présent le 11 novembre,/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: /^Absent le 11 novembre,/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("envoie exactement le statut absent accepté par l'API depuis le bouton rapide", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event]))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: withStatus(event, "absent") }));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: /^Absent le 11 novembre,/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("/api/musician/presence");
    expect(postBody(1)).toEqual({ eventId: 8, status: "absent", comment: null });
  });

  it("répond puis modifie sans que la ligne disparaisse, avec un message « enregistrée » puis « modifiée »", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event]))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: withStatus(event, "present") }))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: withStatus(event, "absent") }));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: /^Présent le 11 novembre,/ }));
    expect(await screen.findByText("Réponse enregistrée")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Présent le 11 novembre,/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: ROW_11_NOV })).not.toHaveTextContent("À répondre");
    expect(
      screen.getByText("Vous avez répondu pour toutes les prestations à venir")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Absent le 11 novembre,/ }));
    expect(await screen.findByText("Réponse modifiée")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Absent le 11 novembre,/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(postBody(2)).toEqual({ eventId: 8, status: "absent", comment: null });
  });

  it("garde le commentaire existant quand on change de réponse d'un geste", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = withStatus(createEvent(), "present", "Je viens avec mon pupitre");
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event]))
      .mockResolvedValueOnce(
        jsonResponse({
          success: true,
          event: withStatus(event, "absent", "Je viens avec mon pupitre"),
        })
      );
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: /^Absent le 11 novembre,/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(postBody(1)).toEqual({
      eventId: 8,
      status: "absent",
      comment: "Je viens avec mon pupitre",
    });
  });

  it("ne renvoie rien quand on touche la réponse déjà choisie", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValueOnce(presenceResponse([withStatus(createEvent(), "present")]));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: /^Présent le 11 novembre,/ }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("garde l'état et affiche l'erreur du serveur près de la ligne quand la réponse rapide échoue", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(presenceResponse([createEvent()]))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, error: "Erreur serveur" }), { status: 500 })
      );
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: /^Présent le 11 novembre,/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Erreur serveur");
    expect(screen.getByRole("button", { name: /^Présent le 11 novembre,/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: ROW_11_NOV })).toBeInTheDocument();
    expect(screen.queryByText("Réponse enregistrée")).not.toBeInTheDocument();
  });

  it("efface l'erreur d'une réponse rapide dès qu'un enregistrement réussit depuis la feuille", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event]))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, error: "Erreur serveur" }), { status: 500 })
      )
      .mockResolvedValueOnce(jsonResponse({ success: true, event: withStatus(event, "present") }));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: /^Présent le 11 novembre,/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Erreur serveur");

    const dialog = await openRow(user);
    await user.click(within(dialog).getByRole("button", { name: "Présent" }));
    expect(await within(dialog).findByText("Réponse enregistrée")).toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("bloque la ligne pendant un enregistrement rapide : la feuille ne s'ouvre pas sur un état périmé", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent();
    let resolvePost: (response: Response) => void = () => undefined;
    fetchMock.mockResolvedValueOnce(presenceResponse([event])).mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolvePost = resolve;
        })
    );
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: /^Présent le 11 novembre,/ }));

    const row = screen.getByRole("button", { name: ROW_11_NOV });
    expect(row).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Absent le 11 novembre,/ })).toBeDisabled();
    await user.click(row);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    resolvePost(jsonResponse({ success: true, event: withStatus(event, "present") }));
    await waitFor(() => expect(screen.getByRole("button", { name: ROW_11_NOV })).toBeEnabled());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("n'affiche pas de message sous la feuille quand elle s'est ouverte pendant l'enregistrement rapide", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent({
      roster: [rosterEntry(2, "Lucas", "Martin", ["Trompette"], "Trompette", null)],
    });
    let resolvePost: (response: Response) => void = () => undefined;
    fetchMock.mockResolvedValueOnce(presenceResponse([event])).mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          resolvePost = resolve;
        })
    );
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: /^Présent le 11 novembre,/ }));
    await user.click(screen.getByRole("tab", { name: "Tableau" }));
    await user.click(
      await screen.findByRole("button", { name: /^Détail du mercredi 11 novembre/ })
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Présent" })).toBeDisabled();

    resolvePost(jsonResponse({ success: true, event: withStatus(event, "present") }));

    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Présent" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
    );
    expect(screen.queryByText("Réponse enregistrée")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajouter un mot" })).not.toBeInTheDocument();
  });

  it("propose « Ajouter un mot » après une réponse rapide : la feuille s'ouvre sur le commentaire", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event]))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: withStatus(event, "present") }));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: /^Présent le 11 novembre,/ }));
    await user.click(await screen.findByRole("button", { name: "Ajouter un mot" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("textbox")).toHaveFocus();
    expect(screen.queryByText("Réponse enregistrée")).not.toBeInTheDocument();
  });

  it("n'affiche pas les commentaires présents dans les entrées du roster", async () => {
    const event = createEvent({
      roster: [
        {
          ...rosterEntry(42, "Camille", "Bernard", ["Clarinette"], "Clarinette", "present"),
          comment: "SENTINEL_UI",
        },
      ],
      counts: { present: 1, absent: 0, noAnswer: 7, totalMembers: 8 },
    });
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([event]));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const table = await openTable(user);
    await user.click(within(table).getByRole("button", { name: /Clarinette/ }));
    expect(within(table).getByText("Camille Bernard")).toBeInTheDocument();
    expect(screen.queryByText("SENTINEL_UI")).not.toBeInTheDocument();

    const dialog = await openRowFromTable(user, table);
    await user.click(within(dialog).getByRole("button", { name: /Clarinette/ }));
    expect(within(dialog).getByText("Camille Bernard")).toBeInTheDocument();
    expect(screen.queryByText("SENTINEL_UI")).not.toBeInTheDocument();
  });

  it("ne propose pas les réponses rapides sans identifiant de session : le tableau seul", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ events: [createEvent()] }));
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Présent le/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("rowheader", { name: "Vous" })).not.toBeInTheDocument();
  });

  it("indique quand aucune prestation n'est à venir tout en gardant l'accès au passé", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([]));
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    expect(
      await screen.findByText("Aucune prestation ne nécessite votre réponse pour le moment.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Prestations passées/ })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});

async function openRowFromTable(user: UserEventInstance, table: HTMLElement) {
  await user.click(within(table).getByRole("button", { name: /Modifier votre réponse/ }));
  return await screen.findByRole("dialog");
}

describe("MusicianDisponibilites : feuille de détail", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-27"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("ouvre la prestation au toucher de la ligne : titre, date, lieu, adresse et échéance", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([createEvent()]));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const dialog = await openRow(user);

    expect(
      within(dialog).getByRole("heading", { name: "Cérémonie du 11 novembre" })
    ).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Mercredi 11 novembre 2026 · 10:30");
    expect(dialog).toHaveTextContent("Monument aux morts de Sucy-en-Brie");
    expect(dialog).toHaveTextContent("Place de l'Église, 94370 Sucy-en-Brie");
    expect(within(dialog).getByText("À répondre avant le 5 septembre 2026")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Présent" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(within(dialog).getByRole("button", { name: "Absent" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("affiche l'absence de date limite sans provoquer d'erreur", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      presenceResponse([createEvent({ response_deadline: null })])
    );
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const dialog = await openRow(user);

    expect(within(dialog).getByText("Pas de date limite fixée")).toBeInTheDocument();
  });

  it("Échap ferme la feuille et rend le focus à la ligne d'origine", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([createEvent()]));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await openRow(user);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: ROW_11_NOV })).toHaveFocus();
  });

  it("répond depuis la feuille, qui reste ouverte, et la liste derrière suit la réponse du serveur", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event]))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: withStatus(event, "present") }));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const dialog = await openRow(user);
    await user.click(within(dialog).getByRole("button", { name: "Présent" }));

    expect(await within(dialog).findByText("Réponse enregistrée")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Présent" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(postBody(1)).toEqual({ eventId: 8, status: "present", comment: null });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /^Présent le 11 novembre,/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("envoie le commentaire saisi avec la première réponse", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = createEvent();
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event]))
      .mockResolvedValueOnce(
        jsonResponse({ success: true, event: withStatus(event, "present", "En retard de 10 min") })
      );
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const dialog = await openRow(user);
    expect(within(dialog).getByText("Envoyé avec votre réponse")).toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Enregistrer le commentaire" })
    ).not.toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox"), "En retard de 10 min");
    await user.click(within(dialog).getByRole("button", { name: "Présent" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(postBody(1)).toEqual({
      eventId: 8,
      status: "present",
      comment: "En retard de 10 min",
    });
  });

  it("enregistre un commentaire sans changer la réponse, seulement quand il a changé", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = withStatus(createEvent(), "present");
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event]))
      .mockResolvedValueOnce(
        jsonResponse({ success: true, event: withStatus(event, "present", "Merci") })
      );
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const dialog = await openRow(user);
    const save = within(dialog).getByRole("button", { name: "Enregistrer le commentaire" });
    expect(save).toBeDisabled();
    await user.type(within(dialog).getByRole("textbox"), "Merci");
    expect(save).toBeEnabled();
    await user.click(save);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(postBody(1)).toEqual({ eventId: 8, status: "present", comment: "Merci" });
    expect(await within(dialog).findByText("Commentaire enregistré")).toBeInTheDocument();
    expect(save).toBeDisabled();
  });

  it("limite le commentaire à 1000 caractères", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([createEvent()]));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const dialog = await openRow(user);
    const textbox = within(dialog).getByRole("textbox");
    expect(textbox).toHaveAttribute("maxLength", "1000");
    fireEvent.change(textbox, { target: { value: "a".repeat(1200) } });

    expect(textbox).toHaveValue("a".repeat(1000));
    expect(within(dialog).getByText("1000/1000")).toBeInTheDocument();
  });

  it("garde la feuille ouverte avec l'erreur du serveur quand l'enregistrement échoue", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(presenceResponse([createEvent()]))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 })
      );
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const dialog = await openRow(user);
    await user.click(within(dialog).getByRole("button", { name: "Présent" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Erreur serveur");
    expect(within(dialog).getByRole("button", { name: "Présent" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    await user.click(within(dialog).getByRole("button", { name: "Fermer" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("rend le tableau « Qui vient ? » de la feuille : barre de bilan et pupitres neutres, le sien ouvert", async () => {
    const event = createEvent({
      roster: [
        rosterEntry(1, "Aaron", "Martin", ["Trompette"], "Trompette", "absent"),
        rosterEntry(2, "Lucas", "Martin", ["Trompette"], "Trompette", null),
        rosterEntry(3, "Camille", "Bernard", ["Clarinette"], "Clarinette", "present"),
      ],
      counts: { present: 1, absent: 1, noAnswer: 1, totalMembers: 3 },
    });
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([event], 2));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const dialog = await openRow(user);

    expect(
      within(dialog).getByRole("img", { name: "1 présent, 1 absent, 1 sans réponse" })
    ).toBeInTheDocument();
    const trompette = within(dialog).getByRole("button", { name: /Trompette/ });
    expect(trompette).toHaveAttribute("aria-expanded", "true");
    expect(trompette).toHaveTextContent("0/2");
    const clarinette = within(dialog).getByRole("button", { name: /Clarinette/ });
    expect(clarinette).toHaveAttribute("aria-expanded", "false");
    expect(clarinette).toHaveTextContent("1/1");
    expect(within(dialog).getByText("Aaron Martin")).toBeInTheDocument();
    expect(within(dialog).queryByText("Camille Bernard")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Vous")).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent(/Il en manque|À confirmer/);
    await user.click(clarinette);
    expect(within(dialog).getByText("Camille Bernard")).toBeInTheDocument();
  });
});

describe("MusicianDisponibilites : prestations passées", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-27"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("charge les passées au premier dépliage via includePast=1, une seule fois, en lecture seule", async () => {
    const fetchMock = vi.mocked(fetch);
    const upcoming = createEvent();
    const past = createEvent({
      id: 7,
      title: "Répétition passée",
      date: "2026-08-01",
      response: { status: "present", comment: "Merci", updated_at: null },
    });
    fetchMock
      .mockResolvedValueOnce(presenceResponse([upcoming]))
      .mockResolvedValueOnce(presenceResponse([past, upcoming]));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const toggle = await screen.findByRole("button", { name: /Prestations passées/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe("/api/musician/presence?includePast=1");
    const row = await screen.findByRole("button", {
      name: /Voir votre réponse pour Répétition passée/,
    });
    expect(row).toHaveTextContent("Présent");
    expect(screen.queryByRole("button", { name: /^Présent le 1 août,/ })).not.toBeInTheDocument();
    // La prestation à venir n'est pas dupliquée dans la section « passées ».
    expect(screen.getAllByRole("button", { name: ROW_11_NOV })).toHaveLength(1);

    await user.click(row);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Présent" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "Absent" })).toBeDisabled();
    expect(
      within(dialog).getByText("Prestation passée : les réponses ne sont plus modifiables.")
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Merci")).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("button", { name: "Effacer ma réponse" })
    ).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Fermer" }));
    expect(
      screen.getByRole("button", { name: /Voir votre réponse pour Répétition passée/ })
    ).toHaveFocus();

    await user.click(toggle);
    await user.click(toggle);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ne compte pas une prestation passée comme réponse attendue", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      presenceResponse([
        createEvent({ date: "2026-08-01" }),
        createEvent({ id: 9, title: "Concert de décembre", date: "2026-12-12" }),
      ])
    );
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    expect(await screen.findByText("1 prestation en attente de votre réponse")).toBeInTheDocument();
  });

  it("affiche l'erreur de chargement du passé et permet de réessayer", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(presenceResponse([createEvent()]))
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(presenceResponse([]));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: /Prestations passées/ }));
    expect(
      await screen.findByText("Impossible de charger les prestations passées.")
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(
      await screen.findByText("Aucune prestation passée sur les 12 derniers mois.")
    ).toBeInTheDocument();
  });
});

describe("MusicianDisponibilites : tableau « Tableau »", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-27"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("nomme la région du tableau et garde de vraies en-têtes de colonnes, de lignes et de groupes", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      presenceResponse([
        createEvent({
          roster: [rosterEntry(3, "Camille", "Bernard", ["Clarinette"], "Clarinette", null)],
        }),
      ])
    );
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const table = await openTable(user);

    expect(screen.getByRole("region", { name: "Qui vient à quelle date" })).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Qui vient à quelle date" })
    ).not.toBeInTheDocument();
    expect(table.querySelectorAll('th[scope="col"]')).toHaveLength(2);
    expect(table.querySelectorAll('th[scope="rowgroup"]')).toHaveLength(1);
    expect(table.querySelector('th[scope="row"]')).not.toBeNull();
    expect(screen.getByText(/Touchez une date pour voir le détail/)).toBeInTheDocument();
    expect(
      screen.getByText("Sans réponse", { selector: "span:not(.sr-only)" })
    ).toBeInTheDocument();
  });

  it("en-tête de date : jour, date courte, présents sur total, et ouvre la feuille de la prestation", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      presenceResponse([
        createEvent({ counts: { present: 5, absent: 0, noAnswer: 3, totalMembers: 8 } }),
      ])
    );
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const table = await openTable(user);
    const header = within(table).getByRole("button", {
      name: "Détail du mercredi 11 novembre : 5 présents sur 8",
    });
    expect(header).toHaveTextContent("11/11");
    expect(header).toHaveTextContent("5/8");
    await user.click(header);

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Cérémonie du 11 novembre" })
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(header).toHaveFocus();
  });

  it("épingle la ligne personnelle (« Vous ») : ses cellules ouvrent la feuille, celles des autres restent en lecture seule", async () => {
    const event = createEvent({
      roster: [
        rosterEntry(2, "Lucas", "Martin", ["Trompette"], "Trompette", null),
        rosterEntry(3, "Camille", "Bernard", ["Clarinette"], "Clarinette", "present"),
      ],
    });
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([event], 2));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const table = await openTable(user);

    expect(within(table).getByRole("rowheader", { name: "Vous" })).toBeInTheDocument();
    await user.click(within(table).getByRole("button", { name: /Clarinette/ }));
    const otherRow = within(table).getByRole("row", { name: /Camille Bernard/ });
    expect(within(otherRow).queryByRole("button")).not.toBeInTheDocument();
    expect(within(otherRow).getByText("Présent")).toBeInTheDocument();

    await user.click(
      within(table).getByRole("button", {
        name: "Modifier votre réponse pour Cérémonie du 11 novembre du 11/11, actuellement : sans réponse",
      })
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("laisse le musicien connecté dans son pupitre ouvert, avec « Vous » dans la feuille", async () => {
    const event = createEvent({
      roster: [
        rosterEntry(1, "Aaron", "Martin", ["Trompette"], "Trompette", "absent"),
        rosterEntry(2, "Lucas", "Martin", ["Trompette"], "Trompette", null),
      ],
    });
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([event], 2));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const table = await openTable(user);

    const trompette = table.querySelector<HTMLElement>('tbody[data-pupitre="Trompette"]');
    if (!trompette) throw new Error("Le groupe Trompette est absent");
    expect(within(trompette).getByRole("button", { name: /Trompette/ })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    const rows = within(trompette).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("Aaron Martin");
    expect(rows[2]).toHaveTextContent("Lucas Martin (Vous)");
    expect(within(rows[1] as HTMLElement).queryByText(/Vous/)).not.toBeInTheDocument();
    expect(within(rows[2] as HTMLElement).getByText("Lucas M.")).toBeInTheDocument();
  });

  it("groupe, compte et nomme les musiciens par instrument principal uniquement", async () => {
    const event = createEvent({
      roster: [
        rosterEntry(1, "Zoé", "Orchestre", ["Chef d'orchestre"], "Chef d'orchestre", null),
        rosterEntry(2, "Alice", "Adjointe", ["Chef adjoint"], "Chef adjoint", null),
        rosterEntry(
          3,
          "Paul",
          "Principal",
          ["Chef d'orchestre", "Trompette"],
          "Trompette",
          "present"
        ),
        rosterEntry(4, "Claire", "Clarinette", ["Clarinette"], "Clarinette", null),
        rosterEntry(5, "Nina", "Trompette", ["Trompette"], "Trompette", null),
        rosterEntry(6, "Noé", "Sanspupitre", [], null, null),
        rosterEntry(7, "Félix", "Repli", ["Trombone", "Clarinette"], null, "absent"),
      ],
    });
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([event], 999));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const table = await openTable(user);

    const groups = Array.from(table.querySelectorAll<HTMLElement>("tbody[data-pupitre]"));
    expect(groups.map((group) => group.dataset.pupitre)).toEqual([
      "Direction",
      "Clarinette",
      "Trompette",
      "Sans pupitre renseigné",
    ]);
    const counts = groups.map(
      (group) => within(group).getAllByRole("cell")[0]?.querySelector("[aria-hidden]")?.textContent
    );
    expect(counts).toEqual(["0/2", "0/2", "1/2", "0/1"]);

    for (const group of groups) {
      await user.click(within(group).getByRole("button", { expanded: false }));
    }
    const direction = groups[0] as HTMLElement;
    const trompette = groups[2] as HTMLElement;
    expect(direction).toHaveTextContent("Zoé Orchestre");
    expect(direction).toHaveTextContent("Alice Adjointe");
    expect(direction).not.toHaveTextContent("Paul Principal");
    expect(trompette).toHaveTextContent("Paul Principal");
    expect(trompette).toHaveTextContent("Nina Trompette");
    expect(groups[1]).toHaveTextContent("Félix Repli");
    expect(groups[1]).not.toHaveTextContent("Trombone");
    expect(within(trompette).getByText("Paul P.")).toBeInTheDocument();
  });

  it("garde les totaux de pupitre neutres : aucun libellé ni couleur d'alerte", async () => {
    const event = createEvent({
      roster: [
        rosterEntry(1, "Alice", "A", ["Flûte"], "Flûte", null),
        rosterEntry(2, "Bob", "B", ["Flûte"], "Flûte", null),
        rosterEntry(3, "Cléa", "C", ["Flûte"], "Flûte", null),
      ],
      counts: { present: 0, absent: 0, noAnswer: 3, totalMembers: 3 },
    });
    vi.mocked(fetch).mockResolvedValueOnce(presenceResponse([event], 2));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const table = await openTable(user);

    const flutes = table.querySelector<HTMLElement>('tbody[data-pupitre="Flûte"]');
    if (!flutes) throw new Error("Le groupe Flûte est absent");
    const total = within(flutes).getAllByRole("cell")[0] as HTMLElement;
    expect(total).toHaveTextContent("0/3");
    expect(total.className).not.toMatch(/success|warning|destructive/);
    expect(document.body).not.toHaveTextContent(/Il en manque|À confirmer/);
  });

  it("rend une cellule status: null comme « sans réponse », jamais comme « absent »", async () => {
    const event = createEvent({
      roster: [rosterEntry(42, "Camille", "Bernard", ["Clarinette"], "Clarinette", null)],
    });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ events: [event] }));
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const table = await screen.findByRole("table");
    await userEvent.setup().click(within(table).getByRole("button", { name: /Clarinette/ }));

    const row = within(table).getByRole("row", { name: /Camille Bernard/ });
    expect(within(row).getByText("Sans réponse")).toBeInTheDocument();
    expect(within(row).queryByText("Absent")).not.toBeInTheDocument();
  });
});

describe("MusicianDisponibilites : effacement d'une réponse", () => {
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
      roster: [rosterEntry(2, "Lucas", "Martin", ["Trompette"], "Trompette", "present")],
      counts: { present: 1, absent: 0, noAnswer: 0, totalMembers: 1 },
    });
  }

  function clearedEvent(event: ReturnType<typeof answeredEvent>) {
    return {
      ...event,
      response: { ...event.response, status: null, comment: null, updated_at: null },
      roster: [rosterEntry(2, "Lucas", "Martin", ["Trompette"], "Trompette", null)],
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
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const dialog = await openRow(user);
    await user.click(within(dialog).getByRole("button", { name: "Effacer ma réponse" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(postBody(1)).toEqual({ eventId: 8, status: null, comment: null });
    expect(await within(dialog).findByText("Réponse effacée")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Présent" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(
      within(dialog).queryByRole("button", { name: "Effacer ma réponse" })
    ).not.toBeInTheDocument();
    expect(within(dialog).getByRole("textbox")).toHaveValue("");
    expect(screen.getByText("1 prestation en attente de votre réponse")).toBeInTheDocument();
  });

  it("demande confirmation avant d'effacer un commentaire puis réconcilie la réponse serveur", async () => {
    const fetchMock = vi.mocked(fetch);
    const event = answeredEvent("Motif à supprimer");
    fetchMock
      .mockResolvedValueOnce(presenceResponse([event], 2))
      .mockResolvedValueOnce(jsonResponse({ success: true, event: clearedEvent(event) }));
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const dialog = await openRow(user);
    await user.click(within(dialog).getByRole("button", { name: "Effacer ma réponse" }));

    expect(within(dialog).getByText("Votre commentaire sera aussi supprimé.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await user.click(within(dialog).getByRole("button", { name: "Annuler" }));
    expect(within(dialog).getByRole("button", { name: "Effacer ma réponse" })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Effacer ma réponse" }));
    await user.click(within(dialog).getByRole("button", { name: "Confirmer" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(postBody(1)).toEqual({ eventId: 8, status: null, comment: null });
    await waitFor(() => expect(within(dialog).getByRole("textbox")).toHaveValue(""));
    expect(screen.queryByText("Motif à supprimer")).not.toBeInTheDocument();
    expect(screen.getByText("1 prestation en attente de votre réponse")).toBeInTheDocument();
  });

  it("garde la réponse et le commentaire si l'effacement échoue", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(presenceResponse([answeredEvent("À garder")], 2))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Erreur serveur" }), { status: 500 })
      );
    const user = userEvent.setup();
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const dialog = await openRow(user);
    await user.click(within(dialog).getByRole("button", { name: "Effacer ma réponse" }));
    await user.click(within(dialog).getByRole("button", { name: "Confirmer" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Erreur serveur");
    expect(within(dialog).getByRole("button", { name: "Présent" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(within(dialog).getByRole("textbox")).toHaveValue("À garder");
  });
});
