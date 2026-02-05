export const IMAGE_CONFIG = {
  EVENT_TARGET_WIDTH: 600,
  EVENT_TARGET_HEIGHT: 600,
  WEBP_QUALITY: 0.7,
  JPEG_QUALITY: 0.85,
  GALLERY_FOLDERS: {
    home_slideshow: {
      label: "Accueil - Diaporama",
      targetWidth: 1600,
      targetHeight: 900,
      aspectRatio: 16 / 9,
    },
    events: { label: "Événements", targetWidth: 600, targetHeight: 600, aspectRatio: 1 },
    gallery: { label: "Galerie", targetWidth: 1200, targetHeight: 800, aspectRatio: 3 / 2 },
    avatars: { label: "Avatars", targetWidth: 400, targetHeight: 400, aspectRatio: 1 },
    publications: { label: "Publications", targetWidth: 800, targetHeight: 800, aspectRatio: 1 },
  },
} as const;

export const CACHE_CONFIG = {
  TTL_SECONDS: 3600,
  STALE_WHILE_REVALIDATE_SECONDS: 86400,
  MAX_AGE_SECONDS: 0,
} as const;

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_FOLDERS: ["events", "gallery", "avatars", "publications"] as const,
  ALLOWED_MIME_TYPES: ["image/jpeg", "image/png", "image/webp", "image/gif"] as const,
  FILE_SIGNATURES: {
    JPEG: [0xff, 0xd8, 0xff],
    PNG: [0x89, 0x50, 0x4e, 0x47],
    WEBP: [0x52, 0x49, 0x46, 0x46],
    GIF: [0x47, 0x49, 0x46, 0x38],
  } as const,
} as const;

export const RATE_LIMIT_CONFIG = {
  AUTH_MAGIC_LINK: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
  CONTACT_FORM: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
  },
  GUESTBOOK: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
  },
  ADMIN_UPLOAD: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
} as const;

export const AUTH_CONFIG = {
  SESSION_DURATION_SECONDS: 7 * 24 * 60 * 60,
  COOKIE_NAME: "session",
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  },
} as const;
