import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsAdminClient } from "../NotificationsAdmin";
import type {
  NotificationLogItem,
  NotificationSettingsView,
  NotificationsPreview,
} from "../notifications-client";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface Call {
  url: string;
  method: string;
  body: Record<string, unknown> | undefined;
}

interface MockOptions {
  settings?: Partial<NotificationSettingsView>;
  canEdit?: boolean;
  log?: NotificationLogItem[];
  preview?: NotificationsPreview;
  putResponse?: (call: Call) => Response;
  sendTestResponse?: Response;
  loadFails?: boolean;
}

function baseSettings(overrides: Partial<NotificationSettingsView> = {}): NotificationSettingsView {
  return {
    presenceRemindersMode: "off",
    testRecipient: null,
    lastRunAt: null,
    lastRunSummary: null,
    updatedAt: "2026-11-18 10:00:00",
    ...overrides,
  };
}

function mockApi(options: MockOptions = {}) {
  const calls: Call[] = [];
  let settings = baseSettings(options.settings);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: Parameters<typeof fetch>[1]) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      const call: Call = {
        url,
        method,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);
      if (method === "GET" && url === "/api/admin/notifications") {
        if (options.loadFails) return json({ error: "Erreur serveur" }, 500);
        return json({ settings, canEdit: options.canEdit ?? true, log: options.log ?? [] });
      }
      if (method === "GET" && url.endsWith("action=preview")) {
        return json(options.preview ?? { today: "2026-11-18", items: [], capped: false });
      }
      if (method === "PUT") {
        if (options.putResponse) return options.putResponse(call);
        settings = {
          ...settings,
          presenceRemindersMode: call.body
            ?.presenceRemindersMode as NotificationSettingsView["presenceRemindersMode"],
          testRecipient: (call.body?.testRecipient as string | null) ?? null,
        };
        return json({ success: true, settings });
      }
      if (method === "POST" && url.endsWith("action=send-test")) {
        return (
          options.sendTestResponse ??
          json({ success: true, sentTo: settings.testRecipient, itemCount: 3 })
        );
      }
      return json({});
    })
  );
  return calls;
}

const writes = (calls: Call[]) => calls.filter((call) => call.method !== "GET");

async function renderPage() {
  render(<NotificationsAdminClient />);
  await screen.findByTestId("state-banner");
}

const previewFixture: NotificationsPreview = {
  today: "2026-11-18",
  capped: false,
  items: [
    {
      recipientEmail: "nathalie@example.com",
      recipientName: "Nathalie Leroy",
      eventTitle: "Concert de Noël",
      eventDate: "2026-12-20",
      stage: 7,
      stages: [7],
      subjectNames: ["Hugo", "Noé"],
      subject: "Rappel : réponse attendue pour Hugo et Noé – « Concert de Noël »",
      text: "Bonjour Nathalie,\nAucune réponse n'a été donnée.",
      alreadySent: false,
    },
    {
      recipientEmail: "lucas@example.com",
      recipientName: null,
      eventTitle: "Répétition générale",
      eventDate: "2026-12-12",
      stage: 2,
      stages: [7, 2],
      subjectNames: ["Lucas"],
      subject: "Rappel : votre réponse pour « Répétition générale »",
      text: "Bonjour,\nMerci de répondre.",
      alreadySent: true,
    },
  ],
};

