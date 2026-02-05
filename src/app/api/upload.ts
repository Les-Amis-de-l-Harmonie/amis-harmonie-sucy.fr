import { env } from "cloudflare:workers";
import { verifySession } from "./auth";

function validateFileSignature(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 4) {
    return null;
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }

  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "png";
  }

  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    return "webp";
  }

  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "gif";
  }

  return null;
}

export async function handleImageUpload(request: Request): Promise<Response> {
  const session = await verifySession(request);
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "events";

    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return new Response(JSON.stringify({ error: "File too large. Max 10MB" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await file.arrayBuffer();

    const detectedType = validateFileSignature(arrayBuffer);
    if (!detectedType) {
      return new Response(
        JSON.stringify({ error: "Invalid file format. Only images are allowed." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const allowedFolders = ["events", "gallery", "avatars", "publications"];
    if (!allowedFolders.includes(folder)) {
      return new Response(JSON.stringify({ error: "Invalid folder" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ext = detectedType === "jpeg" ? "jpg" : detectedType;
    const filename = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const contentTypeMap: Record<string, string> = {
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };

    await env.R2.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: contentTypeMap[detectedType],
      },
    });

    const publicUrl = `/images/r2/${filename}`;

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
