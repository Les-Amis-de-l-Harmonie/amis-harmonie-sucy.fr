import { env } from "cloudflare:workers";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/auth/magic-link": { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  "/api/auth/musician-magic-link": { maxRequests: 5, windowMs: 15 * 60 * 1000 },
  "/api/contact": { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  "/api/guestbook": { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  "/api/admin/upload": { maxRequests: 10, windowMs: 60 * 1000 },
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

  const stored = await env.CACHE.get(key);
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

  await env.CACHE.put(key, JSON.stringify(recentRequests), {
    expirationTtl: Math.ceil(config.windowMs / 1000),
  });

  return null;
}

export function getRateLimitConfig(path: string): RateLimitConfig | undefined {
  return RATE_LIMITS[path];
}
