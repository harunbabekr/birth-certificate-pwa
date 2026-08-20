const CACHE_NAME = "birth-pwa-v6";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
];

// تثبيت السيرفيس ووركر وتخزين ملفات الهيكل الأساسي
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn("SW: App Shell caching issue", err))
  );
});

// تفعيل السيرفيس ووركر وحذف الإصدارات القديمة من الكاش فوراً
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        );
      })
      .then(() => self.clients.claim())
  );
});

// اعتراض الطلبات
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // استثناء طلبات الـ API وأي استدعاء غير GET أو نطاقات خارجية
  if (
    req.method !== "GET" ||
    url.pathname.startsWith("/api/") ||
    url.origin !== self.location.origin
  ) {
    return;
  }

  // دعم تنقل صفحات الـ React Router أثناء انقطاع الإنترنت (SPA Offline Navigation)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedPage =
          (await cache.match("/index.html")) ||
          (await cache.match("/offline.html"));
        return (
          cachedPage ||
          new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "Content-Type": "text/html; charset=utf-8" },
          })
        );
      })
    );
    return;
  }

  // استراتيجية Cache First مع Network Fallback وإرجاع Response صالح دائماً
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(req)
        .then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // التعامل مع الصور المفقودة أوفلاين
          if (req.destination === "image") {
            const fallbackImg = await caches.match("/icon-192.png");
            if (fallbackImg) return fallbackImg;
          }

          // إرجاع استجابة 404 صالحة لمنع انهيار الـ Promise
          return new Response(null, {
            status: 404,
            statusText: "Resource Not Found",
          });
        });
    })
  );
});