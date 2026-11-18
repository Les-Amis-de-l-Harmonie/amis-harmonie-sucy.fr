import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { formatAnsweredBy, PresenceCard } from "../PresenceCard";
import type { PresenceAnsweredBy, PresenceEvent } from "../musician-types";
import { SELF, withSession } from "./session-fixtures";

function createEvent(
  answeredBy?: PresenceAnsweredBy | null,
  status: "present" | "absent" | null = "present"
): PresenceEvent {
  return {
    id: 8,
    title: "Concert d'automne",
    date: "2099-11-11",
    time: "20:30",
    location: "Salle des fêtes",
    address: null,
    response_deadline: null,
    response: {
      status,
      comment: null,
      updated_at: "2026-11-01 10:00:00",
      ...(answeredBy !== undefined ? { answeredBy } : {}),
    },
    roster: [],
    counts: { present: 1, absent: 0, noAnswer: 0, totalMembers: 1 },
  };
}

function renderCard(event: PresenceEvent) {
  render(
    withSession(
      { profiles: [SELF] },
      <PresenceCard event={event} onUpdate={vi.fn()} onStatusChanged={vi.fn()} />
    )
  );
}

describe("Auteur de la réponse de présence", () => {
  it("indique le prénom et le lien de parenté d'un parent", () => {
    renderCard(createEvent({ name: "Aurélie", relation: "mère", byAssociation: false, byYou: false }));
    expect(screen.getByText("Réponse donnée par Aurélie (mère)")).toBeInTheDocument();
  });

  it("n'ajoute pas de parenthèses sans lien de parenté", () => {
    renderCard(createEvent({ name: "Aurélie", relation: null, byAssociation: false, byYou: false }));
    expect(screen.getByText("Réponse donnée par Aurélie")).toBeInTheDocument();
  });

  it("indique l'association, sans nom d'administrateur", () => {
    renderCard(createEvent({ name: null, relation: null, byAssociation: true, byYou: false }));
    expect(screen.getByText("Réponse donnée par l'association")).toBeInTheDocument();
  });

  it("indique que le parent connecté a lui-même répondu pour l'enfant", () => {
    renderCard(
      createEvent({ name: "Paul", relation: null, byAssociation: false, byYou: true })
    );
    expect(screen.getByText("Réponse donnée par vous")).toBeInTheDocument();
  });

  it("n'affiche rien quand le musicien a répondu lui-même (null)", () => {
    renderCard(createEvent(null));
    expect(screen.queryByText(/Réponse donnée par/)).not.toBeInTheDocument();
  });

  it("reste compatible avec une API qui n'envoie pas encore answeredBy", () => {
    renderCard(createEvent(undefined));
    expect(screen.queryByText(/Réponse donnée par/)).not.toBeInTheDocument();
  });

  it("n'affiche rien tant qu'il n'y a pas de réponse", () => {
    renderCard(
      createEvent(
        { name: "Aurélie", relation: "mère", byAssociation: false, byYou: false },
        null
      )
    );
    expect(screen.queryByText(/Réponse donnée par/)).not.toBeInTheDocument();
  });

  it("formatAnsweredBy ignore un parent sans nom", () => {
    expect(
      formatAnsweredBy({ name: "  ", relation: "mère", byAssociation: false, byYou: false })
    ).toBeNull();
    expect(formatAnsweredBy(undefined)).toBeNull();
  });
});
