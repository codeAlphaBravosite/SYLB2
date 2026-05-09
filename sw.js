/* Fixed sw.js — Fix #30: cache name MUST change with each deploy */
const CACHE_NAME = "syllabus-tracker-v5";

const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
  "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700;800;900&display=swap",
  "https://unpkg.com/react@18/umd/react.production.min.js",
  "https://unpkg.com/react-dom@18/umd/react-dom.production.min.js",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      const local = PRECACHE.filter(u => u.startsWith("./") || u.startsWith("/"));
      const cdn   = PRECACHE.filter(u => u.startsWith("http"));
      return Promise.all([
        cache.addAll(local),
        ...cdn.map(url => cache.add(url).catch(() => {}))
      ]);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET") return;
  const isCacheable =
    url.origin === self.location.origin ||
    url.hostname.includes("unpkg.com") ||
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
        }).catch(() => caches.match("./index.html"));
      })
    );
  }
});
