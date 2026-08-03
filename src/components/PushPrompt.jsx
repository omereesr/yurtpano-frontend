import { useEffect, useState } from 'react'
import { useToast } from '../context/ToastContext'
import { enablePushNotifications, isPushEnabled } from '../push'

const PROMPTED_KEY = 'yurtpano_push_prompted'

// Kullanici uygulamaya ilk kez girdiginde ("bu cihazda daha once hic
// sorulmadiysa") push bildirimlerini acmak isteyip istemedigini soran
// kart. Cevap ne olursa olsun (Evet/Hayir) bir daha SORULMAZ - localStorage'a
// isaretleniyor. Zaten acik oldu ya da tarayici desteklemiyorsa hic gorunmez.
export default function PushPrompt() {
  const toast = useToast()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function check() {
      if (localStorage.getItem(PROMPTED_KEY)) return // daha once sorulmus
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
      if (Notification?.permission === 'denied') return // tarayicidan zaten engellenmis

      const alreadyOn = await isPushEnabled()
      if (alreadyOn) {
        localStorage.setItem(PROMPTED_KEY, '1') // zaten acik, sormaya gerek yok
        return
      }
      setVisible(true)
    }
    check()
  }, [])

  function dismiss() {
    localStorage.setItem(PROMPTED_KEY, '1')
    setVisible(false)
  }

  async function handleEnable() {
    setLoading(true)
    try {
      await enablePushNotifications()
      toast('Bildirimler acildi 🔔')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
      dismiss()
    }
  }

  if (!visible) return null

  return (
    <div className="install-prompt">
      <span>🔔 Yeni mesaj/ilan geldiginde bildirim almak ister misin?</span>
      <div className="install-prompt-actions">
        <button className="btn-primary" disabled={loading} onClick={handleEnable}>
          {loading ? 'Bekleyin...' : 'Evet, Ac'}
        </button>
        <button className="btn-link" onClick={dismiss}>
          Hayir
        </button>
      </div>
    </div>
  )
}
