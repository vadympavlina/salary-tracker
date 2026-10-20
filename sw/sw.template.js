/* Generated at build time by vite.config.ts — do not edit dist/sw.js directly. */
const VERSION = '__VERSION__';
const CACHE = `salary-tracker-${VERSION}`;
const PRECACHE = __PRECACHE__;

// cache: 'reload' bypasses the browser's HTTP cache (GitHub Pages sends max-age=600): the
// precached shell must be the HTML of *this* build, or offline start points at missing assets.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map((p) => new Request(new URL(p, self.registration.scope), { cache: 'reload' })))),
  );
  // No skipWaiting here: an open page keeps the version (and cached chunks) it started with until
  // the user taps "Оновити" (message below) or closes the app. The very first install activates at once.
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('salary-tracker-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // App shell: network first so new deploys show up, cached shell when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      // no-cache: revalidate with the server, never take a stale index.html from the HTTP cache.
      fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' })
        .then((res) => {
          // GitHub Pages answers deep links with 404.html (same SPA shell) — still a valid page.
          if (res.ok || res.status === 404) return res;
          throw new Error('bad response');
        })
        .catch(() => caches.match(new URL('./', self.registration.scope).toString(), { ignoreVary: true })),
    );
    return;
  }

  // Hashed build assets never change under the same URL: cache first.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      // ignoreVary: the precache was filled without the Origin header a module/CSS request carries;
      // with a `Vary: Origin` (or Accept-Encoding) response the lookup would miss and fail offline.
      caches.match(request, { ignoreVary: true }).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              event.waitUntil(caches.open(CACHE).then((cache) => cache.put(request, copy)));
            }
            return res;
          }),
      ),
    );
    return;
  }

  // Everything else (icons, manifest, favicons) is left to the browser untouched, exactly
  // like a site without a service worker — iOS reads the home-screen icon straight from the network.
});
