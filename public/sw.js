const CACHE_NAME = 'lamargarita-v2';
const urlsToCache = [
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json'
];

// Install: cachear assets estáticos
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)).catch(() => {})
  );
});

// Fetch: SOLO cachear GET de assets estáticos. Nunca interceptar
// la API, el login, ni navegaciones (para no romper datos en vivo).
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Dejar pasar normalmente: métodos != GET, otra origin, API, y navegaciones HTML.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    request.mode === 'navigate'
  ) {
    return; // el navegador maneja la request sin el service worker
  }

  // Para assets estáticos: cache-first con fallback a red (sin romper si falla).
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).catch(() => cached);
    })
  );
});

// Activate: limpiar caches viejos y tomar control
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
    )
  );
  self.clients.claim();
});
