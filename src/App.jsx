import { useEffect, useState } from 'react'
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
import InstallPrompt from './components/InstallPrompt'
import PushPrompt from './components/PushPrompt'

const LISTING_KINDS = ['orders', 'requests', 'rides', 'listings']

function Shell() {
  const { user, logout } = useAuth()
  const [active, setActive] = useState('feed')
  const [listingsCategory, setListingsCategory] = useState('orders')

  // Shell, cikis/giris arasinda AYNI React bilesen orneginde kaliyor -
  // yani "active" state'i cikis yapmadan onceki sekmeyi hatirlamaya devam
  // ediyordu (orn. Yonetim'deyken cikis yapip baska hesapla girince hala
  // Yonetim'e dusmeye calisiyordu). Her basarili giriste Akis'a resetliyoruz.
  useEffect(() => {
    if (user) setActive('feed')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Feed'deki veya bir mesajdaki "ilana git" linkleri 'orders'/'requests'/
  // 'rides'/'listings' gibi kategori isimleriyle gelir - bunlari otomatik
  // olarak Ilanlar sekmesine + dogru kategoriye yonlendiriyoruz.
  function handleNavigate(target) {
    // GUVENLIK AGI: mesaj yazarken alt navigasyon barini gizlemek icin
    // eklenen "composing" isareti, bazi senaryolarda (orn. klavyeyi acik
    // tutmak icin butonun odagi CALMASINI ENGELLEDIGIMIZ icin blur olayi
    // hic tetiklenmeyebiliyordu) temizlenmeden "yapiskan" kalabiliyordu -
    // bu da alt barin baska sayfalarda da gizli/bozuk kalmasina sebep
    // oluyordu. Hangi sekmeye gecilirse gecilsin, burada HER ZAMAN
    // zorla temizliyoruz.
    document.body.classList.remove('composing')

    if (LISTING_KINDS.includes(target)) {
      setListingsCategory(target)
      setActive('ilanlar')
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
        <InstallPrompt />
        <PushPrompt />
        {active === 'feed' && <FeedTab onNavigate={handleNavigate} />}
        {active === 'ilanlar' && (
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
