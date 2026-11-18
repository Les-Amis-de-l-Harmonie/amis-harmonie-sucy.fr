import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getActingLabels } from "../acting-labels";
import { MusicianDisponibilites } from "../MusicianDisponibilites";
import { MusicianLayout } from "../MusicianLayout";
import { MusicianSidebar } from "../MusicianSidebar";
import { PresenceCard } from "../PresenceCard";
import { PrestationsModule } from "../PrestationsModule";
import { buildProfileJourney } from "../profile-journey";
import type { PresenceEvent } from "../musician-types";
import { actorOf, GUARDIAN_SELF, LEA, SELF, withSession } from "./session-fixtures";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

function createEvent(): PresenceEvent {
  return {
    id: 8,
    title: "Concert d'automne",
    date: "2099-11-11",
    time: "20:30",
    location: null,
    address: null,
    response_deadline: null,
    response: { status: "present", comment: "À l'heure", updated_at: "2026-11-01 10:00:00" },
    roster: [],
    counts: { present: 1, absent: 0, noAnswer: 0, totalMembers: 1 },
  };
}

const delegatedSession = {
  profiles: [GUARDIAN_SELF, LEA],
  userId: LEA.userId,
  delegated: true,
  actor: GUARDIAN_SELF,
};

describe("Textes à la troisième personne en délégation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getActingLabels renvoie les textes d'origine sans prénom", () => {
    const labels = getActingLabels(null);
    expect(labels.navPrestations).toBe("Mes prestations");
    expect(labels.navProfile).toBe("Mon profil");
    expect(labels.greeting("Claire")).toBe("Bonjour, Claire !");
    expect(labels.journeyTitle).toBe("Votre progression");
    expect(labels.prestationsUrgent).toBe("Une réponse est attendue de votre part.");
  });

  it("getActingLabels utilise le prénom de l'enfant", () => {
    const labels = getActingLabels("Léa");
    expect(labels.navPrestations).toBe("Prestations de Léa");
    expect(labels.navProfile).toBe("Profil de Léa");
    expect(labels.greeting("Léa")).toBe("Espace de Léa");
    expect(labels.journeyTitle).toBe("Progression de Léa");
    expect(labels.prestationsUrgent).toBe("Une réponse est attendue pour Léa.");
    expect(labels.editComment).toBe("Modifier le commentaire pour Léa");
    expect(labels.insuranceTitle).toBe("Instruments assurés de Léa");
    expect(labels.ideaResponseTitle).toBe("Idée de Léa");
  });

  it("utilise un sujet neutre quand le profil délégué n'a pas de prénom", () => {
    const labels = getActingLabels("  ", true);
    expect(labels.navPrestations).toBe("Prestations de ce musicien");
    expect(labels.clearAnswer).toBe("Effacer la réponse");
    expect(labels.clearCommentWarning).toBe("Le commentaire pour ce musicien sera aussi supprimé.");
    expect(labels.ideaResponseTitle).toBe("Idée de ce musicien");
  });

  it("la barre latérale parle de l'enfant en délégation", () => {
    render(
      withSession(
        delegatedSession,
        <MusicianSidebar pathname="/musician/" firstName="Léa" lastName="Martin" />
      )
    );
    const nav = screen.getByRole("navigation", { name: "Sections de l'espace musicien" });
    expect(within(nav).getByText("Prestations de Léa")).toBeInTheDocument();
    expect(within(nav).getByText("Profil de Léa")).toBeInTheDocument();
    expect(within(nav).queryByText("Mes prestations")).not.toBeInTheDocument();
  });

  it("la barre latérale garde « Mes prestations » et « Mon profil » hors délégation", () => {
    render(
      withSession(
        { profiles: [SELF, LEA] },
        <MusicianSidebar pathname="/musician/" firstName="Claire" lastName="Martin" />
      )
    );
    const nav = screen.getByRole("navigation", { name: "Sections de l'espace musicien" });
    expect(within(nav).getByText("Mes prestations")).toBeInTheDocument();
    expect(within(nav).getByText("Mon profil")).toBeInTheDocument();
  });

  it("la feuille « Plus » reprend le libellé de l'enfant", async () => {
    const user = userEvent.setup();
    render(
      <MusicianLayout
        pathname="/musician/"
        firstName="Léa"
        lastName="Martin"
        userId={LEA.userId}
        actor={actorOf(GUARDIAN_SELF)}
        delegated
        profiles={[GUARDIAN_SELF, LEA]}
      >
        <p>Contenu</p>
      </MusicianLayout>
    );
    await user.click(screen.getByRole("button", { name: "Plus" }));
    expect(screen.getByRole("link", { name: "Profil de Léa" })).toBeInTheDocument();
  });

  it("le module Prestations dit pour qui la réponse est attendue", () => {
    const props = {
      loading: false,
      nextEvents: [{ title: "Concert d'automne", date: "2099-11-11" }],
      planningUrgent: true,
      urgentEvent: { title: "Concert d'automne", date: "2099-11-11" },
    };
    const { unmount } = render(withSession(delegatedSession, <PrestationsModule {...props} />));
    expect(screen.getByText("Une réponse est attendue pour Léa.")).toBeInTheDocument();
    unmount();

    render(withSession({ profiles: [SELF] }, <PrestationsModule {...props} />));
    expect(screen.getByText("Une réponse est attendue de votre part.")).toBeInTheDocument();
  });

  it("la page Prestations est titrée au nom de l'enfant", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ currentUserId: LEA.userId, events: [] }));
    render(withSession(delegatedSession, <MusicianDisponibilites />));
    expect(await screen.findByRole("heading", { name: "Prestations de Léa" })).toBeInTheDocument();
  });

  it("la carte de présence parle du commentaire de l'enfant", async () => {
    const user = userEvent.setup();
    render(
      withSession(
        delegatedSession,
        <PresenceCard event={createEvent()} onUpdate={vi.fn()} onStatusChanged={vi.fn()} />
      )
    );
    expect(
      screen.getByRole("button", { name: /Modifier le commentaire pour Léa/ })
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Effacer la réponse/ }));
    expect(screen.getByText("Le commentaire pour Léa sera aussi supprimé.")).toBeInTheDocument();
  });

  it("la carte de présence garde ses textes d'origine hors délégation", () => {
    render(
      withSession(
        { profiles: [SELF, LEA] },
        <PresenceCard event={createEvent()} onUpdate={vi.fn()} onStatusChanged={vi.fn()} />
      )
    );
    expect(screen.getByRole("button", { name: /Modifier mon commentaire/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Effacer ma réponse/ })).toBeInTheDocument();
  });

  it("le parcours de l'accueil se décline à la troisième personne", () => {
    const labels = getActingLabels("Léa").journey;
    const steps = buildProfileJourney(null, false, null, 0, labels);
    expect(steps.find((step) => step.key === "profile")?.cta).toBe("Compléter le profil");
    expect(steps.find((step) => step.key === "presence")?.detail).toBe(
      "Toutes les réponses de Léa sont à jour"
    );
    const original = buildProfileJourney(null, false, null, 0);
    expect(original.find((step) => step.key === "profile")?.cta).toBe("Compléter mon profil");
    expect(original.find((step) => step.key === "presence")?.detail).toBe(
      "Toutes vos réponses sont à jour"
    );
  });
});
