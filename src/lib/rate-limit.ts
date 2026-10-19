import { env } from "cloudflare:workers";
import { RATE_LIMIT_CONFIG } from "./env-config";
import { logger } from "./logger";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/auth/magic-link": RATE_LIMIT_CONFIG.AUTH_MAGIC_LINK,
  "/api/auth/musician-magic-link": RATE_LIMIT_CONFIG.AUTH_MAGIC_LINK,
  "/api/contact": RATE_LIMIT_CONFIG.CONTACT_FORM,
  "/api/reservations": RATE_LIMIT_CONFIG.RESERVATION,
  "/api/guestbook": RATE_LIMIT_CONFIG.GUESTBOOK,
  "/api/admin/upload": RATE_LIMIT_CONFIG.ADMIN_UPLOAD,
};

function getClientIP(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0] ||
    "unknown"
  );
}

function getRateLimitKey(ip: string, path: string): string {
  return `ratelimit:${path}:${ip}`;
}

export async function checkRateLimit(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const config = RATE_LIMITS[url.pathname];

  if (!config) {
    return null;
  }

  const ip = getClientIP(request);
  const key = getRateLimitKey(ip, url.pathname);

  const now = Date.now();
  const windowStart = now - config.windowMs;

  let stored: string | null;
  try {
    stored = await env.CACHE.get(key);
  } catch (error) {
    // Fail open: KV unavailable (e.g. daily quota exceeded) must not block login or forms.
    logger.warn("Rate limit KV indisponible, requête autorisée", {
      path: url.pathname,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
  const requests: number[] = stored ? JSON.parse(stored) : [];

  const recentRequests = requests.filter((timestamp) => timestamp > windowStart);

  if (recentRequests.length >= config.maxRequests) {
    const oldestRequest = Math.min(...recentRequests);
    const retryAfter = Math.ceil((oldestRequest + config.windowMs - now) / 1000);

    return new Response(
      JSON.stringify({
        error: "Too many requests",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": retryAfter.toString(),
          "X-RateLimit-Limit": config.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(oldestRequest + config.windowMs).toISOString(),
        },
      }
    );
  }

  recentRequests.push(now);

  try {
    await env.CACHE.put(key, JSON.stringify(recentRequests), {
      expirationTtl: Math.ceil(config.windowMs / 1000),
    });
  } catch (error) {
    logger.warn("Rate limit KV indisponible, compteur non enregistré", {
      path: url.pathname,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return null;
}

export function getRateLimitConfig(path: string): RateLimitConfig | undefined {
  return RATE_LIMITS[path];
}
