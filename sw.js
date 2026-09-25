// Service Worker for TASK_SYSTEM PWA
const CACHE_VERSION = 'task-sys-v1.0.0';
const CACHE_NAME = `${CACHE_VERSION}`;

// ไฟล์ที่ต้อง cache ไว้ใช้ตอน offline
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ===== ติดตั้ง =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Precache partial fail', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ===== เปิดใช้งาน =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// ===== Fetch (offline-first) =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // ข้าม cross-origin (เช่น Google Fonts) - ใช้ network ตามปกติ
  if (url.origin !== location.origin) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // ใช้ cache-first สำหรับไฟล์ของเรา
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ===== เก็บ tasks ที่ sync มาจากหน้าเว็บ =====
let TASKS = [];
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'SYNC_TASKS') {
    TASKS = data.tasks || [];
    console.log('[SW] Tasks synced:', TASKS.length);
  }

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ===== Periodic Background Sync (Chrome/Edge บน Android) =====
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-tasks') {
    event.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify() {
  const now = new Date();
  const nowStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');

  for (const t of TASKS) {
    if (t.done || !t.time24) continue;
    if (t.time24 === nowStr) {
      await self.registration.showNotification('⏰ ถึงเวลางาน!', {
        body: `${t.text}\n(${t.timeThai || t.time24})`,
        tag: 'task-' + t.id,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        icon: './icon-192.png',
        badge: './icon-192.png',
        data: { taskId: t.id }
      });
    }
  }
}

// ===== แจ้งเตือนจาก push (เผื่ออนาคต) =====
self.addEventListener('push', (event) => {
  let data = { title: 'TASK_SYSTEM', body: 'มีการแจ้งเตือนใหม่' };
  try { if (event.data) data = event.data.json(); } catch(e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icon-192.png',
      badge: './icon-192.png',
      vibrate: [200, 100, 200]
    })
  );
});

// ===== คลิกที่ notification =====
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});
