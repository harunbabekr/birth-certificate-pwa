export function register() {
  if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;
            installingWorker.onstatechange = () => {
              if (installingWorker.state === "installed") {
                if (navigator.serviceWorker.controller) {
                  console.log("تتوفر نسخة جديدة من النظام، يتم التحديث في الخلفية.");
                } else {
                  console.log("تم تفعيل وضع العمل دون اتصال PWA بنجاح.");
                }
              }
            };
          };
        })
        .catch((error) => {
          console.error("فشل تسجيل الـ Service Worker:", error);
        });
    });
  } else if ("serviceWorker" in navigator) {
    // تسجيل تجريبي في بيئة التطوير
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then(() => console.log("PWA Service Worker جاهز في بيئة التطوير"))
        .catch((err) => console.warn("SW Dev Warn:", err));
    });
  }
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}