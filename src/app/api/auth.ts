import { env } from "cloudflare:workers";
import type { AdminUser, AuthToken, AdminSession } from "@/db/types";

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

export async function handleMagicLinkRequest(request: Request): Promise<Response> {
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

    const adminUser = await env.DB.prepare(
      "SELECT * FROM admin_users WHERE email = ?"
    ).bind(email).first<AdminUser>();

    if (!adminUser) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "If this email is registered, a magic link has been sent." 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await env.DB.prepare(
      "INSERT INTO auth_tokens (token, email, expires_at) VALUES (?, ?, ?)"
    ).bind(token, email, expiresAt).run();

    const baseUrl = new URL(request.url).origin;
    const magicLink = `${baseUrl}/admin/verify?token=${token}`;

    console.log(`[Magic Link] For ${email}: ${magicLink}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: "If this email is registered, a magic link has been sent.",
      debug_link: magicLink
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Magic link error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleMagicLinkVerify(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return Response.redirect(new URL("/admin/login?error=invalid_token", url.origin).toString());
  }

  try {
    const authToken = await env.DB.prepare(
      "SELECT * FROM auth_tokens WHERE token = ? AND used = 0"
    ).bind(token).first<AuthToken>();

    if (!authToken) {
      return Response.redirect(new URL("/admin/login?error=invalid_token", url.origin).toString());
    }

    if (new Date(authToken.expires_at) < new Date()) {
      return Response.redirect(new URL("/admin/login?error=expired_token", url.origin).toString());
    }

    await env.DB.prepare(
      "UPDATE auth_tokens SET used = 1 WHERE token = ?"
    ).bind(token).run();

    const sessionId = generateSessionId();
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare(
      "INSERT INTO admin_sessions (session_id, email, expires_at) VALUES (?, ?, ?)"
    ).bind(sessionId, authToken.email, sessionExpiresAt).run();

    const response = Response.redirect(new URL("/admin", url.origin).toString());
    const headers = new Headers(response.headers);
    headers.set(
      "Set-Cookie",
      `admin_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Token verification error:", error);
    return Response.redirect(new URL("/admin/login?error=server_error", url.origin).toString());
  }
}

export async function handleLogout(request: Request): Promise<Response> {
  const cookieHeader = request.headers.get("Cookie") || "";
  const sessionMatch = cookieHeader.match(/admin_session=([^;]+)/);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (sessionId) {
    await env.DB.prepare(
      "DELETE FROM admin_sessions WHERE session_id = ?"
    ).bind(sessionId).run();
  }

  const url = new URL(request.url);
  const response = Response.redirect(new URL("/admin/login", url.origin).toString());
  const headers = new Headers(response.headers);
  headers.set(
    "Set-Cookie",
    "admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}

export async function verifySession(request: Request): Promise<AdminSession | null> {
  const cookieHeader = request.headers.get("Cookie") || "";
  const sessionMatch = cookieHeader.match(/admin_session=([^;]+)/);
  const sessionId = sessionMatch ? sessionMatch[1] : null;

  if (!sessionId) {
    return null;
  }

  const session = await env.DB.prepare(
    "SELECT * FROM admin_sessions WHERE session_id = ?"
  ).bind(sessionId).first<AdminSession>();

  if (!session) {
    return null;
  }

  if (new Date(session.expires_at) < new Date()) {
    await env.DB.prepare(
      "DELETE FROM admin_sessions WHERE session_id = ?"
    ).bind(sessionId).run();
    return null;
  }

  return session;
}

export async function requireAuth(request: Request): Promise<Response | AdminSession> {
  const session = await verifySession(request);
  
  if (!session) {
    const url = new URL(request.url);
    return Response.redirect(new URL("/admin/login", url.origin).toString());
  }

  return session;
}
