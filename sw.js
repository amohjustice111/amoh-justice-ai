const CACHE='amoh-justice-ai-v16';
const FILES=['/','/index.html','/style.css','/script.js','/office-photo.png','/manifest.webmanifest','/icon-192.png','/icon-512.png','/justice-ai-floating.css','/justice-ai-floating.js','/voice-chat.js','/v2.css','/justice-ai-floating.css?v=2'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Never cache API requests or responses: task status, account data, and AI
  // responses must always reach the server and respect Cache-Control: no-store.
  if (url.origin !== self.location.origin ||
      request.method !== 'GET' ||
      url.pathname.startsWith('/api/') ||
      request.headers.has('authorization')) {
    return;
  }

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
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match('/index.html');
        return Response.error();
      });
    })
  );
});
