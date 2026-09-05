// Service Worker "auto-destruction" : les anciennes installations (écran d'accueil iPad)
// re-téléchargent ce fichier ; il vide tous les caches et se désenregistre pour que
// l'app ne soit plus jamais servie depuis une copie figée. Les données (IndexedDB) ne sont pas touchées.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      await self.registration.unregister();
      const list = await self.clients.matchAll({ type: 'window' });
      list.forEach((client) => client.navigate(client.url));
    })(),
  );
});
