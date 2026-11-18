// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import mjml2html from "mjml";
import { describe, expect, it } from "vitest";
import type { ReminderDigestModel, ReminderEmailModel, ReminderEventLine } from "../email-model";
import { PRESENCE_DIGEST_HTML } from "../emails/presence-digest-html";
import { PRESENCE_REMINDER_HTML } from "../emails/presence-reminder-html";
import { renderDigestHtml, renderReminderHtml } from "../emails/render-reminder-email";

const EMAILS_DIR = new URL("../emails/", import.meta.url);

/** Texte visible : sans styles ni balises, entités courantes décodées, espaces normalisés. */
function visibleText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>|<\/(?:p|div|td|tr|h1|table|a)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replaceAll("&#160;", " ")
    .replaceAll("&nbsp;", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function line(overrides: Partial<ReminderEventLine> = {}): ReminderEventLine {
  return {
    eventId: 1,
    title: "Concert de Noël",
    dateLabel: "samedi 19 décembre 2026",
    timeLabel: "20:30",
    location: "Espace Jean-Marie Poirier",
    deadlineLabel: "20 novembre 2026",
    deadlineSoon: false,
    ...overrides,
  };
}

function reminder(overrides: Partial<ReminderEmailModel> = {}): ReminderEmailModel {
  return {
    preheader: "Aucune réponse pour Jules : 1 date à confirmer.",
    greeting: "Bonjour Aurélie,",
    intro: "Nous n'avons pas encore reçu de réponse de présence pour Jules.",
    sections: [
      {
        label: "Pour Jules",
        isRecipient: false,
        due: [line()],
        others: [
          line({
            eventId: 2,
            title: "Thé dansant",
            dateLabel: "dimanche 7 février 2027",
            timeLabel: null,
            location: null,
            deadlineLabel: "20 janvier 2027",
          }),
        ],
      },
    ],
    ctaUrl: "https://amis-harmonie-sucy.fr/musician/disponibilites",
    ctaLabel: "Répondre dans l'espace musicien",
    reason: "Vous recevez ce rappel car aucune réponse n'a été donnée.",
    ...overrides,
  };
}

function digest(overrides: Partial<ReminderDigestModel> = {}): ReminderDigestModel {
  return {
    preheader: "2 rappels partiraient aujourd'hui.",
    intro: "2 rappels partiraient aujourd'hui si les rappels étaient activés.",
    entries: [
      {
        recipientEmail: "aurelie@example.com",
        recipientName: "Aurélie Martin",
        subject: "Rappel : réponse attendue pour Jules",
        text: "Bonjour Aurélie,\nMerci de répondre.",
      },
      {
        recipientEmail: "claire@example.com",
        recipientName: null,
        subject: "Rappel : votre réponse",
        text: "Bonjour,",
      },
    ],
    adminUrl: "https://amis-harmonie-sucy.fr/admin/emails",
    ...overrides,
  };
}

describe("modèles MJML des rappels de présence", () => {
  it.each([
    ["presence-reminder.mjml", PRESENCE_REMINDER_HTML],
    ["presence-digest.mjml", PRESENCE_DIGEST_HTML],
  ])("le HTML généré est synchronisé avec %s (npm run emails:build)", async (file, compiled) => {
    const source = readFileSync(fileURLToPath(new URL(file, EMAILS_DIR)), "utf8");
    const { html, errors } = await mjml2html(source, { validationLevel: "strict" });
    expect(errors).toEqual([]);
    expect(html).toBe(compiled);
  });

  it("n'utilise que des emplacements connus, une seule fois chacun", () => {
    const placeholders = (html: string) => [...html.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
    expect(placeholders(PRESENCE_REMINDER_HTML).sort()).toEqual(
      ["preheader", "greeting", "intro", "sections", "ctaUrl", "ctaLabel", "reason"].sort()
    );
    expect(placeholders(PRESENCE_DIGEST_HTML).sort()).toEqual(
      ["preheader", "intro", "entries", "adminUrl"].sort()
    );
  });
});

describe("renderReminderHtml", () => {
  it("affiche l'accueil, le préheader, le bouton et la raison", () => {
    const html = renderReminderHtml(reminder());
    const text = visibleText(html);

    expect(html).toContain("Aucune réponse pour Jules : 1 date à confirmer.");
    expect(text).toContain("Bonjour Aurélie,");
    expect(text).toContain("Nous n'avons pas encore reçu de réponse de présence pour Jules.");
    expect(text).toContain("Répondre dans l'espace musicien");
    expect(html).toContain('href="https://amis-harmonie-sucy.fr/musician/disponibilites"');
    expect(text).toContain("Vous recevez ce rappel car aucune réponse n'a été donnée.");
    expect(text).toContain("Les Amis de l'Harmonie de Sucy-en-Brie");
    expect(html).toContain("https://amis-harmonie-sucy.fr/images/emails/site/logo.png");
  });

  it("ne laisse aucun emplacement vide", () => {
    expect(renderReminderHtml(reminder())).not.toMatch(/\{\{\w+\}\}/);
    expect(renderDigestHtml(digest())).not.toMatch(/\{\{\w+\}\}/);
  });

  it("montre pour chaque personne les dates à confirmer, avec heure, lieu et date limite", () => {
    const text = visibleText(renderReminderHtml(reminder()));

    expect(text).toContain("Pour Jules");
    expect(text).toContain("Concert de Noël");
    expect(text).toContain("samedi 19 décembre 2026 à 20:30 · Espace Jean-Marie Poirier");
    expect(text).toContain("Réponse attendue avant le 20 novembre 2026");
  });

  it("liste ensuite les autres dates sans réponse, plus discrètement", () => {
    const html = renderReminderHtml(reminder());
    const text = visibleText(html);

    expect(text).toContain("Autres dates sans réponse");
    expect(text).toContain("Thé dansant · dimanche 7 février 2027");
    // Le lieu figure aussi dans les autres dates quand il est connu.
    const withPlace = visibleText(
      renderReminderHtml(
        reminder({
          sections: [
            {
              label: "Pour vous",
              isRecipient: true,
              due: [line()],
              others: [line({ title: "Répétition", location: "Salle de répétition" })],
            },
          ],
        })
      )
    );
    expect(withPlace).toContain(
      "Répétition · samedi 19 décembre 2026 à 20:30 · Salle de répétition"
    );
    expect(text).toContain("Réponse avant le 20 janvier 2027");
    // Les dates à confirmer passent avant les autres.
    expect(text.indexOf("Concert de Noël")).toBeLessThan(text.indexOf("Autres dates sans réponse"));
    expect(text.indexOf("Autres dates sans réponse")).toBeLessThan(text.indexOf("Thé dansant"));
  });

  it("n'affiche pas le bloc « autres dates » quand il n'y en a pas, ni l'heure ou le lieu absents", () => {
    const html = renderReminderHtml(
      reminder({
        sections: [
          {
            label: "Pour vous",
            isRecipient: true,
            due: [line({ timeLabel: null, location: null })],
            others: [],
          },
        ],
      })
    );
    const text = visibleText(html);

    expect(text).not.toContain("Autres dates sans réponse");
    expect(text).toContain("samedi 19 décembre 2026 Réponse attendue");
    expect(text).not.toContain(" à null");
    expect(text).not.toContain("null");
  });

  it("rend une carte par personne, dans l'ordre donné", () => {
    const text = visibleText(
      renderReminderHtml(
        reminder({
          sections: [
            { label: "Pour vous", isRecipient: true, due: [line()], others: [] },
            {
              label: "Pour Jules",
              isRecipient: false,
              due: [line({ title: "Répétition" })],
              others: [],
            },
            {
              label: "Pour Émilie",
              isRecipient: false,
              due: [line({ title: "Concert" })],
              others: [],
            },
          ],
        })
      )
    );

    const positions = ["Pour vous", "Pour Jules", "Pour Émilie"].map((label) =>
      text.indexOf(label)
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("souligne une date limite proche (pastille ambre, en gras) et pas les autres", () => {
    const soon = renderReminderHtml(
      reminder({
        sections: [
          {
            label: "Pour vous",
            isRecipient: true,
            due: [line({ deadlineSoon: true, deadlineLabel: "20 novembre 2026" })],
            others: [],
          },
        ],
      })
    );
    const calm = renderReminderHtml(reminder());

    expect(soon).toMatch(
      /border-radius:999px[^"]*font-weight:700[^>]*>Réponse attendue avant le 20 novembre 2026/
    );
    expect(soon).toContain("#e0a24a");
    expect(calm).not.toContain("border-radius:999px");
  });

  it("échappe toutes les valeurs dynamiques", () => {
    const evil = `<script>alert(1)</script> "x" & 'y'`;
    const html = renderReminderHtml(
      reminder({
        preheader: evil,
        greeting: evil,
        intro: evil,
        ctaLabel: evil,
        reason: evil,
        sections: [
          {
            label: evil,
            isRecipient: false,
            due: [
              line({
                title: evil,
                dateLabel: evil,
                timeLabel: evil,
                location: evil,
                deadlineLabel: evil,
              }),
            ],
            others: [line({ title: evil, dateLabel: evil, timeLabel: evil, deadlineLabel: evil })],
          },
        ],
      })
    );

    expect(html).not.toContain("<script");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("&quot;x&quot; &amp; &#39;y&#39;");
  });

  it("n'accepte pour le bouton qu'un lien http(s), et échappe l'adresse", () => {
    expect(renderReminderHtml(reminder({ ctaUrl: "javascript:alert(1)" }))).toContain('href="#"');
    const quoted = renderReminderHtml(
      reminder({ ctaUrl: 'https://amis-harmonie-sucy.fr/?a="b"&c=<d>' })
    );
    expect(quoted).toContain("https://amis-harmonie-sucy.fr/?a=&quot;b&quot;&amp;c=&lt;d&gt;");
    expect(quoted).not.toContain('"b"');
  });

  it("n'interprète pas un emplacement écrit dans une valeur (un seul passage)", () => {
    const html = renderReminderHtml(
      reminder({
        intro: "Texte {{reason}} {{sections}}",
        reason: "RAISON-UNIQUE",
        sections: [
          {
            label: "Pour vous",
            isRecipient: true,
            due: [line({ title: "Titre {{reason}}" })],
            others: [],
          },
        ],
      })
    );

    expect(html).toContain("Texte {{reason}} {{sections}}");
    expect(html).toContain("Titre {{reason}}");
    expect(html.match(/RAISON-UNIQUE/g)).toHaveLength(1);
  });

  it("garde le rendu clair en mobile : une colonne de 600 px au plus, couleurs claires", () => {
    const html = renderReminderHtml(reminder());
    expect(html).toContain('name="color-scheme" content="light"');
    expect(html).toContain("max-width:600px");
    expect(html).toContain('lang="fr"');
  });
});

describe("renderDigestHtml", () => {
  it("affiche l'introduction, chaque e-mail et le lien vers la page admin", () => {
    const html = renderDigestHtml(digest());
    const text = visibleText(html);

    expect(text).toContain("Essai : aucun musicien ni parent n'a reçu ces messages.");
    expect(text).toContain("2 rappels partiraient aujourd'hui si les rappels étaient activés.");
    expect(text).toContain("Aurélie Martin <aurelie@example.com>");
    expect(text).toContain("Rappel : réponse attendue pour Jules");
    expect(text).toContain("Bonjour Aurélie, Merci de répondre.");
    expect(text).toContain("claire@example.com");
    expect(html).toContain('href="https://amis-harmonie-sucy.fr/admin/emails"');
  });

  it("garde les retours à la ligne du texte et échappe tout", () => {
    const html = renderDigestHtml(
      digest({
        entries: [
          {
            recipientEmail: "x@example.com",
            recipientName: "<b>Nom</b>",
            subject: "<i>Objet</i>",
            text: "Ligne 1\n<script>alert(1)</script>",
          },
        ],
      })
    );

    expect(html).toContain("white-space:pre-wrap");
    expect(html).toContain("Ligne 1\n&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<b>Nom</b>");
    expect(html).not.toContain("<i>Objet</i>");
  });

  it("dit quand il n'y a rien à envoyer", () => {
    const text = visibleText(renderDigestHtml(digest({ entries: [] })));
    expect(text).toContain("Aucun rappel à envoyer aujourd'hui.");
  });
});
