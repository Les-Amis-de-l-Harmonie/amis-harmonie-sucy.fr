import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRESENCE_SHEET_URL } from "@/lib/presence-beta";
import { JourneyModule } from "../JourneyModule";
import { MusicianDisponibilites } from "../MusicianDisponibilites";
import { PrestationsModule } from "../PrestationsModule";
import type { PresenceAuthorization, PresenceEvent, ProfileWithExtras } from "../musician-types";
import { GUARDIAN_SELF, LEA, SELF, withSession } from "./session-fixtures";

const TITLE = "Les réponses se font encore dans le fichier des présences";
const SHEET_BUTTON = /Ouvrir le fichier des présences/;

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

function authorization(): PresenceAuthorization {
  return {
    details: "Départ en car à 9 h.",
    status: "missing",
    authorizedBy: null,
    authorizedAt: null,
    outdated: false,
    canAuthorize: true,
  };
}

function createEvent(overrides: Partial<PresenceEvent> = {}): PresenceEvent {
  return {
    id: 8,
    title: "Concert d'automne",
    date: "2099-06-20",
    time: "20:30",
    location: "Salle des fêtes",
    address: null,
    response_deadline: null,
    response: { status: null, comment: null, updated_at: null },
    roster: [],
    counts: { present: 0, absent: 0, noAnswer: 1, totalMembers: 1 },
    authorization: authorization(),
    ...overrides,
  };
}

function expectSheetLink(link: HTMLElement) {
  expect(link).toHaveAttribute("href", PRESENCE_SHEET_URL);
  expect(link).toHaveAttribute("target", "_blank");
  expect(link.getAttribute("rel")).toContain("noopener");
}

