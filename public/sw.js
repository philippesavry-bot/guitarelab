const CACHE_NAME = 'guitar-lab-v3';
const URLS_TO_CACHE = [
  './',
  './guitar-lab.html',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://cdn.jsdelivr.net/npm/lucide@latest',
  'https://unpkg.com/tone@14.8.49/build/Tone.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
];

// Installation : mettre en cache les ressources statiques
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📦 Mise en cache des ressources offline');
      // Cache seulement les URLs locales, pas les CDN (ils sont chargés à la demande)
      return cache.addAll(['./', './guitar-lab.html']).catch(() => {});
    }).then(() => self.skipWaiting())
  );
});

// Activation : nettoyer les anciennes versions du cache
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('🗑️ Suppression cache ancien :', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch : stratégie "network first, fallback to cache"
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') return;

  // Requêtes API/IndexedDB : garder le réseau
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    return; // Pas d'intervention
  }

  // Stratégie : essayer le réseau, fallback sur le cache
  event.respondWith(
    fetch(request)
      .then(response => {
        // Cacher les réponses réussies
        if (response.status === 200) {
          const cache = caches.open(CACHE_NAME);
          cache.then(c => c.put(request, response.clone()));
        }
        return response;
      })
      .catch(() => {
        // Réseau indisponible : chercher en cache
        return caches.match(request).then(response => {
          if (response) {
            console.log('📡 Offline : utilisation cache pour', request.url);
            return response;
          }
          // Pas en cache : page offline
          if (request.mode === 'navigate') {
            return caches.match('./guitar-lab.html');
          }
          return new Response('Ressource non disponible en offline', { status: 503 });
        });
      })
  );
});
