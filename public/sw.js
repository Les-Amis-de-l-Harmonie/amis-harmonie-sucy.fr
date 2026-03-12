const CACHE_NAME = "amis-harmonie-v1";
const STATIC_ASSETS = [
  "/",
  "/about",
  "/harmonie",
  "/videos",
  "/publications",
  "/contact",
  "/adhesion",
  "/livre-or",
  "/images/logo.webp",
  "/images/logo-dark.webp",
];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Skip API requests
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached version or fetch from network
      if (response) {
        return response;
      }

      return fetch(event.request)
        .then((networkResponse) => {
          // Don't cache if not a valid response
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Cache new requests
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse;
        })
        .catch(() => {
          // Return offline fallback if available
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
    })
  );
});