describe("Réponses de présence fermées (bêta)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("page Prestations", () => {
    function mockEvents(events: PresenceEvent[]) {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ currentUserId: SELF.userId, events }));
    }

    it("remplace les réponses par un message clair et un lien vers le fichier", async () => {
      mockEvents([createEvent()]);
      render(withSession({ profiles: [SELF], presenceLocked: true }, <MusicianDisponibilites />));

      expect(await screen.findByRole("heading", { name: TITLE })).toBeInTheDocument();
      expect(
        screen.getByText(
          "Cette page est en cours de finalisation. Pour l'instant, continuez à indiquer vos présences dans le fichier des présences."
        )
      ).toBeInTheDocument();
      expectSheetLink(screen.getByRole("link", { name: SHEET_BUTTON }));
    });

    it("ne propose aucune réponse ni autorisation, et n'affiche aucun état de réponse", async () => {
      mockEvents([
        createEvent({ response: { status: "present", comment: null, updated_at: "2026-11-01" } }),
      ]);
      render(withSession({ profiles: [SELF], presenceLocked: true }, <MusicianDisponibilites />));

      await screen.findByText("Concert d'automne");
      expect(screen.queryByRole("button", { name: /Présent|Absent/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /autorise/i })).not.toBeInTheDocument();
      expect(
        screen.queryByRole("region", { name: "Autorisation parentale" })
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/autorisation(s)? parentale/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/en attente de votre réponse/)).not.toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("liste seulement les prochaines dates, sans les dates passées", async () => {
      mockEvents([
        createEvent(),
        createEvent({ id: 9, title: "Ancien concert", date: "2020-01-10", authorization: null }),
      ]);
      render(withSession({ profiles: [SELF], presenceLocked: true }, <MusicianDisponibilites />));

      const list = await screen.findByRole("list");
      expect(within(list).getByText("Concert d'automne")).toBeInTheDocument();
      expect(within(list).getByText(/20:30 · Salle des fêtes/)).toBeInTheDocument();
      expect(screen.queryByText("Ancien concert")).not.toBeInTheDocument();
    });

    it("garde le message même si les dates ne se chargent pas", async () => {
      vi.mocked(fetch).mockRejectedValue(new TypeError("network"));
      render(withSession({ profiles: [SELF], presenceLocked: true }, <MusicianDisponibilites />));

      expect(await screen.findByRole("heading", { name: TITLE })).toBeInTheDocument();
      expectSheetLink(screen.getByRole("link", { name: SHEET_BUTTON }));
    });

    it("ne fait aucune écriture", async () => {
      mockEvents([createEvent()]);
      render(withSession({ profiles: [SELF], presenceLocked: true }, <MusicianDisponibilites />));
      await screen.findByText("Concert d'automne");
      for (const [, init] of vi.mocked(fetch).mock.calls) {
        expect(init?.method ?? "GET").toBe("GET");
      }
    });

    it("parle des présences de l'enfant quand un parent agit pour lui", async () => {
      mockEvents([]);
      render(
        withSession(
          {
            profiles: [GUARDIAN_SELF, LEA],
            userId: LEA.userId,
            delegated: true,
            actor: GUARDIAN_SELF,
            presenceLocked: true,
          },
          <MusicianDisponibilites />
        )
      );
      expect(
        await screen.findByText(/continuez à indiquer les présences de Léa dans le fichier/)
      ).toBeInTheDocument();
      expectSheetLink(screen.getByRole("link", { name: SHEET_BUTTON }));
    });

    it("compte testeur : page inchangée, avec un badge Bêta et sans message de blocage", async () => {
      mockEvents([createEvent()]);
      render(withSession({ profiles: [SELF] }, <MusicianDisponibilites />));

      expect(await screen.findByRole("heading", { name: "Mes prestations" })).toBeInTheDocument();
      expect(screen.getByText("Bêta")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: TITLE })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: SHEET_BUTTON })).not.toBeInTheDocument();
    });
  });

  describe("accueil", () => {
    const urgentEvent = { title: "Concert d'automne", date: "2099-06-20" };
    const prestationsProps = {
      loading: false,
      nextEvents: [urgentEvent],
      planningUrgent: true,
      urgentEvent,
    };

    it("le module Prestations n'appelle plus à répondre et renvoie vers le fichier", () => {
      render(
        withSession(
          { profiles: [SELF], presenceLocked: true },
          <PrestationsModule {...prestationsProps} />
        )
      );

      expect(
        screen.getByText(
          "Les présences s'indiquent encore dans le fichier des présences, pas sur le site."
        )
      ).toBeInTheDocument();
      expectSheetLink(screen.getByRole("link", { name: SHEET_BUTTON }));
      expect(screen.getByText("Concert d'automne")).toBeInTheDocument();
      expect(screen.queryByText(/Répondre maintenant/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Une réponse est attendue/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Indiquer mes présences/)).not.toBeInTheDocument();
    });

    it("sans prestation à venir, le renvoi vers le fichier reste proposé", () => {
      render(
        withSession(
          { profiles: [SELF], presenceLocked: true },
          <PrestationsModule
            loading={false}
            nextEvents={[]}
            planningUrgent={false}
            urgentEvent={null}
          />
        )
      );
      expectSheetLink(screen.getByRole("link", { name: SHEET_BUTTON }));
      expect(screen.queryByText(/Voir mes prestations/)).not.toBeInTheDocument();
    });

    it("compte testeur : module Prestations inchangé", () => {
      render(withSession({ profiles: [SELF] }, <PrestationsModule {...prestationsProps} />));
      expect(screen.getByText("Une réponse est attendue de votre part.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /Répondre maintenant/ })).toHaveAttribute(
        "href",
        "/musician/disponibilites"
      );
      expect(screen.queryByRole("link", { name: SHEET_BUTTON })).not.toBeInTheDocument();
    });

    const profile: ProfileWithExtras = {
      first_name: "Claire",
      last_name: "Martin",
      adhesion_2026_2027: 1,
      insurance_complete: true,
      insuranceInstruments: [],
    };
    const journeyProps = {
      loading: false,
      profile,
      planningUrgent: true,
      urgentEvent,
      pendingCount: 2,
    };

    it("le parcours n'a plus d'étape Prestations à faire sur le site", () => {
      render(
        withSession({ profiles: [SELF], presenceLocked: true }, <JourneyModule {...journeyProps} />)
      );
      expect(screen.queryByText("Prestations")).not.toBeInTheDocument();
      expect(screen.queryByText(/Répondre maintenant/)).not.toBeInTheDocument();
      expect(screen.getByText(/étapes? sur 3 en ordre/)).toBeInTheDocument();
    });

    it("compte testeur : le parcours garde ses quatre étapes", () => {
      render(withSession({ profiles: [SELF] }, <JourneyModule {...journeyProps} />));
      expect(screen.getByText("Prestations")).toBeInTheDocument();
      expect(screen.getByText(/étapes? sur 4 en ordre/)).toBeInTheDocument();
    });
  });
});
