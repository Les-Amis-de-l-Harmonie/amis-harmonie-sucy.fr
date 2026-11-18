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

describe("EventsAdminClient — autorisation parentale", () => {
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
