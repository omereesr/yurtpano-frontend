// Service worker'i kaydeder. Tarayici desteklemiyorsa (cok eski tarayicilar)
// sessizce atlar - PWA olmadan da uygulama normal calismaya devam eder.
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Service worker kaydi basarisiz:', err)
    })
  })
}
