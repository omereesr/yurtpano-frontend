// Service worker'i kaydeder. Tarayici desteklemiyorsa (cok eski tarayicilar)
// sessizce atlar - PWA olmadan da uygulama normal calismaya devam eder.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    // updateViaCache: 'none' -> tarayici sw.js dosyasinin KENDISINI de
    // (Cache Storage'daki bizim onbellegimizden AYRI olarak, tarayicinin
    // normal HTTP onbelleginde) eski bir kopyada tutmasin. Bu olmadan,
    // sw.js'i guncellesek bile tarayici eski surumu "onbellekten gecerli"
    // sanip guncellemeyi gec fark edebiliyor.
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).catch((err) => {
      console.error('Service worker kaydi basarisiz:', err)
    })
  })
}
