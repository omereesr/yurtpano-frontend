import { useEffect } from 'react'

// Bir ekrani (konusma penceresi, grup sohbeti vb.) cihazin GORUNUR
// alanina tam oturtan hook - klavye acildiginda/kapandiginda otomatik
// guncellenir. Hem MessagesTab (1-1 konusma) hem GroupChatView (grup
// sohbeti) tarafindan ortak kullaniliyor.
export default function useFixedViewport(ref) {
  useEffect(() => {
    function sync() {
      if (!ref.current) return
      const vv = window.visualViewport
      const el = ref.current
      el.style.position = 'fixed'
      el.style.left = '0px'
      el.style.right = '0px'
      // width/max-width'i INLINE olarak sifirliyoruz - CSS sinifinda
      // kalintı "width:100%" gibi bir deger olsa bile (position:fixed'te
      // left+right+width ayni anda olunca "right" yok sayilir kuralindan
      // dolayi) artik hicbir sekilde etkili olamaz.
      el.style.width = 'auto'
      el.style.maxWidth = 'none'
      el.style.margin = '0px'
      el.style.zIndex = '200'
      if (vv) {
        el.style.top = `${vv.offsetTop}px`
        el.style.height = `${vv.height}px`
      } else {
        el.style.top = '0px'
        el.style.height = `${window.innerHeight}px`
      }
    }
    sync()
    window.visualViewport?.addEventListener('resize', sync)
    window.visualViewport?.addEventListener('scroll', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      window.visualViewport?.removeEventListener('resize', sync)
      window.visualViewport?.removeEventListener('scroll', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [ref])
}
