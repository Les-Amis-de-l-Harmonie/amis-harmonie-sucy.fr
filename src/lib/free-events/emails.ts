import { CONFIRMATION_HTML } from "./emails/confirmation.html";
import type { FreeEventConfig } from "./rencontre-harmonies-2026";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildConfirmationEmail(
  _event: FreeEventConfig,
  reservation: { firstName: string | null; partySize: number }
): { subject: string; html: string; text: string } {
  const greeting = reservation.firstName ? `Bonjour ${reservation.firstName},` : "Bonjour,";
  const subject = "Votre réservation pour la Rencontre d'Harmonies du samedi 14 novembre";
  const text = `${greeting}
Votre réservation pour ${reservation.partySize} personne(s) est bien enregistrée.
Samedi 14 novembre 2026, ouverture des portes à 14h30, concert à 15h, à l'Espace Jean-Marie Poirier, 1 esplanade du 18 Juin 1940, Sucy-en-Brie. Pour vous garer : parking des Fontaines (gratuit) ou parking Montaleau (gratuit : à l'accueil, échangez votre ticket contre une contremarque de parking).
À l'entrée, donnez simplement votre nom. Un empêchement ? Répondez à ce mail pour libérer vos places.
À samedi 14 novembre !
Les Amis de l'Harmonie de Sucy-en-Brie`;
  // Modèle MJML compilé au build (npm run emails:build) : seules deux valeurs, échappées, sont injectées.
  const html = CONFIRMATION_HTML.replaceAll(
    "{{firstNameGreeting}}",
    escapeHtml(greeting)
  ).replaceAll("{{partySize}}", escapeHtml(String(reservation.partySize)));

  return { subject, html, text };
}
