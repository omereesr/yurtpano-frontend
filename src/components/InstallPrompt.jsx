import { useEffect, useState } from 'react'

// Chrome/Android, sayfa "yuklenebilir" (installable) kriterlerini
// karsilayinca 'beforeinstallprompt' olayini tetikler. Bu olayi yakalayip
// tarayicinin otomatik (ve genelde kotu zamanlanmis) banner'ini engelliyoruz,
// bunun yerine kendi zamanimizda kucuk bir "Uygulamayi Yukle" karti gosteriyoruz.
//
// NOT: iOS Safari bu API'yi desteklemiyor - iOS kullanicilari "Paylas" >
// "Ana Ekrana Ekle" yolunu elle kullanmali (App Store disi PWA kurulumu
// iOS'ta boyle calisir, bizim kontrolumuzde degil).
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('yurtpano_install_dismissed') === '1')
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    function handleBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    function handleInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (!deferredPrompt || dismissed || installed) return null

  async function handleInstall() {
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setDismissed(true)
    sessionStorage.setItem('yurtpano_install_dismissed', '1')
  }

  return (
    <div className="install-prompt">
      <span>📲 YurtPano'yu telefonuna ana ekran uygulaması olarak ekle</span>
      <div className="install-prompt-actions">
        <button className="btn-primary" onClick={handleInstall}>
          Yukle
        </button>
        <button className="btn-link" onClick={handleDismiss}>
          Simdi degil
        </button>
      </div>
    </div>
  )
}
