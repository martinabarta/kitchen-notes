const CACHE_NAME = 'kitchen-notes-v1';

// Quando il Service Worker viene installato, attiva subito il controllo
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Intercetta tutte le richieste di rete
self.addEventListener('fetch', (event) => {
  // Ignora le richieste non-GET (es. invio dati)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    // 1. Prova prima a scaricare la versione più aggiornata da Internet
    fetch(event.request)
      .then((networkResponse) => {
        // Se la risposta è valida, salva una copia aggiornata nella Cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // 2. Se Internet NON è disponibile (offline), recupera il file dalla Cache
        return caches.match(event.request);
      })
  );
});
