import { env } from "cloudflare:workers";
import { CACHE_CONFIG } from "./env-config";
import { logger } from "./logger";

const CACHE_VERSION_KEY = "cache_version";
const CACHE_TTL = 60 * 60 * 24;

const BUILD_VERSION = import.meta.env.BUILD_VERSION || "dev";

// KV reads are already edge-cached for up to 60 s, so memoising the version in the
// isolate for the same duration does not make invalidation any slower in practice,
// while removing one KV read per request.
const VERSION_MEMO_TTL_MS = 60 * 1000;
// After a KV failure (e.g. daily quota exceeded on the free plan), skip the page
// cache for a while: pages are rendered normally instead of crashing the Worker.
const KV_FAILURE_COOLDOWN_MS = 60 * 1000;

let versionMemo: { value: string; expiresAt: number } | null = null;
let kvDisabledUntil = 0;

function isKvAvailable(): boolean {
  return Date.now() >= kvDisabledUntil;
}

function handleKvFailure(operation: string, error: unknown): void {
  const alreadyDisabled = !isKvAvailable();
  kvDisabledUntil = Date.now() + KV_FAILURE_COOLDOWN_MS;
  if (!alreadyDisabled) {
    logger.warn("Cache KV indisponible, rendu sans cache", {
      operation,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function readDataVersion(): Promise<string> {
  const now = Date.now();
  if (versionMemo && versionMemo.expiresAt > now) {
    return versionMemo.value;
  }
  const value = (await env.CACHE.get(CACHE_VERSION_KEY)) || "0";
  versionMemo = { value, expiresAt: now + VERSION_MEMO_TTL_MS };
  return value;
}

export async function getCacheVersion(): Promise<string> {
  const dataVersion = await readDataVersion();
  return `${BUILD_VERSION}-${dataVersion}`;
}

export async function invalidateCache(): Promise<void> {
  try {
    const currentVersion = (await env.CACHE.get(CACHE_VERSION_KEY)) || "0";
    const newVersion = (parseInt(currentVersion, 10) + 1).toString();
    await env.CACHE.put(CACHE_VERSION_KEY, newVersion);
    versionMemo = { value: newVersion, expiresAt: Date.now() + VERSION_MEMO_TTL_MS };
  } catch (error) {
    // The data mutation already succeeded; a failed invalidation must not turn it into a 500.
    logger.error("Invalidation du cache impossible", error);
  }
}

function getCacheKey(url: string, version: string): string {
  const urlObj = new URL(url);
  return `page:${urlObj.pathname}:v${version}`;
}

export async function getCachedResponse(request: Request): Promise<Response | null> {
  if (request.method !== "GET" || !isKvAvailable()) {
    return null;
  }

  try {
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
  } catch (error) {
    handleKvFailure("read", error);
    return null;
  }
}

export async function cacheResponse(request: Request, response: Response): Promise<Response> {
  if (
    request.method !== "GET" ||
    response.status !== 200 ||
    !response.headers.get("content-type")?.includes("text/html") ||
    !isKvAvailable()
  ) {
    return response;
  }

  const body = await response.arrayBuffer();
  const newHeaders = new Headers(response.headers);

  try {
    const version = await getCacheVersion();
    const cacheKey = getCacheKey(request.url, version);

    await env.CACHE.put(cacheKey, body, { expirationTtl: CACHE_TTL });

    const headersToCache: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      if (
        !["content-length", "content-encoding", "transfer-encoding"].includes(key.toLowerCase())
      ) {
        headersToCache[key] = value;
      }
    });
    await env.CACHE.put(`${cacheKey}:headers`, JSON.stringify(headersToCache), {
      expirationTtl: CACHE_TTL,
    });

    newHeaders.set("X-Cache", "MISS");
    newHeaders.set("X-Cache-Version", version);
    newHeaders.set(
      "Cache-Control",
      `public, max-age=${CACHE_CONFIG.MAX_AGE_SECONDS}, s-maxage=${CACHE_CONFIG.TTL_SECONDS}, stale-while-revalidate=${CACHE_CONFIG.STALE_WHILE_REVALIDATE_SECONDS}`
    );
  } catch (error) {
    handleKvFailure("write", error);
  }

  return new Response(body, {
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
    !pathname.startsWith("/images/r2") &&
    // Paths ending with a file extension (/wp-login.php, /.env, …) are never HTML pages:
    // mostly bot probes, which should not spend KV reads.
    !/\.[a-z0-9]+$/i.test(pathname)
  );
}
