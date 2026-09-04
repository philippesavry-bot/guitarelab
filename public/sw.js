// Worker de nettoyage : remplace l'ancien service worker « cache first » qui
// servait indéfiniment une version périmée de l'application installée sur
// l'écran d'accueil. Il vide ses propres caches, recharge les onglets ouverts,
// puis se désenregistre définitivement.
const OWN_CACHES = ['guitar-lab-cache-v1'];

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        await Promise.allSettled(
          names.filter((n) => OWN_CACHES.includes(n)).map((n) => caches.delete(n)),
        );
        await self.clients.claim();
        const windows = await self.clients.matchAll({ type: 'window' });
        await Promise.allSettled(windows.map((c) => c.navigate(c.url)));
      } finally {
        // Obligatoire dans finally : « activate » ne se déclenche qu'une fois.
        await self.registration.unregister();
      }
    })(),
  ),
);
