const CACHE_NAME = "birth-pwa-v5";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png"
];

// تثبيت السيرفيس ووركر وتخزين ملفات الهيكل الأساسي
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).catch((err) => console.warn("SW: App Shell caching issue", err))
  );
});

// تفعيل السيرفيس ووركر وحذف الإصدارات القديمة من الكاش
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

// اعتراض الطلبات
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // استثناء طلبات الـ API ومسارات الرفع والمسارات غير التابعة للموقع
  if (req.method !== "GET" || url.pathname.startsWith("/api/") || url.origin !== self.location.origin) {
    return;
  }

  // دعم تنقل صفحات الـ React Router أثناء انقطاع الإنترنت (SPA Offline Navigation)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => {
        return caches.match("/index.html").then((response) => {
          return response || caches.match("/offline.html");
        });
      })
    );
    return;
  }

  // استراتيجية Cache First مع Network Fallback لملفات الـ Static Assets
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // في حال فشل جلب صورة ما أثناء عدم الاتصال
        if (req.destination === "image") {
          return caches.match("/icon-192.png");
        }
      });
    })
  );
});