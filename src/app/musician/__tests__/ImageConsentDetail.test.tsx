import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ImageConsentSection } from "../ImageConsentSection";
import { MusicianProfileClient } from "../MusicianProfile";
import type { ImageConsentDetail } from "../musician-types";
import { GUARDIAN_SELF, LEA, SELF, withSession } from "./session-fixtures";

const RULE = "Il suffit qu'un parent accepte ; si un parent refuse, la photo n'est pas utilisée.";

function detail(overrides: Partial<ImageConsentDetail> = {}): ImageConsentDetail {
  return {
    linked: true,
    effective: null,
    mine: null,
    guardians: [
      { name: "Nathalie", relation: "mère", consent: null, isYou: true },
      { name: "Marc", relation: "père", consent: 1, isYou: false },
      { name: "Sophie", relation: null, consent: 0, isYou: false },
      { name: "Paul", relation: "oncle", consent: null, isYou: false },
    ],
    ...overrides,
  };
}

describe("Droit à l'image par responsable", () => {
  it("en délégation : « Votre réponse », boutons actifs et texte à la troisième personne", async () => {
    const user = userEvent.setup();
    const onProfileChange = vi.fn();
    render(
      <ImageConsentSection
        profile={{ image_consent: undefined }}
        onProfileChange={onProfileChange}
        detail={detail()}
        actingForName="Léa"
      />
    );

    expect(screen.getByText("Votre réponse")).toBeInTheDocument();
    const allow = screen.getByRole("radio", { name: "J'autorise l'utilisation de l'image de Léa" });
    expect(allow).toBeEnabled();
    expect(
      screen.getByRole("radio", { name: "Je n'autorise pas l'utilisation de l'image de Léa" })
    ).toBeEnabled();
    await user.click(allow);
    expect(onProfileChange).toHaveBeenCalledWith({ image_consent: 1 });
  });

  it("rappelle d'enregistrer quand la réponse choisie n'est pas encore enregistrée", () => {
    const { rerender } = render(
      <ImageConsentSection
        profile={{ image_consent: 1 }}
        onProfileChange={vi.fn()}
        detail={detail({ effective: 1, mine: 1 })}
        actingForName="Léa"
      />
    );
    expect(screen.queryByText(/prise en compte après l'enregistrement/)).not.toBeInTheDocument();

    rerender(
      <ImageConsentSection
        profile={{ image_consent: 0 }}
        onProfileChange={vi.fn()}
        detail={detail({ effective: 1, mine: 1 })}
        actingForName="Léa"
      />
    );
    expect(
      screen.getByText("Votre nouvelle réponse sera prise en compte après l'enregistrement.")
    ).toBeInTheDocument();
  });

  it("liste les autres parents avec Oui / Non / Pas encore répondu, sans doublonner « vous »", () => {
    render(
      <ImageConsentSection
        profile={{ image_consent: undefined }}
        onProfileChange={vi.fn()}
        detail={detail()}
        actingForName="Léa"
      />
    );

    const list = screen.getByRole("list", { name: "Réponses des autres parents" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Marc (père)");
    expect(rows[0]).toHaveTextContent("Oui");
    expect(rows[1]).toHaveTextContent("Sophie");
    expect(rows[1]).not.toHaveTextContent("(");
    expect(rows[1]).toHaveTextContent("Non");
    expect(rows[2]).toHaveTextContent("Paul (oncle)");
    expect(rows[2]).toHaveTextContent("Pas encore répondu");
    expect(within(list).queryByText(/Nathalie/)).not.toBeInTheDocument();
  });

  it.each([
    [1, "Droit à l'image accordé pour Léa."],
    [0, "Droit à l'image refusé : la photo de Léa n'est pas utilisée."],
    [null, "Aucune réponse pour le moment pour Léa."],
  ] as const)(
    "en délégation : situation effective %s expliquée avec la règle",
    (effective, text) => {
      render(
        <ImageConsentSection
          profile={{ image_consent: 1 }}
          onProfileChange={vi.fn()}
          detail={detail({ effective })}
          actingForName="Léa"
        />
      );
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent(text);
      expect(status).toHaveTextContent(RULE);
    }
  );

  it("ado relié : lecture seule, situation et réponses de tous les parents", () => {
    render(
      <ImageConsentSection
        profile={{ image_consent: 1 }}
        onProfileChange={vi.fn()}
        locked
        detail={detail({
          effective: 0,
          guardians: [
            { name: "Marc", relation: "père", consent: 1, isYou: false },
            { name: "Sophie", relation: "mère", consent: 0, isYou: false },
          ],
        })}
      />
    );

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Ce choix revient à vos parents (ou responsables légaux)"
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Droit à l'image refusé : votre photo n'est pas utilisée."
    );
    expect(screen.getByRole("status")).toHaveTextContent(RULE);
    expect(
      within(screen.getByRole("list", { name: "Réponses de vos parents" })).getAllByRole("listitem")
    ).toHaveLength(2);
    expect(screen.getByText("Réponses de vos parents")).toBeInTheDocument();
  });

  it("adulte non relié : formulaire inchangé", () => {
    render(
      <ImageConsentSection
        profile={{ image_consent: 1 }}
        onProfileChange={vi.fn()}
        detail={{ linked: false, effective: 1, mine: null, guardians: [] }}
      />
    );
    expect(
      screen.getByRole("radio", { name: "J'autorise l'utilisation de mon image" })
    ).toBeChecked();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Votre réponse")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /parents/ })).not.toBeInTheDocument();
  });
});

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
}

function validProfile(consent: ImageConsentDetail, imageConsent: number | null) {
  return {
    user_id: 21,
    first_name: "Léa",
    last_name: "Martin",
    date_of_birth: "2012-05-10",
    phone: "06 12 34 56 78",
    address_line1: "1 rue de l'Harmonie",
    postal_code: "94370",
    city: "Sucy-en-Brie",
    harmonie_start_date: "2022-09-01",
    is_conservatory_student: 0,
    emergency_contact_first_name: "Nathalie",
    emergency_contact_last_name: "Martin",
    emergency_contact_phone: "06 11 11 11 11",
    image_consent: imageConsent,
    email: null,
    harmonieInstruments: ["Trompette"],
    primaryHarmonieInstrument: "Trompette",
    instruments: [],
    imageConsentLocked: false,
    imageConsentDetail: consent,
  };
}

describe("MusicianProfile : réponse du responsable au droit à l'image", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockProfile(consent: ImageConsentDetail, imageConsent: number | null) {
    vi.mocked(fetch).mockImplementation(async (_input, init) =>
      init?.method === "PUT"
        ? jsonResponse({ success: true })
        : jsonResponse(validProfile(consent, imageConsent))
    );
  }

  const delegatedSession = {
    profiles: [GUARDIAN_SELF, LEA],
    userId: LEA.userId,
    delegated: true,
    actor: GUARDIAN_SELF,
  };

  function putBody() {
    const call = vi.mocked(fetch).mock.calls.find(([, init]) => init?.method === "PUT");
    return JSON.parse(String(call?.[1]?.body)) as Record<string, unknown>;
  }

  it("les boutons reflètent la réponse du responsable, pas la valeur effective", async () => {
    mockProfile(detail({ effective: 1, mine: null }), 1);
    render(withSession(delegatedSession, <MusicianProfileClient userId={LEA.userId} />));

    const allow = await screen.findByRole("radio", {
      name: "J'autorise l'utilisation de l'image de Léa",
    });
    expect(allow).not.toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Je n'autorise pas l'utilisation de l'image de Léa" })
    ).not.toBeChecked();
  });

  it("enregistrer sans avoir répondu n'écrit rien (image_consent null)", async () => {
    const user = userEvent.setup();
    mockProfile(detail({ effective: 1, mine: null }), 1);
    render(withSession(delegatedSession, <MusicianProfileClient userId={LEA.userId} />));

    await screen.findByText("Votre réponse");
    await user.click(screen.getAllByRole("button", { name: /Enregistrer/ })[0]);

    await waitFor(() => expect(putBody()).toBeDefined());
    expect(putBody().image_consent).toBeNull();
    expect(putBody()).not.toHaveProperty("imageConsentDetail");
  });

  it("enregistre la réponse choisie par le responsable", async () => {
    const user = userEvent.setup();
    mockProfile(detail({ effective: 1, mine: null }), 1);
    render(withSession(delegatedSession, <MusicianProfileClient userId={LEA.userId} />));

    await user.click(
      await screen.findByRole("radio", {
        name: "Je n'autorise pas l'utilisation de l'image de Léa",
      })
    );
    await user.click(screen.getAllByRole("button", { name: /Enregistrer/ })[0]);

    await waitFor(() => expect(putBody().image_consent).toBe(0));
  });

  it("adulte non relié : la valeur du profil est envoyée comme avant", async () => {
    const user = userEvent.setup();
    mockProfile({ linked: false, effective: 1, mine: null, guardians: [] }, 1);
    render(withSession({ profiles: [SELF] }, <MusicianProfileClient userId={SELF.userId} />));

    await screen.findByRole("radio", { name: "J'autorise l'utilisation de mon image" });
    await user.click(screen.getAllByRole("button", { name: /Enregistrer/ })[0]);

    await waitFor(() => expect(putBody().image_consent).toBe(1));
  });
});
