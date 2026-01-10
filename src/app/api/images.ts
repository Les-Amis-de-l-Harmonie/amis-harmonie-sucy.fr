import { env } from "cloudflare:workers";

export async function handleImageServing(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace("/images/r2/", "");

  if (!path) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const object = await env.R2.get(path);

    if (!object) {
      return new Response("Not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", object.httpMetadata?.contentType || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("ETag", object.etag);

    return new Response(object.body, { headers });
  } catch (error) {
    console.error("Image serving error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
