import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageConsentSection } from "../ImageConsentSection";
import { PersonalInfoSection } from "../PersonalInfoSection";
import { validateProfile } from "../profile-validation";

describe("Droit à l'image verrouillé", () => {
  it("reste modifiable par défaut", () => {
    render(<ImageConsentSection profile={{ image_consent: 1 }} onProfileChange={vi.fn()} />);
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeEnabled();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("passe en lecture seule avec la raison quand il est verrouillé", () => {
    render(<ImageConsentSection profile={{ image_consent: 1 }} onProfileChange={vi.fn()} locked />);

    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    expect(screen.getByRole("radio", { name: /J'autorise/ })).toBeChecked();
    expect(screen.getByRole("note")).toHaveTextContent(
      "Ce choix revient à vos parents (ou responsables légaux)"
    );
  });

  it("signale l'absence de réponse quand rien n'est enregistré", () => {
    render(
      <ImageConsentSection
        profile={{ image_consent: undefined }}
        onProfileChange={vi.fn()}
        locked
      />
    );
    expect(screen.getByRole("note")).toHaveTextContent(
      "Aucune réponse n'a encore été enregistrée."
    );
  });

  it("n'exige pas de réponse au droit à l'image quand il est verrouillé", () => {
    const unanswered = { image_consent: undefined };
    expect(validateProfile(unanswered, {}).some((error) => error.field === "image_consent")).toBe(
      true
    );
    expect(
      validateProfile(unanswered, {}, { imageConsentLocked: true }).some(
        (error) => error.field === "image_consent"
      )
    ).toBe(false);
  });
});

describe("Profil d'un musicien géré", () => {
  const noop = vi.fn();

  it("n'affiche aucun champ e-mail quand l'adresse est null", () => {
    render(
      <PersonalInfoSection
        profile={{ first_name: "Léa", email: null }}
        fieldErrors={{}}
        onFieldChange={noop}
        onProfileChange={noop}
      />
    );
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByText(/L'email ne peut pas être modifié/)).not.toBeInTheDocument();
  });

  it("affiche l'e-mail en lecture seule quand il existe", () => {
    render(
      <PersonalInfoSection
        profile={{ first_name: "Claire", email: "claire@example.com" }}
        fieldErrors={{}}
        onFieldChange={noop}
        onProfileChange={noop}
      />
    );
    expect(screen.getByLabelText("Email")).toBeDisabled();
  });
});
