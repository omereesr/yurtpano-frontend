import { io } from 'socket.io-client'

// Backend'in calistigi adres (api.js'deki ile ayni degisken - VITE_BACKEND_URL)
const SOCKET_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000').replace(/\/+$/, '')

let socket = null

// Socket'i tek bir yerden yonetiyoruz ki uygulama boyunca sadece 1 baglanti
// olsun. Token yoksa (giris yapilmadiysa) baglanti kurulmaz.
export function getSocket() {
  const token = localStorage.getItem('yurtpano_token')
  if (!token) return null

  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
    })
  }
  return socket
}

// Cikis yapinca (ya da token degisince) eski baglantiyi kapatiyoruz,
// bir sonraki getSocket() cagrisi yeni token ile temiz bir baglanti acar.
export function closeSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
