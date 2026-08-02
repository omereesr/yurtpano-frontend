import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { getSocket } from '../socket'
import Avatar from './Avatar'

// Ust bardaki kendi avatarimiz: tiklayinca "Profilim" ve "Mesajlar"a
// (okunmamis sayisiyla birlikte) goturen kucuk bir menu acilir. Boylece
// bu iki sekme alt navigasyon barinda yer kaplamiyor.
export default function UserMenu({ userName, onNavigate, onLogout }) {
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const menuRef = useRef(null)

  async function refreshUnread() {
    try {
      const { unread } = await api.messages.getUnreadCount()
      setUnread(unread)
    } catch {
      // sessizce yoksay - kritik bir ozellik degil
    }
  }

  useEffect(() => {
    refreshUnread()
    const socket = getSocket()
    if (!socket) return
    socket.on('message:new', refreshUnread)
    socket.on('conversation:new', refreshUnread)
    return () => {
      socket.off('message:new', refreshUnread)
      socket.off('conversation:new', refreshUnread)
    }
  }, [])

  // Menu disina tiklayinca kapat
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function go(tab) {
    setOpen(false)
    onNavigate(tab)
  }

  return (
    <div className="user-menu" ref={menuRef}>
      <button type="button" className="user-menu-trigger" onClick={() => setOpen((o) => !o)}>
        <span className="avatar-badge-wrap">
          <Avatar name={userName} size={32} />
          {unread > 0 && <span className="notification-badge avatar-badge">{unread > 9 ? '9+' : unread}</span>}
        </span>
        <span className="top-bar-username">{userName}</span>
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <button type="button" className="user-menu-item" onClick={() => go('profile')}>
            👤 Profilim
          </button>
          <button type="button" className="user-menu-item" onClick={() => go('messages')}>
            💬 Mesajlar {unread > 0 && <span className="user-menu-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
          <div className="user-menu-divider" />
          <button type="button" className="user-menu-item user-menu-logout" onClick={onLogout}>
            Cikis
          </button>
        </div>
      )}
    </div>
  )
}
