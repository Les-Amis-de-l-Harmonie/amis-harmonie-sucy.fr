import { RouteMiddleware } from "rwsdk/router";

const HELLOASSO_PAYMENT_PATHS = new Set(["/adhesion", "/partenaires"]);

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

export function buildContentSecurityPolicy(nonce: string, path: string): string {
  const allowsAnyPaymentIframe = HELLOASSO_PAYMENT_PATHS.has(normalizePath(path));
  const frameSrc = allowsAnyPaymentIframe
    ? "frame-src *"
    : "frame-src 'self' https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://www.instagram.com https://www.helloasso.com";

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-eval' 'unsafe-inline' 'nonce-${nonce}' https://challenges.cloudflare.com https://www.instagram.com https://www.youtube.com https://www.youtube-nocookie.com https://static.cloudflareinsights.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "frame-ancestors 'self'",
    frameSrc,
    "connect-src 'self' https://www.instagram.com https://www.youtube.com https://www.youtube-nocookie.com https://www.helloasso.com https://cloudflareinsights.com",
    "object-src 'none'",
  ].join("; ");
}

export const setCommonHeaders =
  (): RouteMiddleware =>
  ({ path, response, rw: { nonce } }) => {
    if (!import.meta.env.VITE_IS_DEV_SERVER) {
      // Forces browsers to always use HTTPS for a specified time period (2 years)
      response.headers.set(
        "Strict-Transport-Security",
        "max-age=63072000; includeSubDomains; preload"
      );
    }

    // Forces browser to use the declared content-type instead of trying to guess/sniff it
    response.headers.set("X-Content-Type-Options", "nosniff");

    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

    // Explicitly disables access to specific browser features/APIs
    response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

    // Defines trusted sources for content loading and script execution:
    response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce, path));
  };
