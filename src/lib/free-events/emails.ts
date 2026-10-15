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
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#243247;max-width:600px;margin:0 auto;padding:16px">
<p>${escapeHtml(greeting)}</p>
<p>Votre réservation pour ${reservation.partySize} personne(s) est bien enregistrée.</p>
<p>Samedi 14 novembre 2026, ouverture des portes à 14h30, concert à 15h, à l'Espace Jean-Marie Poirier, 1 esplanade du 18 Juin 1940, Sucy-en-Brie. Pour vous garer : parking des Fontaines (gratuit) ou parking Montaleau (gratuit : à l'accueil, échangez votre ticket contre une contremarque de parking).</p>
<p>À l'entrée, donnez simplement votre nom. Un empêchement ? Répondez à ce mail pour libérer vos places.</p>
<p>À samedi 14 novembre !</p>
<p>Les Amis de l'Harmonie de Sucy-en-Brie</p>
</div>`;

  return { subject, html, text };
}
