/* eslint-env serviceworker */
const CACHE_NAME = 'shareledger-cache-v1';
const PRECACHE_URLS = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // API 요청은 Service Worker가 처리하지 않음 (CORS 이슈 방지)
  const url = new URL(request.url);
  if (url.origin !== location.origin) {
    return;
  }

  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone();
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(request, responseClone))
          .catch(() => undefined);
        return response;
      })
      .catch(() =>
        caches
          .match(request)
          .then((cachedResponse) => cachedResponse || Promise.reject(new Error('Network error'))),
      ),
  );
});
