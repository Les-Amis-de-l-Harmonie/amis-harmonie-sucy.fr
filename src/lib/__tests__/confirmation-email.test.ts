// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import mjml2html from "mjml";
import { describe, expect, it } from "vitest";
import { buildConfirmationEmail } from "@/lib/free-events/emails";
import { CONFIRMATION_HTML } from "@/lib/free-events/emails/confirmation.html";
import { RENCONTRE_HARMONIES_2026 } from "@/lib/free-events/rencontre-harmonies-2026";

const MJML_PATH = fileURLToPath(
  new URL("../free-events/emails/confirmation.mjml", import.meta.url)
);

/** Texte visible : sans balises (les balises en ligne ne laissent pas d'espace), entités courantes décodées, espaces normalisés. */
function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>|<\/(?:p|div|td|tr|h1|table|a)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&#39;", "'")
    .replaceAll("&#160;", " ")
    .replaceAll("&nbsp;", " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("e-mail de confirmation (MJML)", () => {
  it("le HTML généré est synchronisé avec confirmation.mjml (npm run emails:build)", async () => {
    const { html, errors } = await mjml2html(readFileSync(MJML_PATH, "utf8"), {
      validationLevel: "strict",
    });
    expect(errors).toEqual([]);
    expect(html).toBe(CONFIRMATION_HTML);
  });

  it("contient les phrases validées, le prénom échappé et le nombre de personnes", () => {
    const { html } = buildConfirmationEmail(RENCONTRE_HARMONIES_2026, {
      firstName: "<script>alert(1)</script>",
      partySize: 4,
    });
    const text = visibleText(html);

    expect(html).toContain("Bonjour &lt;script&gt;alert(1)&lt;/script&gt;,");
    expect(html).not.toContain("<script");
    expect(text).toContain("Votre réservation pour 4 personne(s) est bien enregistrée.");
    expect(text).toContain(
      "Samedi 14 novembre 2026, ouverture des portes à 14h30, concert à 15h, à l'Espace Jean-Marie Poirier, 1 esplanade du 18 Juin 1940, Sucy-en-Brie. Pour vous garer : parking des Fontaines (gratuit) ou parking Montaleau (gratuit : à l'accueil, échangez votre ticket contre une contremarque de parking)."
    );
    expect(text).toContain(
      "À l'entrée, donnez simplement votre nom. Un empêchement ? Répondez à ce mail pour libérer vos places."
    );
    expect(text).toContain("À samedi 14 novembre !");
    expect(text).toContain("Les Amis de l'Harmonie de Sucy-en-Brie");
    expect(html).toContain('lang="fr"');
    expect(html).toContain("https://amis-harmonie-sucy.fr/rencontre-harmonies-2026");
  });

  it("utilise « Bonjour, » sans prénom et ne laisse aucun marqueur", () => {
    const { html } = buildConfirmationEmail(RENCONTRE_HARMONIES_2026, {
      firstName: null,
      partySize: 2,
    });
    expect(visibleText(html)).toContain("Bonjour, Votre réservation pour 2 personne(s)");
    expect(html).not.toContain("{{");
    expect(html).not.toContain("}}");
  });

  it("ne contient aucun mot interdit", () => {
    const { html, subject, text } = buildConfirmationEmail(RENCONTRE_HARMONIES_2026, {
      firstName: "Camille",
      partySize: 2,
    });
    const content = `${subject} ${text} ${html}`.toLowerCase();
    for (const word of ["chapeau", "quête", "obligatoire"]) {
      expect(content).not.toContain(word);
    }
    expect(content).not.toMatch(/\bdons?\b/);
  });

  it("garde l'objet et la version texte inchangés", () => {
    const { subject, text } = buildConfirmationEmail(RENCONTRE_HARMONIES_2026, {
      firstName: "Maxime",
      partySize: 2,
    });
    expect(subject).toBe("Votre réservation pour la Rencontre d'Harmonies du samedi 14 novembre");
    expect(text.split("\n")[0]).toBe("Bonjour Maxime,");
    expect(text).toContain("Votre réservation pour 2 personne(s) est bien enregistrée.");
  });
});
