import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MusicianDisponibilites } from "../MusicianDisponibilites";
import { formatPracticalSummary, getPracticalInfo } from "../presence-format";
import { SELF, withSession } from "./session-fixtures";

const ROW = /^[A-Z][a-zé]{2}\. 22 nov\./;

function createEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 8,
    title: "Banquet des anciens",
    date: "2026-11-22",
    time: "11:30",
    location: "Salle des fêtes",
    address: null,
    response_deadline: null,
    response: { status: null, comment: null, updated_at: null },
    roster: [],
    counts: { present: 0, absent: 0, noAnswer: 8, totalMembers: 8 },
    ...overrides,
  };
}

const practical = {
  call_time: "10H30",
  dress_code: "Chemise blanche, pantalon noir",
  musician_notes: "Apporter Sucy Marching.\nStationnement derrière la mairie.\n\nRepas offert.",
};

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

function presence(events: unknown[]): Response {
  return jsonResponse({ currentUserId: SELF.userId, events });
}

describe("Rendez-vous, tenue et consignes — espace musicien", () => {
  beforeEach(() => {
    vi.setSystemTime(new Date("2026-11-10"));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("résume le rendez-vous et la tenue dans la ligne, sans les consignes", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(presence([createEvent(practical)]));
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const row = await screen.findByRole("button", { name: ROW });
    expect(row).toHaveTextContent("Rendez-vous 10H30 · Tenue : Chemise blanche, pantalon noir");
    expect(row).not.toHaveTextContent("Stationnement");
  });

  it("n'ajoute rien à la ligne quand rien n'est renseigné", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(presence([createEvent()]));
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const row = await screen.findByRole("button", { name: ROW });
    expect(row).not.toHaveTextContent("Rendez-vous");
    expect(row).not.toHaveTextContent("Tenue");
  });

  it("n'affiche que ce qui est renseigné (tenue seule)", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      presence([createEvent({ dress_code: "Polo de l'Harmonie", call_time: "  " })])
    );
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    const row = await screen.findByRole("button", { name: ROW });
    expect(row).toHaveTextContent("Tenue : Polo de l'Harmonie");
    expect(row).not.toHaveTextContent("Rendez-vous");
  });

  it("montre le détail dans la feuille : rendez-vous, tenue et consignes multi-lignes", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(presence([createEvent(practical)]));
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: ROW }));
    const dialog = await screen.findByRole("dialog");

    expect(within(dialog).getByText("Rendez-vous 10H30")).toBeInTheDocument();
    expect(within(dialog).getByText("Tenue : Chemise blanche, pantalon noir")).toBeInTheDocument();

    const notes = within(dialog).getByRole("region", { name: "Consignes" });
    const text = within(notes).getByText(/Apporter Sucy Marching/);
    expect(text).toHaveClass("whitespace-pre-wrap");
    expect(text.textContent).toBe(practical.musician_notes);
  });

  it("n'affiche pas de bloc « Consignes » quand il n'y en a pas", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(
      presence([createEvent({ call_time: "10H30", musician_notes: "  " })])
    );
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("button", { name: ROW }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Rendez-vous 10H30")).toBeInTheDocument();
    expect(within(dialog).queryByRole("region", { name: "Consignes" })).not.toBeInTheDocument();
  });

  it("vue tableau : aucune surcharge, le détail reste dans la feuille", async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValueOnce(presence([createEvent(practical)]));
    render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

    await user.click(await screen.findByRole("tab", { name: "Tableau" }));
    const table = await screen.findByRole("table");
    expect(within(table).queryByText(/Rendez-vous/)).not.toBeInTheDocument();
    expect(within(table).queryByText(/Tenue/)).not.toBeInTheDocument();
  });

  it("liste verrouillée (bêta) : rendez-vous, tenue et consignes sous chaque date", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(presence([createEvent(practical)]));
    render(withSession({ profiles: [SELF], presenceLocked: true }, <MusicianDisponibilites />));

    const list = await screen.findByRole("list");
    expect(within(list).getByText("Banquet des anciens")).toBeInTheDocument();
    expect(
      within(list).getByText("Rendez-vous 10H30 · Tenue : Chemise blanche, pantalon noir")
    ).toBeInTheDocument();
    const notes = within(list).getByText(/Apporter Sucy Marching/);
    expect(notes).toHaveClass("whitespace-pre-wrap");
    expect(notes.textContent).toBe(practical.musician_notes);
  });

  it("liste verrouillée : une date sans infos pratiques reste sobre", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(presence([createEvent()]));
    render(withSession({ profiles: [SELF], presenceLocked: true }, <MusicianDisponibilites />));

    const list = await screen.findByRole("list");
    expect(within(list).queryByText(/Rendez-vous/)).not.toBeInTheDocument();
    expect(within(list).queryByText(/Tenue/)).not.toBeInTheDocument();
  });
});

describe("presence-format : infos pratiques", () => {
  it("getPracticalInfo écarte les valeurs vides ou blanches", () => {
    expect(
      getPracticalInfo({ call_time: " 10H30 ", dress_code: "", musician_notes: "  " })
    ).toEqual({
      callTime: "10H30",
      dressCode: null,
      notes: null,
    });
    expect(getPracticalInfo({})).toEqual({ callTime: null, dressCode: null, notes: null });
  });

  it("formatPracticalSummary assemble rendez-vous et tenue, ou rien", () => {
    expect(formatPracticalSummary({ call_time: "10H30", dress_code: "Noir" })).toBe(
      "Rendez-vous 10H30 · Tenue : Noir"
    );
    expect(formatPracticalSummary({ call_time: "10H30" })).toBe("Rendez-vous 10H30");
    expect(formatPracticalSummary({ dress_code: "Noir" })).toBe("Tenue : Noir");
    expect(formatPracticalSummary({ musician_notes: "Seulement des consignes" })).toBeNull();
  });
});
