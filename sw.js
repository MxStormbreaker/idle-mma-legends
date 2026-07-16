// Minimal offline-cache service worker for Idle MMA Legends.
// Only useful once this is hosted on a real HTTPS origin — browsers refuse to register service
// workers for sandboxed/preview contexts (like an artifact iframe), so this is inert there.
//
// Strategy: cache-first for the app shell (works fully offline after first load), falling back
// to network for anything not pre-cached. Bump CACHE_NAME whenever you ship a new build so
// returning players actually get the update instead of a stale cached copy forever.
const CACHE_NAME = 'idle-mma-legends-v0.0.85';
const APP_SHELL = [
  './index.html',
  './manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if(event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if(cached) return cached;
      return fetch(event.request).then((response) => {
        // Only cache successful, same-origin responses — avoid caching opaque cross-origin
        // (e.g. Google Fonts) or error responses.
        if(response.ok && response.type === 'basic'){
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached); // offline and not cached: fail gracefully rather than throwing
    })
  );
});
