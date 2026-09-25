const CACHE_NAME = 'task-system-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

// ติดตั้ง Service Worker และทำ Caching ไฟล์
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ดึงข้อมูลจาก Cache เมื่อ Offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// อัปเดต Cache เวอร์ชันใหม่
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});
