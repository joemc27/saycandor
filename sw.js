const CACHE = 'candor-v1';

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&family=DM+Sans:wght@300;400;500&display=swap'
];

// Install: pre-cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      // Cache what we can — font CDN may fail in some environments, that's fine
      return Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for same-origin, network-first for fonts/external
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Same-origin: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, clone));
          return response;
        }).catch(() => {
          // Offline fallback: serve root for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/') || caches.match('/index.html');
          }
        });
      })
    );
    return;
  }

  // External (fonts, etc.): network-first with cache fallback
  event.respondWith(
    fetch(request).then(response => {
      if (!response || response.status !== 200) return response;
      const clone = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, clone));
      return response;
    }).catch(() => caches.match(request))
  );
});
