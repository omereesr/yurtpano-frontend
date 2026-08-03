// YurtPano Service Worker
//
// Bu dosyanin iki gorevi var:
// 1) Uygulamayi "yuklenebilir" (installable) PWA yapmak - tarayicinin/
//    Android'in "Ana Ekrana Ekle" onerisini gosterebilmesi icin bir
//    service worker'in kayitli olmasi sart.
// 2) Ileride GERCEK push bildirimleri eklenince (VAPID key + backend
//    abonelik ucu) kullanilacak 'push' ve 'notificationclick' olay
//    dinleyicilerinin temelini hazir birakmak.
//
// Su an TAM bir "offline-first" cache stratejisi kurmuyoruz (uygulama
// gercek zamanli veriye dayandigi icin agresif cache'leme yanlis bilgi
// gosterebilir) - sadece app-shell'in (statik dosyalarin) temel bir
// cache'ini tutuyoruz.

const CACHE_NAME = "yurtpano-shell-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Sadece GET isteklerinde ve sadece app-shell dosyalarinda basit bir
// "once cache'e bak, yoksa aga git" stratejisi. API cagrilari (/api/...)
// her zaman aga gider - gercek zamanli veri asla cache'den gelmemeli.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return; // API'ye hic dokunma

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// --- Ileride gercek push bildirimleri icin hazir altyapi ---
// Backend'e VAPID key + abonelik ucu eklenince, bu olay dinleyicisi
// gelen push mesajini gercek bir bildirime cevirecek. Su an backend
// hicbir push gondermedigi icin bu kod "dormant" (uykuda) duruyor.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "YurtPano", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "YurtPano", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: payload.url || "/",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
