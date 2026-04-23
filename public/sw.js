// STEPS Service Worker - Self-Destruct Version
// Immediately unregisters to fix Safari redirect loop issue

self.addEventListener('install', function(event) {
  // Skip waiting so this activates immediately
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    (async function() {
      // Claim all open clients immediately
      await self.clients.claim();
      // Delete ALL caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(function(n) { return caches.delete(n); }));
      // Unregister this service worker
      await self.registration.unregister();
    })()
  );
});

// CRITICAL: Pass ALL fetch requests straight to network - no caching, no redirects
self.addEventListener('fetch', function(event) {
  event.respondWith(fetch(event.request));
});