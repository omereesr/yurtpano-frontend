import { useEffect, useState } from 'react'

// Chrome/Android, sayfa "yuklenebilir" (installable) kriterlerini
// karsilayinca 'beforeinstallprompt' olayini tetikler. Bu olayi yakalayip
// tarayicinin otomatik (ve genelde kotu zamanlanmis) banner'ini engelliyoruz,
// bunun yerine kendi zamanimizda kucuk bir "Uygulamayi Yükle" karti gosteriyoruz.
//
// ONEMLI BUG DUZELTMESI: iOS Safari 'beforeinstallprompt' API'sini HIC
// DESTEKLEMIYOR - onceden bu yuzden iOS kullanicilarina HICBIR SEY
// gosterilmiyordu, sessizce hicbir oneri cikmiyordu. Bu ciddi bir sonuc
// doguruyor: iOS'ta ARKA PLANDA (uygulama kapaliyken) push bildirimi
// almanin TEK yolu, siteyi "Ana Ekrana Ekle" ile yuklemek - bunu
// yapmayan iOS kullanicilari SADECE uygulama acikken bildirim
// alabiliyor. Artik iOS kullanicilarina ELLE talimat gosteriyoruz.
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('yurtpano_install_dismissed') === '1')
  const [installed, setInstalled] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)

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

    // iOS'ta 'beforeinstallprompt' hic gelmeyecegi icin, kendimiz tespit
    // edip (zaten yuklu degilse) elle talimat kartini gosteriyoruz.
    if (isIOS() && !isStandalone()) {
      setShowIosGuide(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  if (dismissed || installed) return null
  if (!deferredPrompt && !showIosGuide) return null

  async function handleInstall() {
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setDismissed(true)
    sessionStorage.setItem('yurtpano_install_dismissed', '1')
  }

  if (showIosGuide) {
    return (
      <div className="install-prompt">
        <span>
          📲 <strong>Bildirimleri kaçırmamak için:</strong> altta paylaş ikonuna (
          <span aria-hidden="true">⬆️</span>) dokun, sonra <strong>"Ana Ekrana Ekle"</strong> seç.
          iPhone'da bildirimler ancak böyle çalışıyor.
        </span>
        <div className="install-prompt-actions">
          <button className="btn-link" onClick={handleDismiss}>
            Anladım
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="install-prompt">
      <span>📲 YurtPano'yu telefonuna ana ekran uygulaması olarak ekle</span>
      <div className="install-prompt-actions">
        <button className="btn-primary" onClick={handleInstall}>
          Yükle
        </button>
        <button className="btn-link" onClick={handleDismiss}>
          Simdi degil
        </button>
      </div>
    </div>
  )
}
