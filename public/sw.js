// Service worker disabled - unregisters itself immediately to prevent redirect loops
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Delete all caches
      caches.keys().then((cacheNames) =>
        Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      ),
      // Unregister this service worker
      self.registration.unregister(),
    ])
  )
})

// Do NOT intercept any fetch requests
// self.addEventListener('fetch', ...) - intentionally omitted