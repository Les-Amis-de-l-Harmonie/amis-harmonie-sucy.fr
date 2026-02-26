import { env } from "cloudflare:workers";
import { CACHE_CONFIG } from "./constants";

const CACHE_VERSION_KEY = "cache_version";
const CACHE_TTL = 60 * 60 * 24;

const BUILD_VERSION = import.meta.env.BUILD_VERSION || "dev";

export async function getCacheVersion(): Promise<string> {
  const dataVersion = (await env.CACHE.get(CACHE_VERSION_KEY)) || "0";
  return `${BUILD_VERSION}-${dataVersion}`;
}

export async function invalidateCache(): Promise<void> {
  const currentVersion = (await env.CACHE.get(CACHE_VERSION_KEY)) || "0";
  const newVersion = (parseInt(currentVersion, 10) + 1).toString();
  await env.CACHE.put(CACHE_VERSION_KEY, newVersion);
}

function getCacheKey(url: string, version: string): string {
  const urlObj = new URL(url);
  return `page:${urlObj.pathname}:v${version}`;
}

export async function getCachedResponse(request: Request): Promise<Response | null> {
  if (request.method !== "GET") {
    return null;
  }

  const version = await getCacheVersion();
  const cacheKey = getCacheKey(request.url, version);

  const cached = await env.CACHE.get(cacheKey, { type: "arrayBuffer" });
  if (!cached) {
    return null;
  }

  const headersJson = await env.CACHE.get(`${cacheKey}:headers`);
  const headers = new Headers(headersJson ? JSON.parse(headersJson) : {});
  headers.set("X-Cache", "HIT");
  headers.set("X-Cache-Version", version);

  return new Response(cached, { status: 200, headers });
}

export async function cacheResponse(request: Request, response: Response): Promise<Response> {
  if (
    request.method !== "GET" ||
    response.status !== 200 ||
    !response.headers.get("content-type")?.includes("text/html")
  ) {
    return response;
  }

  const version = await getCacheVersion();
  const cacheKey = getCacheKey(request.url, version);

  const responseClone = response.clone();
  const body = await responseClone.arrayBuffer();

  await env.CACHE.put(cacheKey, body, { expirationTtl: CACHE_TTL });

  const headersToCache: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    if (!["content-length", "content-encoding", "transfer-encoding"].includes(key.toLowerCase())) {
      headersToCache[key] = value;
    }
  });
  await env.CACHE.put(`${cacheKey}:headers`, JSON.stringify(headersToCache), {
    expirationTtl: CACHE_TTL,
  });

  const newHeaders = new Headers(response.headers);
  newHeaders.set("X-Cache", "MISS");
  newHeaders.set("X-Cache-Version", version);
  newHeaders.set(
    "Cache-Control",
    `public, max-age=${CACHE_CONFIG.MAX_AGE_SECONDS}, s-maxage=${CACHE_CONFIG.TTL_SECONDS}, stale-while-revalidate=${CACHE_CONFIG.STALE_WHILE_REVALIDATE_SECONDS}`
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export function shouldCachePath(pathname: string): boolean {
  return (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/musician") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/images/r2")
  );
}
