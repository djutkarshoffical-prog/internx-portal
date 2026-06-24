const CACHE_NAME = 'internx-cache-v6';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './new_logo.png'
];

// Install Event
self.addEventListener('install', event => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch Event - Network First strategy for important files to prevent app caching old UI
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Activate Event (Cleanup old caches)
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim()); // Take control of all pages immediately
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
