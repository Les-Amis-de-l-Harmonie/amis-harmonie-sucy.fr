import { render, route, layout } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";
import { env } from "cloudflare:workers";
import type { Event } from "@/db/types";

import { Document } from "@/app/Document";
import { Layout } from "@/app/Layout";
import { setCommonHeaders } from "@/app/headers";
import { Home } from "@/app/pages/Home";
import { TheDansant } from "@/app/pages/TheDansant";
import { Billetterie } from "@/app/pages/Billetterie";
import { About } from "@/app/pages/About";
import { Harmonie } from "@/app/pages/Harmonie";
import { Partenaires } from "@/app/pages/Partenaires";
import { Contact } from "@/app/pages/Contact";
import { Videos } from "@/app/pages/Videos";
import { Publications } from "@/app/pages/Publications";
import { LivreOr } from "@/app/pages/LivreOr";
import { Adhesion } from "@/app/pages/Adhesion";
import { Legal } from "@/app/pages/Legal";
import { handleContactSubmission } from "@/app/api/contact";
import { handleGuestbookSubmission } from "@/app/api/guestbook";
import {
  handleMagicLinkRequest,
  handleMagicLinkVerify,
  handleLogout,
  verifySession,
} from "@/app/api/auth";
import {
  handleEventsApi,
  handleVideosApi,
  handlePublicationsApi,
  handleGuestbookApi,
  handleContactApi,
  handleUsersApi,
  handleGalleryApi,
  handleR2CleanupApi,
  handleIdeasApi,
  handleOutingSettingsApi,
  handleCardOrderSettingsApi,
  handleInfoSettingsApi,
} from "@/app/api/admin-crud";
import {
  handleMusicianProfileApi,
  handleMusicianAvatarApi,
  handleMusicianIdeasApi,
  handleMusicianInsuranceApi,
  handleMusicianBirthdaysApi,
} from "@/app/api/musician";
import { handleImageUpload } from "@/app/api/upload";
import { handleImageServing } from "@/app/api/images";
import { handlePublicGalleryApi } from "@/app/api/gallery";
import { AdminLoginPage } from "@/app/admin/Login";
import {
  AdminDashboardPage,
  AdminEventsPage,
  AdminVideosPage,
  AdminPublicationsPage,
  AdminGuestbookPage,
  AdminContactPage,
  AdminUsersPage,
  AdminGalleryPage,
  AdminIdeasPage,
  AdminOutingSettingsPage,
  AdminCardOrderPage,
  AdminInfoSettingsPage,
} from "@/app/admin/pages";
import { MusicianLoginClient } from "@/app/musician/MusicianLogin";
import { MusicianLayout } from "@/app/musician/MusicianLayout";
import { MusicianHomeClient } from "@/app/musician/MusicianHome";
import { MusicianProfileClient } from "@/app/musician/MusicianProfile";
import { MusicianIdeeClient } from "@/app/musician/MusicianIdee";
import { MusicianAssuranceClient } from "@/app/musician/MusicianAssurance";
import { getCachedResponse, cacheResponse, shouldCachePath } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limit";

export type AppContext = {};

async function adminAuthMiddleware({ request }: { request: Request }) {
  const user = await verifySession(request, "admin");
  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    const url = new URL(request.url);
    return Response.redirect(new URL("/admin/login", url.origin).toString());
  }
  return { email: user.email, role: user.role };
}

async function musicianAuthMiddleware({ request }: { request: Request }) {
  const user = await verifySession(request, "musician");
  if (!user) {
    const url = new URL(request.url);
    return Response.redirect(new URL("/musician/login", url.origin).toString());
  }
  const profile = await env.DB.prepare(
    "SELECT first_name, last_name, avatar FROM musician_profiles WHERE user_id = ?"
  )
    .bind(user.id)
    .first<{ first_name: string | null; last_name: string | null; avatar: string | null }>();
  return {
    email: user.email,
    userId: user.id,
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    avatar: profile?.avatar || null,
  };
}

