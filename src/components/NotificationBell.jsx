import { useEffect, useState } from 'react'
import { api } from '../api'
import { getSocket } from '../socket'

// Sag ustteki zil ikonu. Okunmamis mesaj/istek sayisini backend'den ceker,
// yeni bir mesaj/istek geldiginde (socket event'i) sayiyi tazeler.
export default function NotificationBell({ onOpenMessages }) {
  const [count, setCount] = useState(0)

  async function refresh() {
    try {
      const { unread } = await api.messages.getUnreadCount()
      setCount(unread)
    } catch {
      // sessizce yoksay - zil bildirimi kritik bir ozellik degil
    }
  }

  useEffect(() => {
    refresh()

    const socket = getSocket()
    if (!socket) return
    socket.on('message:new', refresh)
    socket.on('conversation:new', refresh)
    return () => {
      socket.off('message:new', refresh)
      socket.off('conversation:new', refresh)
    }
  }, [])

  return (
    <button type="button" className="notification-bell" onClick={onOpenMessages} title="Mesajlar">
      🔔
      {count > 0 && <span className="notification-badge">{count > 9 ? '9+' : count}</span>}
    </button>
  )
}
