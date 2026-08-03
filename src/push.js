import { api } from './api'

// VAPID genel anahtari base64url formatinda gelir, Push API'nin istedigi
// Uint8Array formatina cevirmemiz gerekiyor - bu standart bir donusum.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Kullanici "push bildirimlerini ac" dediginde cagrilir: tarayicidan izin
// ister, service worker uzerinden abone olur, aboneligi backend'e kaydeder.
export async function enablePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Bu tarayici push bildirimlerini desteklemiyor.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Bildirim izni verilmedi.')
  }

  const { publicKey } = await api.push.getVapidKey()
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })

  const json = subscription.toJSON()
  await api.push.subscribe({ endpoint: json.endpoint, keys: json.keys })
  return true
}

// Kullanici "push bildirimlerini kapat" dediginde cagrilir.
export async function disablePushNotifications() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await api.push.unsubscribe(subscription.endpoint).catch(() => {})
    await subscription.unsubscribe()
  }
}

// Su an bu cihazda push bildirimlerinin acik olup olmadigini kontrol eder.
export async function isPushEnabled() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return !!subscription
}
