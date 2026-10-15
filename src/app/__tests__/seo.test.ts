import { describe, expect, it } from "vitest";
import { DEFAULT_DESCRIPTION, DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, getPageSeo } from "@/app/seo";

describe("getPageSeo", () => {
  it("retourne le titre de Sucy Dansant 2027 avec le nom du site", () => {
    expect(getPageSeo("/sucy-dansant-2027").title).toBe(
      `Sucy Dansant 2027 : le thé dansant concert | ${SITE_NAME}`
    );
  });

  it("retourne le titre du Thé Dansant 2026 avec le nom du site", () => {
    expect(getPageSeo("/the-dansant-2026").title).toBe(`Thé Dansant 2026 | ${SITE_NAME}`);
  });

  it("normalise les chemins avec une barre oblique finale", () => {
    expect(getPageSeo("/sucy-dansant-2027/")).toEqual(getPageSeo("/sucy-dansant-2027"));
  });

  it("retourne l'image Open Graph absolue propre à Sucy Dansant 2027", () => {
    expect(getPageSeo("/sucy-dansant-2027").ogImage).toBe(
      `${SITE_URL}/images/sucy-dansant-2027/og.jpg`
    );
  });

  it("utilise le logo par défaut pour une page sans image Open Graph dédiée", () => {
    const seo = getPageSeo("/about");

    expect(seo.ogImage).toBe(DEFAULT_OG_IMAGE);
    expect(seo.hasCustomOgImage).toBe(false);
  });

  it("traite l'ancien chemin comme une page inconnue", () => {
    expect(getPageSeo("/the-dansant")).toEqual({
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
      ogImage: DEFAULT_OG_IMAGE,
      hasCustomOgImage: false,
    });
  });
});
