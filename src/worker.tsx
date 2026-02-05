import { render, route, layout } from "rwsdk/router";
import { defineApp } from "rwsdk/worker";

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
} from "@/app/api/admin-crud";
import { handleMusicianProfileApi, handleMusicianAvatarApi } from "@/app/api/musician";
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
} from "@/app/admin/pages";
import { MusicianLoginClient } from "@/app/musician/MusicianLogin";
import { MusicianLayout } from "@/app/musician/MusicianLayout";
import { MusicianProfileClient } from "@/app/musician/MusicianProfile";
import { getCachedResponse, cacheResponse, shouldCachePath } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limit";

export type AppContext = {};

async function adminAuthMiddleware({ request }: { request: Request }) {
  const user = await verifySession(request, "admin");
  if (!user || user.role !== "ADMIN") {
    const url = new URL(request.url);
    return Response.redirect(new URL("/admin/login", url.origin).toString());
  }
  return { email: user.email };
}

async function musicianAuthMiddleware({ request }: { request: Request }) {
  const user = await verifySession(request, "musician");
  if (!user) {
    const url = new URL(request.url);
    return Response.redirect(new URL("/musician/login", url.origin).toString());
  }
  return { email: user.email, userId: user.id };
}

const app = defineApp([
  setCommonHeaders(),
  ({ ctx }) => {
    ctx;
  },

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

  route("/api/musician/profile", ({ request }: { request: Request }) =>
    handleMusicianProfileApi(request)
  ),
  route("/api/musician/avatar", ({ request }: { request: Request }) =>
    handleMusicianAvatarApi(request)
  ),

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
      return <AdminUsersPage email={auth.email} />;
    }),

    route("/admin/gallery", async ({ request }: { request: Request }) => {
      const auth = await adminAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return <AdminGalleryPage email={auth.email} />;
    }),

    route("/musician/login", () => <MusicianLoginClient />),

    route("/musician/profile", async ({ request }: { request: Request }) => {
      const auth = await musicianAuthMiddleware({ request });
      if (auth instanceof Response) return auth;
      return (
        <MusicianLayout email={auth.email}>
          <MusicianProfileClient userId={auth.userId} />
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
