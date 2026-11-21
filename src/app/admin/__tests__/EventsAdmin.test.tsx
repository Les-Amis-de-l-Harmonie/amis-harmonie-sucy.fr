import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventsAdminClient } from "../EventsAdmin";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface Call {
  url: string;
  method: string;
  body: Record<string, unknown> | undefined;
}

function mockApi(events: unknown[] = []) {
  const calls: Call[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: Parameters<typeof fetch>[1]) => {
      const method = init?.method ?? "GET";
      calls.push({
        url: String(input),
        method,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      });
      return method === "GET" ? json(events) : json({ success: true });
    })
  );
  return calls;
}

const existingEvent = {
  id: 7,
  title: "Concert de Noël",
  image: null,
  location: "Salle des fêtes",
  description: null,
  date: "2026-12-20",
  time: "20:00",
  price: null,
  details_link: null,
  reservation_link: null,
  is_public: 1,
  presence_required: 1,
  parental_authorization_required: 1,
  authorization_details: "Rendez-vous à 18 h, retour à 22 h en car.",
  address: null,
  response_deadline: "2026-11-29",
  created_at: "2026-10-01",
};

describe("EventsAdminClient — autorisation parentale", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("propose l'interrupteur à côté de la présence, sans zone de texte tant qu'il est éteint", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<EventsAdminClient />);

    await user.click((await screen.findAllByRole("button", { name: /Nouvel événement/ }))[0]);
    const dialog = await screen.findByRole("dialog");

    const presence = within(dialog).getByLabelText("Réponse de présence demandée");
    const authorization = within(dialog).getByLabelText("Autorisation parentale demandée");
    expect(presence).not.toBeChecked();
    expect(authorization).not.toBeChecked();
    expect(within(dialog).queryByLabelText("Informations pour les parents")).toBeNull();
  });

  it("est indépendant de la présence : l'activer n'allume pas la présence et inversement", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<EventsAdminClient />);
    await user.click((await screen.findAllByRole("button", { name: /Nouvel événement/ }))[0]);
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByLabelText("Autorisation parentale demandée"));
    expect(within(dialog).getByLabelText("Réponse de présence demandée")).not.toBeChecked();
    expect(within(dialog).getByLabelText("Informations pour les parents")).toBeInTheDocument();

    await user.click(within(dialog).getByLabelText("Réponse de présence demandée"));
    await user.click(within(dialog).getByLabelText("Réponse de présence demandée"));
    // Éteindre la présence ne touche pas à l'autorisation.
    expect(within(dialog).getByLabelText("Autorisation parentale demandée")).toBeChecked();
  });

  it("envoie l'interrupteur et les informations pour les parents à l'enregistrement", async () => {
    const user = userEvent.setup();
    const calls = mockApi();
    render(<EventsAdminClient />);
    await user.click((await screen.findAllByRole("button", { name: /Nouvel événement/ }))[0]);
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText("Titre *"), "Sortie à la mer");
    await user.click(within(dialog).getByLabelText("Autorisation parentale demandée"));
    await user.type(
      within(dialog).getByLabelText("Informations pour les parents"),
      "Départ en car à 8 h"
    );
    await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(calls.some((call) => call.method === "POST")).toBe(true));
    expect(calls.find((call) => call.method === "POST")?.body).toMatchObject({
      title: "Sortie à la mer",
      parental_authorization_required: 1,
      authorization_details: "Départ en car à 8 h",
    });
  });

  it("recharge un événement avec ses valeurs, les modifie et renvoie le tout", async () => {
    const user = userEvent.setup();
    const calls = mockApi([existingEvent]);
    render(<EventsAdminClient />);

    expect(await screen.findByText("Autorisation")).toBeInTheDocument(); // badge de la liste
    await user.click(screen.getByRole("button", { name: "Modifier Concert de Noël" }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByLabelText("Autorisation parentale demandée")).toBeChecked();
    const details = within(dialog).getByLabelText("Informations pour les parents");
    expect(details).toHaveValue("Rendez-vous à 18 h, retour à 22 h en car.");

    await user.clear(details);
    await user.type(details, "Retour à 23 h");
    await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(calls.some((call) => call.method === "PUT")).toBe(true));
    const put = calls.find((call) => call.method === "PUT");
    expect(put?.url).toBe("/api/admin/events?id=7");
    expect(put?.body).toMatchObject({
      parental_authorization_required: 1,
      authorization_details: "Retour à 23 h",
      presence_required: 1,
    });
  });
});

