import { env } from "cloudflare:workers";
import type { User } from "@/db/types";
import { isAdmin } from "@/db/types";

interface Step {
  step: number;
  name: string;
  status: string;
  message?: string;
  data?: Record<string, unknown>;
  httpStatus?: number;
  response?: unknown;
  emailId?: string;
}

export async function handleDiagnoseAuthRequest(request: Request): Promise<Response> {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    steps: [] as Step[],
  };

  try {
    const url = new URL(request.url);
    const email = url.searchParams.get("email")?.toLowerCase().trim();

    if (!email) {
      return new Response(
        JSON.stringify(
          { error: "Paramètre 'email' requis. Exemple: /api/diagnose-auth?email=test@example.com" },
          null,
          2
        ),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    results.email = email;
    const steps = results.steps as Step[];

    steps.push({ step: 1, name: "Vérification DB", status: "running" });
    const user = await env.DB.prepare(
      "SELECT id, email, role, is_active, created_at, last_login FROM users WHERE email = ?"
    )
      .bind(email)
      .first<User>();

    if (!user) {
      steps[0] = {
        step: 1,
        name: "Vérification DB",
        status: "error",
        message: "Utilisateur non trouvé",
      };
      return new Response(JSON.stringify(results, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    steps[0] = {
      step: 1,
      name: "Vérification DB",
      status: "success",
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        isAdmin: isAdmin(user.role),
        isActive: user.is_active === 1,
      },
    };

    steps.push({ step: 2, name: "Vérification Resend API Key", status: "running" });
    if (!env.RESEND_API_KEY) {
      steps[1] = {
        step: 2,
        name: "Vérification Resend API Key",
        status: "error",
        message: "RESEND_API_KEY non définie",
      };
      return new Response(JSON.stringify(results, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    steps[1] = {
      step: 2,
      name: "Vérification Resend API Key",
      status: "success",
      message: "Clé API présente",
    };

    steps.push({ step: 3, name: "Test envoi email Resend", status: "running" });

    const magicLink = `https://amis-harmonie-sucy.fr/admin/verify?token=test-token-${Date.now()}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "amis-harmonie-diagnose/1.0",
      },
      body: JSON.stringify({
        from: "Les Amis de l'Harmonie <onboarding@resend.dev>",
        to: email,
        subject: "[TEST DIAGNOSTIC] Lien de connexion",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">TEST - Les Amis de l'Harmonie</h2>
            <p>Ceci est un email de diagnostic.</p>
            <p style="margin: 24px 0;">
              <a href="${magicLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Se connecter (TEST)
              </a>
            </p>
            <p>Ce lien ne fonctionne pas - c'est juste un test.</p>
          </div>
        `,
      }),
    });

    const responseStatus = emailResponse.status;
    const responseText = await emailResponse.text();

    let responseJson;
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = { raw: responseText };
    }

    if (!emailResponse.ok) {
      steps[2] = {
        step: 3,
        name: "Test envoi email Resend",
        status: "error",
        httpStatus: responseStatus,
        response: responseJson,
      };
    } else {
      steps[2] = {
        step: 3,
        name: "Test envoi email Resend",
        status: "success",
        httpStatus: responseStatus,
        emailId: responseJson.id,
        message: "Email envoyé avec succès!",
      };
    }

    results.overallStatus = steps.every((s) => s.status === "success") ? "success" : "error";

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    results.error = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify(results, null, 2), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
