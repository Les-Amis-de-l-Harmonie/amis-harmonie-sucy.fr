import { env } from "cloudflare:workers";

export async function handleContactSubmission(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await request.formData();
    const nom = formData.get("nom") as string;
    const prenom = formData.get("prenom") as string;
    const email = formData.get("email") as string;
    const message = formData.get("message") as string;

    if (!nom || !prenom || !email || !message) {
      return new Response("Missing required fields", { status: 400 });
    }

    await env.DB.prepare(
      "INSERT INTO contact_submissions (nom, prenom, email, message) VALUES (?, ?, ?, ?)"
    )
      .bind(nom, prenom, email, message)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Contact submission error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