const app = defineApp([
  setCommonHeaders(),
  ({ ctx }) => {
    ctx;
  },

  route("/api/auth/status", async ({ request }: { request: Request }) => {
    const [musicianUser, adminUser] = await Promise.all([
      verifySession(request, "musician"),
      verifySession(request, "admin"),
    ]);
    return new Response(
      JSON.stringify({
        musician: !!musicianUser,
        admin: !!adminUser,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }),

  route("/api/contact", {
    post: async ({ request }: { request: Request }) => {
      const rateLimitResponse = await checkRateLimit(request);
      if (rateLimitResponse) return rateLimitResponse;
      return handleContactSubmission(request);
    },
  }),

  route("/api/guestbook", {
    post: async ({ request }: { request: Request }) => {
      const rateLimitResponse = await checkRateLimit(request);
      if (rateLimitResponse) return rateLimitResponse;
      return handleGuestbookSubmission(request);
    },
  }),

  route("/api/gallery", ({ request }: { request: Request }) => handlePublicGalleryApi(request)),

  route("/api/events", async () => {
    try {
      const results = await env.DB.prepare("SELECT * FROM events ORDER BY date ASC").all<Event>();
      const events = results.results || [];
      const now = new Date().toISOString().split("T")[0];

      return new Response(
        JSON.stringify({
          upcoming: events.filter((e) => e.date >= now),
          past: events.filter((e) => e.date < now).reverse(),
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (_error) {
      return new Response(JSON.stringify({ error: "Failed to fetch events" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),

  route("/api/auth/magic-link", {
    post: async ({ request }: { request: Request }) => {
      const rateLimitResponse = await checkRateLimit(request);
      if (rateLimitResponse) return rateLimitResponse;
      return handleMagicLinkRequest(request, "admin");
    },
  }),

  route("/api/auth/musician-magic-link", {
    post: async ({ request }: { request: Request }) => {
      const rateLimitResponse = await checkRateLimit(request);
      if (rateLimitResponse) return rateLimitResponse;
      return handleMagicLinkRequest(request, "musician");
    },
  }),

  route("/api/admin/events", ({ request }: { request: Request }) => handleEventsApi(request)),
  route("/api/admin/videos", ({ request }: { request: Request }) => handleVideosApi(request)),
  route("/api/admin/publications", ({ request }: { request: Request }) =>
    handlePublicationsApi(request)
  ),
  route("/api/admin/guestbook", ({ request }: { request: Request }) => handleGuestbookApi(request)),
  route("/api/admin/contact", ({ request }: { request: Request }) => handleContactApi(request)),
  route("/api/admin/users", ({ request }: { request: Request }) => handleUsersApi(request)),
  route("/api/admin/gallery", ({ request }: { request: Request }) => handleGalleryApi(request)),
  route("/api/admin/upload", async ({ request }: { request: Request }) => {
    const rateLimitResponse = await checkRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;
    return handleImageUpload(request);
  }),
  route("/api/admin/r2-cleanup", ({ request }: { request: Request }) =>
    handleR2CleanupApi(request)
  ),
  route("/api/admin/ideas", ({ request }: { request: Request }) => handleIdeasApi(request)),
  route("/api/admin/outing-settings", ({ request }: { request: Request }) =>
    handleOutingSettingsApi(request)
  ),
  route("/api/admin/card-order", ({ request }: { request: Request }) =>
    handleCardOrderSettingsApi(request)
  ),
  route("/api/admin/info-settings", ({ request }: { request: Request }) =>
    handleInfoSettingsApi(request)
  ),

  route("/api/musician/profile", ({ request }: { request: Request }) =>
    handleMusicianProfileApi(request)
  ),
  route("/api/musician/avatar", ({ request }: { request: Request }) =>
    handleMusicianAvatarApi(request)
  ),
  route("/api/musician/ideas", ({ request }: { request: Request }) =>
    handleMusicianIdeasApi(request)
  ),
  route("/api/musician/insurance", ({ request }: { request: Request }) =>
    handleMusicianInsuranceApi(request)
  ),
  route("/api/musician/birthdays", ({ request }: { request: Request }) =>
    handleMusicianBirthdaysApi(request)
  ),

  // Public API for info settings (read-only, returns only active settings)
  route("/api/info-settings", async ({ request }: { request: Request }) => {
    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }
    try {
      const settings = await env.DB.prepare(
        "SELECT * FROM info_settings WHERE is_active = 1 LIMIT 1"
      ).first();
      if (!settings) {
        return new Response(JSON.stringify({ is_active: 0 }), {
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(settings), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error fetching info settings:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }),

  route("/images/r2/*", ({ request }: { request: Request }) => handleImageServing(request)),

  route("/admin/verify", ({ request }: { request: Request }) =>
    handleMagicLinkVerify(request, "admin")
  ),
  route("/admin/logout", ({ request }: { request: Request }) => handleLogout(request, "admin")),

  route("/musician/verify", ({ request }: { request: Request }) =>
    handleMagicLinkVerify(request, "musician")
  ),
  route("/musician/logout", ({ request }: { request: Request }) =>
    handleLogout(request, "musician")
  ),

  render(Document, [
    layout(Layout, [
      route("/", Home),
      route("/the-dansant", TheDansant),
      route("/billetterie", Billetterie),
      route("/about", About),
      route("/harmonie", Harmonie),
      route("/partenaires", Partenaires),
      route("/contact", Contact),
      route("/videos", Videos),
      route("/publications", Publications),
      route("/livre-or", LivreOr),
      route("/adhesion", Adhesion),
      route("/legal", Legal),
    ]),

    route("/admin/login", () => <AdminLoginPage />),

    route("/admin", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminDashboardPage email={auth.email} />;
    }),

    route("/admin/events", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminEventsPage email={auth.email} />;
    }),

    route("/admin/videos", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminVideosPage email={auth.email} />;
    }),

    route("/admin/publications", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminPublicationsPage email={auth.email} />;
    }),

    route("/admin/guestbook", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminGuestbookPage email={auth.email} />;
    }),

    route("/admin/contact", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminContactPage email={auth.email} />;
    }),

    route("/admin/users", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminUsersPage email={auth.email} role={auth.role} />;
    }),

    route("/admin/gallery", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminGalleryPage email={auth.email} />;
    }),

    route("/admin/ideas", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminIdeasPage email={auth.email} />;
    }),

    route("/admin/outing-settings", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminOutingSettingsPage email={auth.email} />;
    }),

    route("/admin/card-order", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminCardOrderPage email={auth.email} />;
    }),

    route("/admin/info-settings", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminInfoSettingsPage email={auth.email} />;
    }),

    route("/musician/login", () => <MusicianLoginClient />),

    route("/musician/portal", async ({ request }: { request: Request }) => {
      const url = new URL(request.url);
      const user = await verifySession(request, "musician");
      if (user) {
        return Response.redirect(new URL("/musician/", url.origin).toString());
      }
      return Response.redirect(new URL("/musician/login", url.origin).toString());
    }),

    route("/musician/", async ({ request }: { request: Request }) => {
      const auth = await musicianAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return (
        <MusicianLayout firstName={auth.firstName} lastName={auth.lastName} avatar={auth.avatar}>
          <MusicianHomeClient
            userId={auth.userId}
            firstName={auth.firstName}
            lastName={auth.lastName}
          />
        </MusicianLayout>
      );
    }),

    route("/musician/profile", async ({ request }: { request: Request }) => {
      const auth = await musicianAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return (
        <MusicianLayout firstName={auth.firstName} lastName={auth.lastName} avatar={auth.avatar}>
          <MusicianProfileClient userId={auth.userId} />
        </MusicianLayout>
      );
    }),

    route("/musician/idee", async ({ request }: { request: Request }) => {
      const auth = await musicianAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return (
        <MusicianLayout firstName={auth.firstName} lastName={auth.lastName} avatar={auth.avatar}>
          <MusicianIdeeClient />
        </MusicianLayout>
      );
    }),

    route("/musician/assurance", async ({ request }: { request: Request }) => {
      const auth = await musicianAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return (
        <MusicianLayout firstName={auth.firstName} lastName={auth.lastName} avatar={auth.avatar}>
          <MusicianAssuranceClient />
        </MusicianLayout>
      );
    }),
  ]),
]);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (shouldCachePath(url.pathname) && request.method === "GET") {
      const cached = await getCachedResponse(request);
      if (cached) {
        return cached;
      }
    }

    const response = await app.fetch(request, env, ctx);

    if (shouldCachePath(url.pathname) && request.method === "GET") {
      return cacheResponse(request, response);
    }

    return response;
  },
};
