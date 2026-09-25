   const cacheName = 'task-reminder-v1';
   const assetsToCache = ['index.html', 'manifest.json', 'icon-192.png'];

   self.addEventListener('install', (event) => {
     event.waitUntil(
       caches.open(cacheName).then((cache) => cache.addAll(assetsToCache))
     );
   });

   self.addEventListener('fetch', (event) => {
     event.respondWith(
       caches.match(event.request).then((response) => response || fetch(event.request))
     );
   });
