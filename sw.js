const CACHE_NAME = "syllabus-tracker-v1";

// All assets to cache on install
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800;900&display=swap",
  "https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js",
  "https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js",
  "https://cdn.jsdelivr.net/npm/@babel/standalone/babel.min.js"
];

// Install: pre-cache app shell
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache local files reliably; external CDN files best-effort
      const local = PRECACHE.filter(u => u.startsWith("./") || u.startsWith("/"));
      const cdn   = PRECACHE.filter(u => u.startsWith("http"));
      return Promise.all([
        cache.addAll(local),
        ...cdn.map(url =>
          cache.add(url).catch(() => { /* CDN may fail; that's ok */ })
        )
      ]);
    }).then(() => self.skipWaiting())
  );
});

// Activate: delete old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for same-origin + CDN fonts/scripts, network-first for everything else
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET
  if (request.method !== "GET") return;

  // Cache-first strategy for app shell + CDN assets
  const isCacheable =
    url.origin === self.location.origin ||
    url.hostname.includes("cdn.jsdelivr.net") ||
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com");

  if (isCacheable) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return response;
        }).catch(() => caches.match("./index.html")); // offline fallback
      })
    );
  }
});
