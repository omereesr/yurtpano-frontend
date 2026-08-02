import { useEffect, useState } from 'react'
import { api } from '../api'
import { getSocket } from '../socket'

// Okunmamis mesaj sayisini backend'den ceker, yeni mesaj/istek geldiginde
// veya bir konusma okununca (MessagesTab'in yaydigi event) canli gunceller.
export default function useUnreadCount() {
  const [unread, setUnread] = useState(0)

  async function refresh() {
    try {
      const { unread } = await api.messages.getUnreadCount()
      setUnread(unread)
    } catch {
      // sessizce yoksay - kritik bir ozellik degil
    }
  }

  useEffect(() => {
    refresh()

    const socket = getSocket()
    if (socket) {
      socket.on('message:new', refresh)
      socket.on('conversation:new', refresh)
    }
    window.addEventListener('yurtpano:messages-read', refresh)
    return () => {
      if (socket) {
        socket.off('message:new', refresh)
        socket.off('conversation:new', refresh)
      }
      window.removeEventListener('yurtpano:messages-read', refresh)
    }
  }, [])

  return unread
}
