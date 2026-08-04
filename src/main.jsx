import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { registerServiceWorker } from './registerSW.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

registerServiceWorker()

// CSS'teki "100dvh" birimi bazi mobil tarayicilarda klavye acilinca
// (yazilim klavyesi) tam dogru kucalmiyor - bu, yazma kutusunun klavyenin
// biraz USTUNDE bosluklu kalmasina sebep oluyordu. VisualViewport API,
// klavye acikken GERCEKTEN gorunen alani (--app-vh) verir; bunu dinleyip
// bir CSS degiskenine yaziyoruz, styles.css'te .app-shell bunu kullaniyor.
function updateAppHeight() {
  const h = window.visualViewport ? window.visualViewport.height : window.innerHeight
  document.documentElement.style.setProperty('--app-vh', `${h}px`)
}
if (typeof window !== 'undefined') {
  updateAppHeight()
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateAppHeight)
    window.visualViewport.addEventListener('scroll', updateAppHeight)
  } else {
    window.addEventListener('resize', updateAppHeight)
  }
}
