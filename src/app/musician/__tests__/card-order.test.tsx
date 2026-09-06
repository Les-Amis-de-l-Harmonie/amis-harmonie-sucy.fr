import { render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MUSICIAN_CARD_LABELS } from "@/db/types";
import { MusicianHomeClient } from "../MusicianHome";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

function createProfile(overrides: { harmonieInstruments?: string[] } = {}) {
  return {
    id: 2,
    user_id: 2,
    first_name: "Lucas",
    last_name: "Martin",
    avatar: null,
    date_of_birth: "1990-01-15",
    phone: "0600000000",
    address_line1: "1 rue de l'Harmonie",
    address_line2: null,
    postal_code: "94370",
    city: "Sucy-en-Brie",
    harmonie_start_date: "2020-09-01",
    is_conservatory_student: 0,
    music_theory_level: "Confirmé",
    emergency_contact_last_name: "Martin",
    emergency_contact_first_name: "Camille",
    emergency_contact_email: "camille@example.com",
    emergency_contact_phone: "0611111111",
    image_consent: 1,
    adhesion_2026_2027: 1,
    updated_at: "2026-08-01 12:00:00",
    created_at: "2020-09-01 12:00:00",
    email: "lucas@example.com",
    instruments: [],
    harmonieInstruments: ["Trompette"],
    primaryHarmonieInstrument: "Trompette",
    insuranceInstruments: [],
    insurance_complete: false,
    ...overrides,
  };
}

function createOutingSettings(isActive: number) {
  return {
    id: 1,
    title: "Sortie annuelle",
    subtitle: "Inscrivez-vous",
    description: "Une sortie pour les adhérents.",
    location: "Sucy-en-Brie",
    price: "15 €",
    button_text: "S'inscrire",
    button_link: "https://example.com/inscription",
    is_active: isActive,
    created_at: "2026-01-01 12:00:00",
    updated_at: "2026-01-01 12:00:00",
  };
}

function mockHomeFetch(
  cardOrder: string[],
  outingIsActive = 1,
  profileOverrides: { harmonieInstruments?: string[] } = {}
) {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);

    if (url === "/api/musician/profile") return jsonResponse(createProfile(profileOverrides));
    if (url === "/api/outing-settings") {
      return jsonResponse(createOutingSettings(outingIsActive));
    }
    if (url === "/api/card-order") {
      return jsonResponse({ card_order: JSON.stringify(cardOrder) });
    }
    if (url === "/api/info-settings") return jsonResponse({ is_active: 0 });
    if (url === "/api/musician/birthdays") return jsonResponse([]);
    if (url === "/api/musician/ideas?count=unread") return jsonResponse({ count: 0 });
    if (url === "/api/musician/planning-check") {
      return jsonResponse({ urgent: false, nextEvent: null, urgentEvent: null });
    }
    if (url === "/api/videos") return jsonResponse([]);

    throw new Error(`URL inattendue : ${url}`);
  });
}

function renderHome() {
  render(<MusicianHomeClient userId={2} firstName="Lucas" lastName="Martin" />);
}

/**
 * Titres des cartes de la grille secondaire, dans leur ordre DOM.
 *
 * La requête est volontairement **scopée au conteneur `secondary-cards`** plutôt
 * qu'au document entier : la Phase 2b ajoute à cette page une zone « essentiels »
 * et un titre de section, et la salutation changera probablement de formulation.
 * Une collecte globale filtrée sur le texte de la salutation ferait alors échouer
 * ces tests **sans que le contrat `card_order` soit cassé** — et le réflexe serait
 * d'élargir le filtre, ce qui affaiblirait silencieusement le seul garde-fou de ce
 * contrat. Le scope rend l'assertion indépendante de la copie et du reste de la page.
 */
function getCardTitles(): string[] {
  return within(screen.getByTestId("secondary-cards"))
    .getAllByRole("heading")
    .map((heading) => heading.textContent?.trim() ?? "");
}

describe("contrat card_order du portail musicien", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("conserve exactement les dix clés de carte publiées", () => {
    expect(Object.keys(MUSICIAN_CARD_LABELS).sort()).toEqual(
      [
        "profile",
        "adhesion",
        "assurance",
        "planning",
        "partitions",
        "boite-a-idee",
        "outing",
        "social",
        "birthdays",
        "trombinoscope",
      ].sort()
    );
  });

  it("rejette les clés inconnues et ajoute les clés manquantes à la fin", async () => {
    mockHomeFetch(["trombinoscope", "carte-inconnue", "profile"]);
    renderHome();

    await waitFor(() =>
      expect(getCardTitles()).toEqual([
        "Trombinoscope",
        "Mon Profil",
        "Adhésion",
        "Assurance",
        "Mes prestations",
        "Partitions",
        "Boîte à idée",
        "Sortie annuelle",
        "Anniversaires",
        "Suivez-nous",
      ])
    );
    expect(screen.queryByText("carte-inconnue")).not.toBeInTheDocument();
  });

  it("rend les cartes dans l'ordre renvoyé par l'administration", async () => {
    mockHomeFetch([
      "social",
      "planning",
      "profile",
      "outing",
      "boite-a-idee",
      "trombinoscope",
      "birthdays",
      "assurance",
      "partitions",
      "adhesion",
    ]);
    renderHome();

    await waitFor(() =>
      expect(getCardTitles()).toEqual([
        "Suivez-nous",
        "Mes prestations",
        "Mon Profil",
        "Sortie annuelle",
        "Boîte à idée",
        "Trombinoscope",
        "Anniversaires",
        "Assurance",
        "Partitions",
        "Adhésion",
      ])
    );
  });

  it("masque la carte sortie quand is_active est différent de 1", async () => {
    mockHomeFetch(["outing", "profile"], 0);
    renderHome();

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Mon Profil" })).toBeInTheDocument()
    );
    expect(screen.queryByRole("heading", { name: "Sortie annuelle" })).not.toBeInTheDocument();
  });

  it("conserve les dix titres dans le DOM quand le profil est incomplet", async () => {
    mockHomeFetch(
      [
        "profile",
        "adhesion",
        "assurance",
        "planning",
        "partitions",
        "boite-a-idee",
        "outing",
        "birthdays",
        "social",
        "trombinoscope",
      ],
      1,
      { harmonieInstruments: [] }
    );
    renderHome();

    await waitFor(() =>
      expect(getCardTitles()).toEqual([
        "Mon Profil",
        "Adhésion",
        "Assurance",
        "Mes prestations",
        "Partitions",
        "Boîte à idée",
        "Sortie annuelle",
        "Anniversaires",
        "Suivez-nous",
        "Trombinoscope",
      ])
    );
  });
});
