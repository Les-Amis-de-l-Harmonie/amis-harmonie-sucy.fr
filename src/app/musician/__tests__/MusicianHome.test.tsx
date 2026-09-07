import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Video } from "@/db/types";
import type { Birthday, ProfileWithExtras } from "../musician-types";
import { MusicianHomeClient } from "../MusicianHome";
import { buildProfileJourney, summarizeProfileCompletion } from "../profile-journey";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

function createProfile(overrides: Partial<ProfileWithExtras> = {}): ProfileWithExtras {
  return {
    id: 2,
    user_id: 2,
    first_name: "Lucas",
    last_name: "Martin",
    avatar: "https://example.com/avatar.jpg",
    date_of_birth: "1990-01-15",
    phone: "06 00 00 00 00",
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
    emergency_contact_phone: "06 11 11 11 11",
    image_consent: 1,
    adhesion_2026_2027: 1,
    updated_at: "2026-08-01 12:00:00",
    created_at: "2020-09-01 12:00:00",
    email: "lucas@example.com",
    harmonieInstruments: ["Trompette"],
    primaryHarmonieInstrument: "Trompette",
    insuranceInstruments: [],
    insurance_complete: false,
    ...overrides,
  };
}

function createVideo(): Video {
  return {
    id: 1,
    title: "Le concert de printemps",
    youtube_id: "abc123",
    thumbnail: null,
    is_short: 0,
    sort_order: 1,
    publication_date: "2026-05-01",
    created_at: "2026-05-01 12:00:00",
  };
}

function createBirthday(): Birthday {
  return {
    first_name: "Alice",
    last_name: "Martin",
    date_of_birth: "1991-01-15",
    avatar: null,
  };
}

function createIncompleteProfile(): ProfileWithExtras {
  return createProfile({
    first_name: null,
    last_name: null,
    avatar: null,
    date_of_birth: null,
    phone: null,
    address_line1: null,
    postal_code: null,
    city: null,
    harmonie_start_date: null,
    harmonieInstruments: [],
    is_conservatory_student: undefined,
    image_consent: undefined,
    emergency_contact_first_name: null,
    emergency_contact_last_name: null,
    emergency_contact_phone: null,
  });
}

function mockHomeFetch({
  profile = createProfile(),
  outingIsActive = 1,
  planningUrgent = false,
  pendingCount = 0,
  nextEvent = { title: "Concert de rentrée", date: "2026-09-20" },
  urgentEvent = null,
  birthdays = [createBirthday()],
  ideas = [
    {
      id: 1,
      title: "Une idée publique",
      description: "Une proposition à partager.",
      category: "association",
      created_at: "2026-09-01 12:00:00",
      author_first_name: "Alice",
      likes_count: 2,
    },
  ],
  video = createVideo(),
}: {
  profile?: ProfileWithExtras;
  outingIsActive?: number;
  planningUrgent?: boolean;
  pendingCount?: number;
  nextEvent?: { title: string; date: string } | null;
  urgentEvent?: { title: string; date: string } | null;
  birthdays?: Birthday[];
  ideas?: Array<{
    id: number;
    title: string;
    description: string;
    category: "association" | "harmonie" | "website";
    created_at: string;
    author_first_name: string | null;
    likes_count: number;
  }>;
  video?: Video | null;
} = {}) {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);

    if (url === "/api/musician/profile") return jsonResponse(profile);
    if (url === "/api/outing-settings") {
      return jsonResponse({
        id: 1,
        title: "Sortie annuelle",
        subtitle: "Inscrivez-vous",
        description: "Une sortie pour les adhérents.",
        location: "Sucy-en-Brie",
        price: "15 €",
        button_text: "S'inscrire",
        button_link: "https://example.com/inscription",
        is_active: outingIsActive,
        created_at: "2026-01-01 12:00:00",
        updated_at: "2026-01-01 12:00:00",
      });
    }
    if (url === "/api/info-settings") return jsonResponse({ is_active: 0 });
    if (url === "/api/musician/birthdays") return jsonResponse(birthdays);
    if (url === "/api/musician/ideas?count=unread") {
      return jsonResponse({ count: 42, recent: ideas });
    }
    if (url === "/api/musician/planning-check") {
      return jsonResponse({ urgent: planningUrgent, pendingCount, nextEvent, urgentEvent });
    }
    if (url === "/api/videos") return jsonResponse(video ? [video] : []);

    throw new Error(`URL inattendue : ${url}`);
  });
}

