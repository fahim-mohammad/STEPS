self.addEventListener('install', e => e.waitUntil(caches.open('steps-v1')));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));