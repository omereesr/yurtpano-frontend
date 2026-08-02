import ThemeToggle from './ThemeToggle'
import UserMenu from './UserMenu'

const TABS = [
  { key: 'feed', label: 'Akis', icon: '🏠' },
  { key: 'orders', label: 'Ortak Siparis', icon: '🧾' },
  { key: 'requests', label: 'Sosyallesme', icon: '🆘' },
  { key: 'rides', label: 'Yolculuk', icon: '🚕' },
  { key: 'listings', label: 'Ikinci El', icon: '📦' },
]

export default function Nav({ active, onChange, onLogout, userName, isAdmin }) {
  const tabs = isAdmin ? [...TABS, { key: 'admin', label: 'Yonetim', icon: '🛠️' }] : TABS

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
            <span className="tab-icon">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  )
}
