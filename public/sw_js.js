const CACHE_NAME = 'guitar-lab-v4';

// Ressources locales indispensables pour afficher l'app hors connexion.
// Les ressources CDN (React, Tailwind, Babel, Lucide, Tone.js, pdf.js...) ne sont PAS listées ici :
// elles sont mises en cache automatiquement "à la volée" par le gestionnaire fetch ci-dessous, dès leur
// premier chargement réussi — inutile de maintenir une liste séparée et de la faire vieillir à chaque ajout.
const CORE_URLS = ['./', './guitar-lab.html'];

// Installation : met en cache le strict nécessaire pour démarrer hors ligne.
// Chaque URL est mise en cache individuellement : un éventuel échec sur l'une (ex. './' selon l'hébergeur)
// n'empêche plus la mise en cache de l'autre — avec cache.addAll(), un seul échec annulait tout, en silence.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      await Promise.all(
        CORE_URLS.map(url => cache.add(url).catch(err => console.warn('📦 Échec mise en cache de', url, err)))
      );
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

// Fetch : stratégie "network first, fallback cache" — s'applique désormais AUSSI aux ressources cross-origin
// (CDN), pas seulement aux fichiers locaux. C'était la principale raison pour laquelle rien ne fonctionnait
// hors connexion : React/Tailwind/Babel/Tone.js/pdf.js étaient auparavant explicitement exclus du cache.
self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/')) return; // jamais de cache pour d'éventuels appels API

  event.respondWith(
    fetch(request)
      .then(response => {
        // Ressources à mettre en cache : réponses classiques réussies (200) ET réponses "opaques"
        // (ressources cross-origin chargées sans l'attribut crossorigin — Tailwind, Tone.js, pdf.js —
        // dont le statut est toujours 0 côté Service Worker, mais qui restent parfaitement utilisables).
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => {
        // Réseau indisponible : chercher en cache
        return caches.match(request).then(cached => {
          if (cached) {
            console.log('📡 Offline : utilisation cache pour', request.url);
            return cached;
          }
          // Pas en cache : page offline
          if (request.mode === 'navigate') {
            return caches.match('./guitar-lab.html');
          }
          return new Response('Ressource non disponible hors connexion', { status: 503 });
        });
      })
  );
});
