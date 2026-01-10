import { env } from "cloudflare:workers";
import { invalidateCache } from "@/lib/cache";

export async function handleGuestbookSubmission(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await request.formData();
    const firstName = formData.get("first_name") as string;
    const lastName = formData.get("last_name") as string;
    const message = formData.get("message") as string;

    if (!firstName || !lastName || !message) {
      return new Response("Missing required fields", { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];

    await env.DB.prepare(
      "INSERT INTO guestbook (first_name, last_name, message, date) VALUES (?, ?, ?, ?)"
    )
      .bind(firstName, lastName, message, today)
      .run();

    await invalidateCache();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Guestbook submission error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