describe("EventsAdminClient — pour les musiciens", { timeout: 20_000 }, () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  async function openNewEvent(user: ReturnType<typeof userEvent.setup>) {
    await user.click((await screen.findAllByRole("button", { name: /Nouvel événement/ }))[0]);
    return screen.findByRole("dialog");
  }

  it("n'affiche la section que si la réponse de présence est demandée", async () => {
    const user = userEvent.setup();
    mockApi();
    render(<EventsAdminClient />);
    const dialog = await openNewEvent(user);

    expect(within(dialog).queryByText("Pour les musiciens")).toBeNull();
    expect(within(dialog).queryByLabelText("Tenue")).toBeNull();

    await user.click(within(dialog).getByLabelText("Réponse de présence demandée"));
    expect(within(dialog).getByText("Pour les musiciens")).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Visible uniquement dans l'espace musicien, jamais sur le site public."
      )
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Tenue")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Heure de rendez-vous")).toHaveAttribute(
      "placeholder",
      "10H30"
    );
    expect(within(dialog).getByLabelText("Consignes")).toHaveAttribute(
      "placeholder",
      "Morceaux à apporter, stationnement, repas…"
    );
  });

  it("envoie la tenue, l'heure de rendez-vous et les consignes à l'enregistrement", async () => {
    const user = userEvent.setup();
    const calls = mockApi();
    render(<EventsAdminClient />);
    const dialog = await openNewEvent(user);

    await user.type(within(dialog).getByLabelText("Titre *"), "Banquet des anciens");
    await user.click(within(dialog).getByLabelText("Réponse de présence demandée"));
    await user.type(within(dialog).getByLabelText("Tenue"), "Chemise blanche, pantalon noir");
    await user.type(within(dialog).getByLabelText("Heure de rendez-vous"), "10H30");
    await user.type(
      within(dialog).getByLabelText("Consignes"),
      "Apporter Sucy Marching{Enter}Repas offert"
    );
    await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(calls.some((call) => call.method === "POST")).toBe(true));
    expect(calls.find((call) => call.method === "POST")?.body).toMatchObject({
      title: "Banquet des anciens",
      presence_required: 1,
      dress_code: "Chemise blanche, pantalon noir",
      call_time: "10H30",
      musician_notes: "Apporter Sucy Marching\nRepas offert",
    });
  });

  it("garde les valeurs saisies quand la présence est éteinte ensuite", async () => {
    const user = userEvent.setup();
    const calls = mockApi();
    render(<EventsAdminClient />);
    const dialog = await openNewEvent(user);

    await user.type(within(dialog).getByLabelText("Titre *"), "Cérémonie");
    await user.click(within(dialog).getByLabelText("Réponse de présence demandée"));
    await user.type(within(dialog).getByLabelText("Tenue"), "Tenue de cérémonie");
    await user.click(within(dialog).getByLabelText("Réponse de présence demandée"));
    expect(within(dialog).queryByLabelText("Tenue")).toBeNull();

    await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));
    await waitFor(() => expect(calls.some((call) => call.method === "POST")).toBe(true));
    expect(calls.find((call) => call.method === "POST")?.body).toMatchObject({
      presence_required: 0,
      dress_code: "Tenue de cérémonie",
    });
  });

  it("propose les tenues déjà utilisées, distinctes et les plus récentes d'abord", async () => {
    const user = userEvent.setup();
    mockApi([
      { ...existingEvent, id: 1, date: "2026-03-01", dress_code: "Tenue noire" },
      { ...existingEvent, id: 2, date: "2026-11-15", dress_code: "Chemise blanche" },
      { ...existingEvent, id: 3, date: "2026-06-10", dress_code: " tenue noire " },
      { ...existingEvent, id: 4, date: "2026-09-01", dress_code: null },
      { ...existingEvent, id: 5, date: "2026-07-01", dress_code: "Polo de l'Harmonie" },
    ]);
    render(<EventsAdminClient />);
    expect(await screen.findAllByRole("button", { name: "Modifier Concert de Noël" })).toHaveLength(
      5
    );
    const dialog = await openNewEvent(user);
    await user.click(within(dialog).getByLabelText("Réponse de présence demandée"));

    const input = within(dialog).getByLabelText("Tenue");
    const list = document.getElementById(input.getAttribute("list") ?? "");
    expect(list).not.toBeNull();
    expect([...(list?.querySelectorAll("option") ?? [])].map((option) => option.value)).toEqual([
      "Chemise blanche",
      "Polo de l'Harmonie",
      "tenue noire",
    ]);
  });

  it("recharge les infos d'un événement existant et les renvoie à la modification", async () => {
    const user = userEvent.setup();
    const calls = mockApi([
      {
        ...existingEvent,
        dress_code: "Tenue noire",
        call_time: "10H30",
        musician_notes: "Parking derrière la mairie",
      },
    ]);
    render(<EventsAdminClient />);

    await user.click(await screen.findByRole("button", { name: "Modifier Concert de Noël" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Tenue")).toHaveValue("Tenue noire");
    expect(within(dialog).getByLabelText("Heure de rendez-vous")).toHaveValue("10H30");
    expect(within(dialog).getByLabelText("Consignes")).toHaveValue("Parking derrière la mairie");

    await user.clear(within(dialog).getByLabelText("Heure de rendez-vous"));
    await user.type(within(dialog).getByLabelText("Heure de rendez-vous"), "10H");
    await user.click(within(dialog).getByRole("button", { name: "Enregistrer" }));

    await waitFor(() => expect(calls.some((call) => call.method === "PUT")).toBe(true));
    expect(calls.find((call) => call.method === "PUT")?.body).toMatchObject({
      dress_code: "Tenue noire",
      call_time: "10H",
      musician_notes: "Parking derrière la mairie",
    });
  });
});
