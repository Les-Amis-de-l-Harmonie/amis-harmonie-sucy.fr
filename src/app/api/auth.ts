import { env } from "cloudflare:workers";
import type { User, AuthToken, Session, UserRole } from "@/db/types";
import { isAdmin } from "@/db/types";
import { invalidateCache } from "@/lib/cache";

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

type LoginContext = "admin" | "musician";

function getRedirectPath(role: UserRole, context: LoginContext): string {
  if (context === "admin" && isAdmin(role)) {
    return "/admin";
  }
  if (context === "musician") {
    return "/musician/";
  }
  return "/";
}

function getLoginPath(context: LoginContext): string {
  return context === "admin" ? "/admin/login" : "/musician/login";
}

function getVerifyPath(context: LoginContext): string {
  return context === "admin" ? "/admin/verify" : "/musician/verify";
}

function getCookieName(context: LoginContext): string {
  return context === "admin" ? "admin_session" : "musician_session";
}

export async function handleMagicLinkRequest(
  request: Request,
  context: LoginContext = "admin"
): Promise<Response> {
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

    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
      .bind(email)
      .first<User>();

    if (!user) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Si cet email est enregistré, un lien de connexion a été envoyé.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (context === "admin" && !isAdmin(user.role)) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Si cet email est enregistré, un lien de connexion a été envoyé.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Prevent admins from requesting magic link for musician portal
    if (context === "musician" && isAdmin(user.role)) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Si cet email est enregistré, un lien de connexion a été envoyé.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await env.DB.prepare("INSERT INTO auth_tokens (token, email, expires_at) VALUES (?, ?, ?)")
      .bind(token, email, expiresAt)
      .run();

    const baseUrl = new URL(request.url).origin;
    const verifyPath = getVerifyPath(context);
    const magicLink = `${baseUrl}${verifyPath}?token=${token}`;

    const contextLabel = context === "admin" ? "l'administration" : "l'espace musicien";
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Les Amis de l'Harmonie <noreply@notifications.amis-harmonie-sucy.fr>",
        to: email,
        subject: "Votre lien de connexion - Les Amis de l'Harmonie",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1a365d;">Les Amis de l'Harmonie de Sucy</h2>
            <p>Bonjour,</p>
            <p>Vous avez demandé un lien de connexion pour accéder à ${contextLabel}.</p>
            <p style="margin: 24px 0;">
              <a href="${magicLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Se connecter
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">Ce lien est valable 15 minutes et ne peut être utilisé qu'une seule fois.</p>
            <p style="color: #666; font-size: 14px;">Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="color: #999; font-size: 12px;">Les Amis de l'Harmonie de Sucy-en-Brie</p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend error:", errorData);
      return new Response(JSON.stringify({ error: "Erreur lors de l'envoi de l'email" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Un lien de connexion a été envoyé à votre adresse email.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Magic link error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleMagicLinkVerify(
  request: Request,
  context: LoginContext = "admin"
): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const loginPath = getLoginPath(context);
  const cookieName = getCookieName(context);

  if (!token) {
    return Response.redirect(new URL(`${loginPath}?error=invalid_token`, url.origin).toString());
  }

  try {
    const authToken = await env.DB.prepare("SELECT * FROM auth_tokens WHERE token = ? AND used = 0")
      .bind(token)
      .first<AuthToken>();

    if (!authToken) {
      return Response.redirect(new URL(`${loginPath}?error=invalid_token`, url.origin).toString());
    }

    if (new Date(authToken.expires_at) < new Date()) {
      return Response.redirect(new URL(`${loginPath}?error=expired_token`, url.origin).toString());
    }

    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
      .bind(authToken.email)
      .first<User>();

    if (!user) {
      return Response.redirect(new URL(`${loginPath}?error=invalid_token`, url.origin).toString());
    }

    if (user.is_active === 0) {
      return Response.redirect(
        new URL(`${loginPath}?error=account_inactive`, url.origin).toString()
      );
    }

    if (context === "admin" && !isAdmin(user.role)) {
      return Response.redirect(new URL(`${loginPath}?error=unauthorized`, url.origin).toString());
    }

    // Prevent admins from logging into musician portal
    if (context === "musician" && isAdmin(user.role)) {
      return Response.redirect(
        new URL(`${loginPath}?error=admin_not_allowed`, url.origin).toString()
      );
    }

    await env.DB.prepare("UPDATE auth_tokens SET used = 1 WHERE token = ?").bind(token).run();

    const sessionId = generateSessionId();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare("INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)")
      .bind(sessionId, user.id, sessionExpiresAt)
      .run();

    // Update last_login timestamp
    await env.DB.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(user.id)
      .run();
    await invalidateCache();

    const redirectPath = getRedirectPath(user.role, context);
    const response = Response.redirect(new URL(redirectPath, url.origin).toString());
    const headers = new Headers(response.headers);
    headers.set(
      "Set-Cookie",
      `${cookieName}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return Response.redirect(new URL(`${loginPath}?error=server_error`, url.origin).toString());
  }
}

export async function handleLogout(
  request: Request,
  context: LoginContext = "admin"
): Promise<Response> {
  const cookieName = getCookieName(context);
  const loginPath = getLoginPath(context);
  const cookieHeader = request.headers.get("Cookie") || "";
  const sessionMatch = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (sessionId) {
    await env.DB.prepare("DELETE FROM sessions WHERE session_id = ?").bind(sessionId).run();
  }

  const url = new URL(request.url);
  const response = Response.redirect(new URL(loginPath, url.origin).toString());
  const headers = new Headers(response.headers);
  headers.set("Set-Cookie", `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

export interface AuthenticatedUser extends User {
  sessionId: string;
}

export async function verifySession(
  request: Request,
  context: LoginContext = "admin"
): Promise<AuthenticatedUser | null> {
  const cookieName = getCookieName(context);
  const cookieHeader = request.headers.get("Cookie") || "";
  const sessionMatch = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (!sessionId) {
    return null;
  }

  const session = await env.DB.prepare(
    "SELECT s.*, u.email, u.role, u.is_active, u.created_at as user_created_at, u.last_login FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.session_id = ?"
  )
    .bind(sessionId)
    .first<
      Session & {
        email: string;
        role: UserRole;
        is_active: number;
        user_created_at: string;
        last_login: string | null;
      }
    >();

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at) < new Date()) {
    await env.DB.prepare("DELETE FROM sessions WHERE session_id = ?").bind(sessionId).run();
    return null;
  }

  if (session.is_active === 0) {
    await env.DB.prepare("DELETE FROM sessions WHERE session_id = ?").bind(sessionId).run();
    return null;
  }

  return {
    id: session.user_id,
    email: session.email,
    role: session.role,
    is_active: session.is_active,
    created_at: session.user_created_at,
    last_login: session.last_login,
    sessionId: session.session_id,
  };
}

export async function requireAdminAuth(request: Request): Promise<Response | AuthenticatedUser> {
  const user = await verifySession(request, "admin");

  if (!user || !isAdmin(user.role)) {
    const url = new URL(request.url);
    return Response.redirect(new URL("/admin/login", url.origin).toString());
  }

  return user;
}

export async function requireSuperAdminAuth(
  request: Request
): Promise<Response | AuthenticatedUser> {
  const user = await verifySession(request, "admin");

  if (!user || user.role !== "SUPER_ADMIN") {
    const url = new URL(request.url);
    return Response.redirect(new URL("/admin/login", url.origin).toString());
  }

  return user;
}

export async function requireMusicianAuth(request: Request): Promise<Response | AuthenticatedUser> {
  const user = await verifySession(request, "musician");

  if (!user) {
    const url = new URL(request.url);
    return Response.redirect(new URL("/musician/login", url.origin).toString());
  }

  return user;
}