describe("NotificationsAdminClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("état affiché", () => {
    it("Désactivé : le dit sans ambiguïté, avec les 3 choix et la mention des autres e-mails", async () => {
      mockApi();
      await renderPage();

      const banner = screen.getByTestId("state-banner");
      expect(banner).toHaveAttribute("data-mode", "off");
      expect(banner).toHaveTextContent("Désactivé : aucun e-mail n'est envoyé");
      expect(screen.getByRole("radio", { name: /Désactivé/ })).toBeChecked();
      expect(screen.getByRole("radio", { name: /Essai/ })).not.toBeChecked();
      expect(screen.getByRole("radio", { name: /Activé/ })).not.toBeChecked();
      expect(
        screen.getByText(/Le lien de connexion et les e-mails de réservation ne sont pas concernés/)
      ).toBeInTheDocument();
    });

    it("Essai : annonce le récapitulatif unique et l'adresse, sans message aux musiciens", async () => {
      mockApi({ settings: { presenceRemindersMode: "test", testRecipient: "essai@example.com" } });
      await renderPage();

      const banner = screen.getByTestId("state-banner");
      expect(banner).toHaveAttribute("data-mode", "test");
      expect(banner).toHaveTextContent("un seul e-mail récapitulatif part vers essai@example.com");
      expect(banner).toHaveTextContent("Aucun musicien et aucun parent ne reçoit de message");
      expect(screen.getByLabelText("Adresse d'essai")).toHaveValue("essai@example.com");
    });

    it("Essai sans adresse valide : se présente comme désactivé", async () => {
      mockApi({ settings: { presenceRemindersMode: "test", testRecipient: null } });
      await renderPage();

      expect(screen.getByTestId("state-banner")).toHaveTextContent(
        "Essai sans adresse valide : aucun e-mail n'est envoyé"
      );
    });

    it("Activé : le dit aussi clairement", async () => {
      mockApi({ settings: { presenceRemindersMode: "on" } });
      await renderPage();

      const banner = screen.getByTestId("state-banner");
      expect(banner).toHaveAttribute("data-mode", "on");
      expect(banner).toHaveTextContent("Activé : les rappels partent vraiment");
      expect(screen.getByRole("radio", { name: /Activé/ })).toBeChecked();
    });

    it("explique chaque mode en une phrase simple", async () => {
      mockApi();
      await renderPage();

      expect(
        screen.getByText(/Un seul e-mail récapitulatif, envoyé à l'adresse d'essai/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Rien aux musiciens ni aux parents/)).toBeInTheDocument();
      expect(screen.getByText(/Aucun e-mail\. C'est le réglage par défaut/)).toBeInTheDocument();
    });
  });

  describe("dernière exécution", () => {
    it("affiche la date et le résumé", async () => {
      vi.setSystemTime(new Date("2026-11-18T12:00:00Z"));
      mockApi({
        settings: {
          lastRunAt: "2026-11-18 09:00:05",
          lastRunSummary: "Mode désactivé : 0 e-mail envoyé.",
        },
      });
      await renderPage();

      const card = screen.getByTestId("last-run");
      expect(card).toHaveTextContent("18/11/2026 à 10:00");
      expect(card).toHaveTextContent("Mode désactivé : 0 e-mail envoyé.");
      expect(card).not.toHaveTextContent("depuis plus d'un jour et demi");
    });

    it("dit « Jamais exécutée » sans date", async () => {
      mockApi();
      await renderPage();

      expect(screen.getByTestId("last-run")).toHaveTextContent("Jamais exécutée");
    });

    it("alerte quand la tâche n'a pas tourné depuis plus d'un jour et demi", async () => {
      vi.setSystemTime(new Date("2026-11-20T12:00:00Z"));
      mockApi({ settings: { lastRunAt: "2026-11-18 09:00:05", lastRunSummary: "ok" } });
      await renderPage();

      expect(screen.getByTestId("last-run")).toHaveTextContent("depuis plus d'un jour et demi");
    });
  });

  describe("activer demande une confirmation", () => {
    it("ne sauvegarde rien en choisissant Activé, puis exige la confirmation", async () => {
      const user = userEvent.setup();
      const calls = mockApi();
      await renderPage();

      await user.click(screen.getByRole("radio", { name: /Activé/ }));
      // Choisir ne change rien tant qu'on n'enregistre pas.
      expect(screen.getByTestId("state-banner")).toHaveAttribute("data-mode", "off");
      expect(
        screen.getByText(/rien n'a changé tant que vous n'enregistrez pas/)
      ).toBeInTheDocument();
      expect(writes(calls)).toHaveLength(0);

      await user.click(screen.getByRole("button", { name: "Enregistrer" }));
      const dialog = await screen.findByRole("alertdialog");
      expect(within(dialog).getByText("Activer les rappels automatiques ?")).toBeInTheDocument();
      expect(within(dialog).getByText(/vrais e-mails/)).toBeInTheDocument();
      expect(within(dialog).getByText(/musiciens/)).toBeInTheDocument();
      expect(within(dialog).getByText(/parents/)).toBeInTheDocument();
      expect(
        within(dialog).getByText(/7 jours, puis 2 jours avant la date limite/)
      ).toBeInTheDocument();
      expect(within(dialog).getByText(/au plus 30 e-mails/)).toBeInTheDocument();
      expect(writes(calls)).toHaveLength(0);

      await user.click(within(dialog).getByRole("button", { name: "Oui, activer les rappels" }));

      await waitFor(() =>
        expect(screen.getByTestId("state-banner")).toHaveAttribute("data-mode", "on")
      );
      expect(writes(calls)).toEqual([
        {
          url: "/api/admin/notifications",
          method: "PUT",
          body: { presenceRemindersMode: "on", testRecipient: null },
        },
      ]);
      expect(screen.getByText(/Rappels activés/)).toBeInTheDocument();
    });

    it("annuler la confirmation n'envoie rien et laisse le mode désactivé", async () => {
      const user = userEvent.setup();
      const calls = mockApi();
      await renderPage();

      await user.click(screen.getByRole("radio", { name: /Activé/ }));
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));
      const dialog = await screen.findByRole("alertdialog");
      await user.click(within(dialog).getByRole("button", { name: /Annuler/ }));

      await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
      expect(writes(calls)).toHaveLength(0);
      expect(screen.getByTestId("state-banner")).toHaveAttribute("data-mode", "off");
    });

    it("repasser de Activé à Désactivé s'enregistre sans confirmation", async () => {
      const user = userEvent.setup();
      const calls = mockApi({ settings: { presenceRemindersMode: "on" } });
      await renderPage();

      await user.click(screen.getByRole("radio", { name: /Désactivé/ }));
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      await waitFor(() =>
        expect(screen.getByTestId("state-banner")).toHaveAttribute("data-mode", "off")
      );
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(writes(calls)[0].body).toEqual({ presenceRemindersMode: "off", testRecipient: null });
      expect(screen.getByText(/Rappels désactivés/)).toBeInTheDocument();
    });

    it("n'a rien à enregistrer tant que rien n'est modifié", async () => {
      mockApi({ settings: { presenceRemindersMode: "on" } });
      await renderPage();

      // Rien de modifié : rien à enregistrer.
      expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
    });
  });

  describe("mode Essai", () => {
    it("exige une adresse valide avant d'enregistrer, puis l'envoie", async () => {
      const user = userEvent.setup();
      const calls = mockApi();
      await renderPage();

      await user.click(screen.getByRole("radio", { name: /Essai/ }));
      const save = screen.getByRole("button", { name: "Enregistrer" });
      expect(save).toBeDisabled();
      expect(screen.getByText(/Indiquez une adresse e-mail valide/)).toBeInTheDocument();

      await user.type(screen.getByLabelText("Adresse d'essai"), "pas-une-adresse");
      expect(save).toBeDisabled();
      await user.clear(screen.getByLabelText("Adresse d'essai"));
      await user.type(screen.getByLabelText("Adresse d'essai"), "essai@example.com");
      expect(save).toBeEnabled();
      await user.click(save);

      await waitFor(() =>
        expect(screen.getByTestId("state-banner")).toHaveAttribute("data-mode", "test")
      );
      expect(writes(calls)[0].body).toEqual({
        presenceRemindersMode: "test",
        testRecipient: "essai@example.com",
      });
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("permet d'effacer l'adresse d'essai en repassant à Désactivé", async () => {
      const user = userEvent.setup();
      const calls = mockApi({
        settings: { presenceRemindersMode: "test", testRecipient: "essai@example.com" },
      });
      await renderPage();

      await user.click(screen.getByRole("radio", { name: /Désactivé/ }));
      // L'adresse reste visible hors du mode Essai, facultative et effaçable.
      const input = screen.getByLabelText("Adresse d'essai");
      expect(input).toHaveValue("essai@example.com");
      await user.clear(input);
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      await waitFor(() =>
        expect(screen.getByTestId("state-banner")).toHaveAttribute("data-mode", "off")
      );
      expect(writes(calls)[0].body).toEqual({ presenceRemindersMode: "off", testRecipient: null });
      expect(screen.getByLabelText("Adresse d'essai")).toHaveValue("");
    });

    it("refuse d'enregistrer une adresse invalide, même hors du mode Essai", async () => {
      const user = userEvent.setup();
      mockApi();
      await renderPage();

      await user.type(screen.getByLabelText("Adresse d'essai"), "pas-une-adresse");

      expect(screen.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
      expect(screen.getByText("Cette adresse e-mail n'est pas valide.")).toBeInTheDocument();
    });

    it("affiche l'erreur du serveur sans changer l'état", async () => {
      const user = userEvent.setup();
      mockApi({
        putResponse: () => json({ error: "Cette adresse e-mail est réservée." }, 400),
      });
      await renderPage();

      await user.click(screen.getByRole("radio", { name: /Essai/ }));
      await user.type(screen.getByLabelText("Adresse d'essai"), "x@interne.amis-harmonie-sucy.fr");
      await user.click(screen.getByRole("button", { name: "Enregistrer" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Cette adresse e-mail est réservée."
      );
      expect(screen.getByTestId("state-banner")).toHaveAttribute("data-mode", "off");
    });
  });

  describe("envoi de l'essai", () => {
    it("n'existe qu'en mode Essai pour un super-administrateur", async () => {
      mockApi({ settings: { presenceRemindersMode: "off" } });
      await renderPage();
      expect(screen.queryByRole("button", { name: /Envoyer l'essai maintenant/ })).toBeNull();
    });

    it("est caché en mode Activé", async () => {
      mockApi({ settings: { presenceRemindersMode: "on" } });
      await renderPage();
      expect(screen.queryByRole("button", { name: /Envoyer l'essai maintenant/ })).toBeNull();
    });

    it("est caché pour un administrateur, même en mode Essai", async () => {
      mockApi({
        canEdit: false,
        settings: { presenceRemindersMode: "test", testRecipient: "essai@example.com" },
      });
      await renderPage();
      expect(screen.queryByRole("button", { name: /Envoyer l'essai maintenant/ })).toBeNull();
    });

    it("envoie le récapitulatif et confirme à qui", async () => {
      const user = userEvent.setup();
      const calls = mockApi({
        settings: { presenceRemindersMode: "test", testRecipient: "essai@example.com" },
      });
      await renderPage();

      await user.click(screen.getByRole("button", { name: /Envoyer l'essai maintenant/ }));

      expect(
        await screen.findByText("Récapitulatif envoyé à essai@example.com (3 rappels listés).")
      ).toBeInTheDocument();
      expect(writes(calls)).toEqual([
        { url: "/api/admin/notifications?action=send-test", method: "POST", body: undefined },
      ]);
    });

    it("est bloqué tant que les modifications ne sont pas enregistrées", async () => {
      const user = userEvent.setup();
      mockApi({ settings: { presenceRemindersMode: "test", testRecipient: "essai@example.com" } });
      await renderPage();

      await user.type(screen.getByLabelText("Adresse d'essai"), "x");

      expect(screen.getByRole("button", { name: /Envoyer l'essai maintenant/ })).toBeDisabled();
      expect(screen.getByText(/Enregistrez d'abord vos modifications/)).toBeInTheDocument();
    });

    it("montre l'erreur renvoyée (mode changé entre-temps)", async () => {
      const user = userEvent.setup();
      mockApi({
        settings: { presenceRemindersMode: "test", testRecipient: "essai@example.com" },
        sendTestResponse: json({ error: "Le mode Essai n'est pas actif." }, 409),
      });
      await renderPage();

      await user.click(screen.getByRole("button", { name: /Envoyer l'essai maintenant/ }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Le mode Essai n'est pas actif.");
    });
  });

  describe("administrateur : lecture seule", () => {
    it("voit tout, sans pouvoir modifier, avec une explication", async () => {
      mockApi({
        canEdit: false,
        settings: { presenceRemindersMode: "test", testRecipient: "essai@example.com" },
      });
      await renderPage();

      expect(screen.getByTestId("read-only-note")).toHaveTextContent(
        "Seul un super-administrateur peut modifier ces réglages"
      );
      for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
      expect(screen.getByLabelText("Adresse d'essai")).toHaveAttribute("readonly");
      expect(screen.queryByText(/Vous pouvez l'effacer/)).toBeNull();
      expect(screen.queryByRole("button", { name: "Enregistrer" })).toBeNull();
      // L'aperçu et le journal restent accessibles.
      expect(screen.getByRole("button", { name: /Voir qui recevrait/ })).toBeEnabled();
      expect(screen.getByText("Journal des envois")).toBeInTheDocument();
    });

    it("ne montre pas de champ d'adresse vide à un administrateur", async () => {
      mockApi({ canEdit: false });
      await renderPage();
      expect(screen.queryByLabelText("Adresse d'essai")).toBeNull();
    });

    it("n'affiche pas la note de lecture seule à un super-administrateur", async () => {
      mockApi();
      await renderPage();
      expect(screen.queryByTestId("read-only-note")).toBeNull();
    });
  });

  describe("aperçu « qui recevrait quoi »", () => {
    it("liste destinataire, événement, rappel, enfants concernés et objet", async () => {
      const user = userEvent.setup();
      const calls = mockApi({ preview: previewFixture });
      await renderPage();
      expect(screen.queryByTestId("preview")).toBeNull();

      await user.click(screen.getByRole("button", { name: /Voir qui recevrait/ }));

      const preview = await screen.findByTestId("preview");
      expect(calls.some((call) => call.url === "/api/admin/notifications?action=preview")).toBe(
        true
      );
      expect(writes(calls)).toHaveLength(0);
      expect(preview).toHaveTextContent("2 e-mails");
      expect(preview).toHaveTextContent("1 pas encore envoyé");
      expect(preview).toHaveTextContent("Rien n'est envoyé en regardant cette liste");

      const rows = within(preview).getAllByRole("row");
      const first = within(rows[1]);
      expect(first.getByText("Nathalie Leroy")).toBeInTheDocument();
      expect(first.getByText("nathalie@example.com")).toBeInTheDocument();
      expect(first.getByText("Concert de Noël")).toBeInTheDocument();
      expect(first.getByText("7 jours avant")).toBeInTheDocument();
      expect(first.getByText("Hugo, Noé")).toBeInTheDocument();
      expect(first.getByText(/Rappel : réponse attendue pour Hugo et Noé/)).toBeInTheDocument();
      expect(first.queryByText("Déjà envoyé")).toBeNull();

      const second = within(rows[2]);
      expect(second.getByText("lucas@example.com")).toBeInTheDocument();
      expect(second.getByText("7 et 2 jours avant")).toBeInTheDocument();
      expect(second.getByText("Déjà envoyé")).toBeInTheDocument();
    });

    it("déplie et replie le texte de chaque e-mail", async () => {
      const user = userEvent.setup();
      mockApi({ preview: previewFixture });
      await renderPage();
      await user.click(screen.getByRole("button", { name: /Voir qui recevrait/ }));
      await screen.findByTestId("preview");

      expect(screen.queryByText(/Aucune réponse n'a été donnée/)).toBeNull();
      await user.click(
        screen.getByRole("button", { name: "Voir le texte pour nathalie@example.com" })
      );
      expect(screen.getByText(/Aucune réponse n'a été donnée/)).toBeInTheDocument();
      await user.click(
        screen.getByRole("button", { name: "Masquer le texte pour nathalie@example.com" })
      );
      expect(screen.queryByText(/Aucune réponse n'a été donnée/)).toBeNull();
    });

    it("dit quand il n'y a rien à envoyer", async () => {
      const user = userEvent.setup();
      mockApi();
      await renderPage();

      await user.click(screen.getByRole("button", { name: /Voir qui recevrait/ }));

      expect(await screen.findByTestId("preview-empty")).toHaveTextContent(
        "Aucun rappel à envoyer aujourd'hui"
      );
    });

    it("signale la limite quotidienne", async () => {
      const user = userEvent.setup();
      mockApi({ preview: { ...previewFixture, capped: true } });
      await renderPage();

      await user.click(screen.getByRole("button", { name: /Voir qui recevrait/ }));

      expect(await screen.findByText(/au plus 30 e-mails partent par jour/)).toBeInTheDocument();
    });

    it("précise, quand les rappels ne sont pas activés, que rien ne part vraiment", async () => {
      mockApi({ settings: { presenceRemindersMode: "off" } });
      await renderPage();
      expect(
        screen.getByText(/Les rappels ne sont pas activés : rien ne part vraiment/)
      ).toBeInTheDocument();
    });
  });

  describe("journal des envois", () => {
    it("liste les envois avec leur état", async () => {
      mockApi({
        log: [
          {
            id: 2,
            createdAt: "2026-11-18 09:00:01",
            sentAt: "2026-11-18 09:00:02",
            status: "sent",
            kind: "presence_reminder",
            eventTitle: "Concert de Noël",
            stage: 7,
            recipientEmail: "nathalie@example.com",
            subjectNames: ["Hugo", "Noé"],
            error: null,
          },
          {
            id: 1,
            createdAt: "2026-11-17 09:00:01",
            sentAt: null,
            status: "pending",
            kind: "presence_reminder",
            eventTitle: "Répétition",
            stage: 2,
            recipientEmail: "lucas@example.com",
            subjectNames: [],
            error: "Resend a répondu 500",
          },
        ],
      });
      await renderPage();

      const log = screen.getByTestId("log");
      const rows = within(log).getAllByRole("row");
      expect(within(rows[1]).getByText("nathalie@example.com")).toBeInTheDocument();
      expect(within(rows[1]).getByText("Envoyé")).toBeInTheDocument();
      expect(within(rows[1]).getByText("18/11/2026 à 10:00")).toBeInTheDocument();
      expect(within(rows[1]).getByText("Hugo, Noé")).toBeInTheDocument();
      expect(within(rows[2]).getByText("Non confirmé")).toBeInTheDocument();
      expect(within(rows[2]).getByText("Resend a répondu 500")).toBeInTheDocument();
    });

    it("dit que le journal est vide", async () => {
      mockApi();
      await renderPage();
      expect(screen.getByTestId("log-empty")).toHaveTextContent(
        "Aucun e-mail envoyé pour le moment"
      );
    });
  });

  it("propose de réessayer si le chargement échoue", async () => {
    mockApi({ loadFails: true });
    render(<NotificationsAdminClient />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Erreur serveur");
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });
});
