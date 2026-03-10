// Environment-dependent configuration - SERVER ONLY
// Do not import this file in client-side code
import { env } from "cloudflare:workers";

export const CACHE_CONFIG = {
  TTL_SECONDS: parseInt(env.CACHE_TTL_SECONDS || "3600", 10),
  STALE_WHILE_REVALIDATE_SECONDS: parseInt(env.CACHE_STALE_WHILE_REVALIDATE_SECONDS || "86400", 10),
  MAX_AGE_SECONDS: 0,
} as const;

export const RATE_LIMIT_CONFIG = {
  AUTH_MAGIC_LINK: {
    maxRequests: parseInt(env.RATE_LIMIT_AUTH_MAX || "5", 10),
    windowMs: 15 * 60 * 1000,
  },
  CONTACT_FORM: {
    maxRequests: parseInt(env.RATE_LIMIT_CONTACT_MAX || "3", 10),
    windowMs: 60 * 60 * 1000,
  },
  GUESTBOOK: {
    maxRequests: parseInt(env.RATE_LIMIT_GUESTBOOK_MAX || "3", 10),
    windowMs: 60 * 60 * 1000,
  },
  ADMIN_UPLOAD: {
    maxRequests: parseInt(env.RATE_LIMIT_UPLOAD_MAX || "10", 10),
    windowMs: 60 * 1000,
  },
} as const;
