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
// ONEMLI (v2'de duzeltilen kritik hata): v1'de ana sayfa (index.html) ilk
// acilista cache'e aliniyor ve HER ZAMAN oradan sunuluyordu. Her yeni
// deploy'da Vite, JS/CSS dosyalarinin adini degistirir (orn. index-abc123.js
// -> index-xyz789.js); eski cache'deki index.html hala eski (artik var
// olmayan) dosya adlarini istedigi icin sayfa BEYAZ EKRANDA kaliyordu.
// Cozum: HTML/navigasyon istekleri artik HER ZAMAN once aga gidiyor
// (network-first), cache'e SADECE cevrimdisiyken (internet yokken)
// basvuruluyor. Statik varlik dosyalari (JS/CSS/resim) zaten Vite
// tarafindan icerik degisince adi degisecek sekilde uretildigi icin
// onlar icin cache-first guvenli.

const CACHE_NAME = "yurtpano-shell-v2"; // v1 -> v2: eski (bozuk) cache'i temizler
const STATIC_ASSETS = ["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch(() => {})
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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return; // API'ye hic dokunma

  // Navigasyon istekleri (sayfa acilisi/yenileme) = HER ZAMAN once aga git.
  // Boylece her deploy sonrasi en guncel index.html + dogru dosya adlari
  // gelir. Sadece gercekten cevrimdisiysan (fetch basarisiz olursa) cache'e
  // (varsa) dusuyoruz.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Statik varliklar (JS/CSS/resim/font): Vite bunlarin adini icerik
  // degisince degistirdigi icin cache-first guvenli ve hizli.
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
