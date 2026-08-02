import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthScreen from './components/AuthScreen'
import Nav from './components/Nav'
import FeedTab from './components/FeedTab'
import OrdersTab from './components/OrdersTab'
import RequestsTab from './components/RequestsTab'
import RidesTab from './components/RidesTab'
import ListingsTab from './components/ListingsTab'
import AdminTab from './components/AdminTab'
import MessagesTab from './components/MessagesTab'
import ProfileTab from './components/ProfileTab'
import ThemeToggle from './components/ThemeToggle'

function Shell() {
  const { user, logout } = useAuth()
  const [active, setActive] = useState('feed')

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
        onChange={setActive}
        onLogout={logout}
        userName={user.name}
        isAdmin={user.isAdmin}
      />
      <main className="app-main">
        {active === 'feed' && <FeedTab onNavigate={setActive} />}
        {active === 'orders' && <OrdersTab />}
        {active === 'requests' && <RequestsTab />}
        {active === 'rides' && <RidesTab />}
        {active === 'listings' && <ListingsTab />}
        {active === 'messages' && <MessagesTab />}
        {active === 'profile' && <ProfileTab />}
        {active === 'admin' && user.isAdmin && <AdminTab />}
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  )
}
