// Service Worker minimal — permet de démarrer l'app même sans cache complet
const CACHE_NAME = 'guitar-lab-cache-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Cache first, fallback to network
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
      .catch(() => caches.match('/'))
  );
});
