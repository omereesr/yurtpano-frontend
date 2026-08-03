import ThemeToggle from './ThemeToggle'
import UserMenu from './UserMenu'
import useUnreadCount from '../hooks/useUnreadCount'

const TABS = [
  { key: 'feed', label: 'Akis', icon: '🏠' },
  { key: 'ilanlar', label: 'Ilanlar', icon: '📋' },
  { key: 'post', label: 'Ilan Ver', icon: '➕' },
  { key: 'messages', label: 'Mesajlar', icon: '💬' },
]

export default function Nav({ active, onChange, onLogout, userName, isAdmin }) {
  const tabs = isAdmin ? [...TABS, { key: 'admin', label: 'Yonetim', icon: '🛠️' }] : TABS
  const unread = useUnreadCount()

  return (
    <>
      <header className="top-bar">
        <div className="top-bar-brand">
          <span className="pin-dot" />
          YurtPano
        </div>
        <div className="top-bar-user">
          <ThemeToggle inline />
          <UserMenu userName={userName} onNavigate={onChange} onLogout={onLogout} />
        </div>
      </header>
      <nav className="tab-bar">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={active === t.key ? 'tab active' : 'tab'}
            onClick={() => onChange(t.key)}
          >
            <span className="tab-icon-wrap">
              <span className="tab-icon">{t.icon}</span>
              {t.key === 'messages' && unread > 0 && (
                <span className="notification-badge tab-badge">{unread > 9 ? '9+' : unread}</span>
              )}
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
