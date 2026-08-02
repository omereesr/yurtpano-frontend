import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'

// Ust bardaki kendi avatarimiz: tiklayinca "Profilim" ve "Cikis"a goturen
// kucuk bir menu acilir. Mesajlar artik alt navigasyon barinda oldugu icin
// burada tekrar etmiyoruz (bildirim rozeti de Mesajlar sekmesinin ustunde).
export default function UserMenu({ userName, onNavigate, onLogout }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

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
        <Avatar name={userName} size={32} />
        <span className="top-bar-username">{userName}</span>
      </button>

      {open && (
        <div className="user-menu-dropdown">
          <button type="button" className="user-menu-item" onClick={() => go('profile')}>
            👤 Profilim
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
