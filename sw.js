/* AMOH JUSTICE AI PWA service worker.
   The installed app is the same secure website; keep its assistant UI assets
   available while ensuring pages and all API/account requests stay fresh. */
const CACHE = 'amoh-justice-ai-v46';
const APP_SHELL = [
  '/', '/index.html', '/style.css', '/v2.css', '/script.js',
  '/manifest.webmanifest', '/office-photo.png', '/logo.svg',
  '/icon-192.png', '/icon-512.png', '/justice-ai-floating.css',
  '/justice-ai-floating.js', '/justice-chat-history.js',
  '/justice-ai-tools.js', '/justice-suite.css', '/justice-suite.js', '/voice-chat.js', '/justice-phone-commands.js', '/pwa-install.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('amoh-justice-ai-') && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Never cache cross-origin requests, writes, API calls, or authenticated data.
  if (url.origin !== self.location.origin ||
      request.method !== 'GET' ||
      url.pathname.startsWith('/api/') ||
      request.headers.has('authorization')) return;

  // Fetch page navigations fresh so installed users receive the latest app.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then(cached => cached || Response.error()))
    );
    return;
  }

  // Cache static same-origin assets, but never private or no-store responses.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        const cacheControl = response.headers.get('Cache-Control') || '';
        if (response.ok && !/no-store|private/i.test(cacheControl)) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => Response.error());
    })
  );
});