function renderHome() {
  render(<MusicianHomeClient userId={2} firstName="Lucas" lastName="Martin" />);
}

describe("parcours de l'accueil musicien", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("calcule directement le décompte des sections d'un profil incomplet", () => {
    const summary = summarizeProfileCompletion(createIncompleteProfile());

    expect(summary).toMatchObject({
      completedSections: 0,
      totalSections: 6,
      isComplete: false,
      firstIncompleteSectionId: "personal-info",
    });
  });

  it("affiche le profil comme étape incomplète avec son décompte de sections", async () => {
    mockHomeFetch({
      profile: createIncompleteProfile(),
      birthdays: [],
      ideas: [],
      video: null,
      outingIsActive: 0,
      nextEvent: null,
    });
    renderHome();

    expect(await screen.findByText("0 section sur 6")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Profil.*Compléter mon profil/i })).toBeInTheDocument();
  });

  it("conserve l'état adhésion non renouvelée pour un profil complet", async () => {
    mockHomeFetch({
      profile: createProfile({ adhesion_2026_2027: 0 }),
      birthdays: [],
      ideas: [],
      video: null,
      outingIsActive: 0,
      nextEvent: null,
    });
    renderHome();

    expect(await screen.findByText("Non adhérent en 2026-2027")).toBeInTheDocument();
    expect(screen.getByText("À déclarer après votre adhésion")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Adhésion.*Adhérer maintenant/i })).toBeInTheDocument();
    expect(screen.getByText("2 étapes sur 4 en ordre.")).toBeInTheDocument();
  });

  it("garde le profil complet sans avatar dans les six sections obligatoires", async () => {
    mockHomeFetch({
      profile: createProfile({ avatar: null, adhesion_2026_2027: 0 }),
      birthdays: [],
      ideas: [],
      video: null,
      outingIsActive: 0,
      nextEvent: null,
    });
    renderHome();

    expect(await screen.findByText("6 sections sur 6")).toBeInTheDocument();
    const profileLink = screen.getByRole("link", { name: /Profil.*Modifier mon profil/i });
    expect(profileLink).toHaveAttribute("href", "/musician/profile");
  });

  it("affiche l'état urgent des présences et son action immédiate", async () => {
    mockHomeFetch({
      planningUrgent: true,
      pendingCount: 2,
      urgentEvent: { title: "Brocante de Sucy", date: "2026-09-20" },
    });
    renderHome();

    expect(await screen.findByText("En attente : Brocante de Sucy")).toBeInTheDocument();
    expect(screen.getByText("À répondre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Répondre maintenant" })).toBeInTheDocument();
  });

  it("ne mélange jamais un profil terminé avec un décompte de sections incomplet", () => {
    const profileStep = buildProfileJourney(createProfile({ avatar: null }), false, null, 0).find(
      (step) => step.key === "profile"
    );

    expect(profileStep).toMatchObject({
      status: "done",
      detail: "6 sections sur 6",
    });
  });

  it("affiche le parcours complet et les modules dont les données existent", async () => {
    mockHomeFetch({
      profile: createProfile({
        insurance_complete: true,
        insuranceInstruments: [
          {
            id: 1,
            user_id: 2,
            instrument_name: "Trompette",
            brand: "Yamaha",
            model: "Xeno",
            serial_number: "12345",
            created_at: "2026-01-01 12:00:00",
            updated_at: "2026-01-01 12:00:00",
          },
        ],
      }),
    });
    renderHome();

    expect(
      await screen.findByText(
        "Tout est en ordre : profil, adhésion, assurance et prestations à jour."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Adhérent 2026-2027")).toBeInTheDocument();
    expect(screen.getByText("1 instrument assuré")).toBeInTheDocument();
    expect(screen.getByText("Toutes vos réponses sont à jour")).toBeInTheDocument();

    expect(screen.getByText("Prochaines prestations")).toBeInTheDocument();
    expect(screen.getByText("Une idée publique")).toBeInTheDocument();
    expect(await screen.findByText("Alice Martin")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Regarder la vidéo : Le concert de printemps" })
    ).toBeInTheDocument();
    expect(screen.getByText("Sortie annuelle")).toBeInTheDocument();
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(7);
  });

  it("sépare le compteur des idées non lues de la liste des idées récentes", async () => {
    mockHomeFetch();
    renderHome();

    expect(await screen.findByText("Une idée publique")).toBeInTheDocument();
    expect(screen.queryByText("42")).not.toBeInTheDocument();
  });
});
