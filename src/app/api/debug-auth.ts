import { env } from "cloudflare:workers";
import type { User } from "@/db/types";
import { isAdmin } from "@/db/types";

export async function handleDebugAuthRequest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await request.formData();
    const email = formData.get("email")?.toString().toLowerCase().trim();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results: Record<string, unknown> = {
      email,
      timestamp: new Date().toISOString(),
    };

    // Check 1: User exists
    const user = await env.DB.prepare(
      "SELECT id, email, role, is_active, created_at, last_login FROM users WHERE email = ?"
    )
      .bind(email)
      .first<User>();

    results.userExists = !!user;

    if (user) {
      results.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
        isAdmin: isAdmin(user.role),
        createdAt: user.created_at,
        lastLogin: user.last_login,
      };
    } else {
      results.error = "User not found in database";
      return new Response(JSON.stringify(results, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check 2: Can send email (test Resend API)
    const testEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "User-Agent": "amis-harmonie-debug/1.0",
      },
      body: JSON.stringify({
        from: "Les Amis de l'Harmonie <onboarding@resend.dev>",
        to: email,
        subject: "Test - Votre lien de connexion",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Les Amis de l'Harmonie de Sucy</h2>
            <p>Bonjour,</p>
            <p>Ceci est un test de diagnostic.</p>
            <p>Votre compte existe et est configuré correctement.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #999; font-size: 12px;">Test effectué le ${new Date().toISOString()}</p>
          </div>
        `,
      }),
    });

    results.resendApiStatus = testEmailResponse.status;
    results.resendApiOk = testEmailResponse.ok;

    if (!testEmailResponse.ok) {
      const errorText = await testEmailResponse.text();
      results.resendError = errorText;
    } else {
      const responseData = (await testEmailResponse.json()) as { id: string };
      results.emailSent = true;
      results.emailId = responseData.id;
    }

    return new Response(JSON.stringify(results, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
