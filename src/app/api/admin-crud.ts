import { verifySession } from "./auth";
import { isAdmin } from "@/db/types";

export interface EventInput {
  title: string;
  image?: string | null;
  location?: string | null;
  description?: string | null;
  date: string;
  time?: string | null;
  price?: string | null;
  details_link?: string | null;
  reservation_link?: string | null;
}

export interface PublicationInput {
  instagram_post_id: string;
  thumbnail?: string | null;
  publication_date?: string | null;
}

export async function checkAdminAuth(request: Request): Promise<Response | null> {
  const user = await verifySession(request, "admin");
  if (!user || !isAdmin(user.role)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
