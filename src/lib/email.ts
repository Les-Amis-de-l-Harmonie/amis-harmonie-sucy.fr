import { env } from "cloudflare:workers";
import { logger } from "@/lib/logger";

const FROM = "Les Amis de l'Harmonie <noreply@notifications.amis-harmonie-sucy.fr>";
const DEFAULT_REPLY_TO = "contact@amis-harmonie-sucy.fr";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

export type SendEmailResult = { ok: true; id: string } | { ok: false; error: string };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!env.RESEND_API_KEY) return { ok: false, error: "missing_key" };

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "amis-harmonie-app/1.0",
      },
      body: JSON.stringify({
        from: FROM,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo ?? DEFAULT_REPLY_TO,
      }),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : "Erreur inconnue";
    logger.error("Échec réseau lors de l'envoi d'un e-mail", new Error(name));
    return { ok: false, error: "network" };
  }

  if (!response.ok) {
    logger.error("Resend a refusé l'envoi d'un e-mail", new Error(`http_${response.status}`));
    return { ok: false, error: `http_${response.status}` };
  }

  try {
    const result: unknown = await response.json();
    if (
      typeof result === "object" &&
      result !== null &&
      "id" in result &&
      typeof result.id === "string"
    ) {
      return { ok: true, id: result.id };
    }
  } catch {
    // Une réponse inattendue ne doit pas exposer son contenu, qui peut contenir des données.
  }

  logger.error("Réponse Resend invalide", new Error("invalid_response"));
  return { ok: false, error: "invalid_response" };
}
