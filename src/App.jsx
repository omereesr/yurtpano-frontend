import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import AuthScreen from './components/AuthScreen'
import Nav from './components/Nav'
import FeedTab from './components/FeedTab'
import ListingsHub from './components/ListingsHub'
import PostAdTab from './components/PostAdTab'
import AdminTab from './components/AdminTab'
import MessagesTab from './components/MessagesTab'
import ProfileTab from './components/ProfileTab'
import ThemeToggle from './components/ThemeToggle'

const LISTING_KINDS = ['orders', 'requests', 'rides', 'listings']

function Shell() {
  const { user, logout } = useAuth()
  const [active, setActive] = useState('feed')
  const [listingsCategory, setListingsCategory] = useState('orders')

  // Feed'deki veya bir mesajdaki "ilana git" linkleri 'orders'/'requests'/
  // 'rides'/'listings' gibi kategori isimleriyle gelir - bunlari otomatik
  // olarak Ilanlar sekmesine + dogru kategoriye yonlendiriyoruz.
  function handleNavigate(target) {
    if (LISTING_KINDS.includes(target)) {
      setListingsCategory(target)
      setActive('listings')
    } else {
      setActive(target)
    }
  }

  if (!user) {
    return (
      <>
        <ThemeToggle />
        <AuthScreen />
      </>
    )
  }

  return (
    <div className="app-shell">
      <Nav
        active={active}
        onChange={handleNavigate}
        onLogout={logout}
        userName={user.name}
        isAdmin={user.isAdmin}
      />
      <main className="app-main">
        {active === 'feed' && <FeedTab onNavigate={handleNavigate} />}
        {active === 'listings' && (
          <ListingsHub category={listingsCategory} onCategoryChange={setListingsCategory} />
        )}
        {active === 'post' && <PostAdTab onPosted={(category) => handleNavigate(category)} />}
        {active === 'messages' && <MessagesTab onNavigate={handleNavigate} />}
        {active === 'profile' && <ProfileTab />}
        {active === 'admin' && user.isAdmin && <AdminTab />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ToastProvider>
  )
}
