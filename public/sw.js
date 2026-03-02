const CACHE_NAME = "balancevisor-v3";
const FONT_CACHE = "balancevisor-fonts-v1";
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/logo.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  OFFLINE_URL,
];

// Install — precache key assets (individually so one failure doesn't block install)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch(() => {
            // Non-critical: skip URLs that fail (e.g. redirects)
          })
        )
      )
    )
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener("activate", (event) => {
  const keepCaches = new Set([CACHE_NAME, FONT_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keepCaches.has(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for navigation, stale-while-revalidate for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and chrome-extension requests
  if (request.method !== "GET" || request.url.startsWith("chrome-extension")) {
    return;
  }

  const url = new URL(request.url);

  // Skip API/auth routes — always network
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/api/")) {
    return;
  }

  // Google Fonts — cache-first (fonts rarely change)
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(FONT_CACHE).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Navigation requests — network first, fall back to cache, then offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets — stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});
