import { useEffect, useState } from 'react'
import { api } from '../api'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'
import ProfileLink from './ProfileLink'
import EmptyState from './EmptyState'
import { timeAgo } from '../utils/time'

const KIND_META = {
  order: { label: 'Ortak Siparis', icon: '🧾', tab: 'orders' },
  request: { label: 'Sosyallesme', icon: '🆘', tab: 'requests' },
  ride: { label: 'Yolculuk', icon: '🚕', tab: 'rides' },
  listing: { label: 'Ikinci El', icon: '📦', tab: 'listings' },
}

// Bu sekme, diger 4 sekmedeki (siparis/sosyallesme/yolculuk/ikinci el) acik
// kayitlari tek bir "akis" halinde, en yeniden eskiye siralayarak gosterir.
// Boylece kullanici uygulamaya girince hangi sekmeye bakacagini
// dusunmeden genel bir goruntu edinir.
export default function FeedTab({ onNavigate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const [orders, requests, rides, listings] = await Promise.all([
          api.getOrders(),
          api.getRequests(),
          api.getRides(),
          api.getListings(),
        ])
        const merged = [
          ...orders.map((o) => ({ kind: 'order', id: o.id, createdAt: o.createdAt, data: o })),
          ...requests.map((r) => ({ kind: 'request', id: r.id, createdAt: r.createdAt, data: r })),
          ...rides.map((r) => ({ kind: 'ride', id: r.id, createdAt: r.createdAt, data: r })),
          ...listings.map((l) => ({ kind: 'listing', id: l.id, createdAt: l.createdAt, data: l })),
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        setItems(merged)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <p className="muted">Yukleniyor...</p>
  if (error) return <p className="form-error">{error}</p>
  if (items.length === 0) {
    return (
      <EmptyState
        kind="megaphone"
        title="Yurdunda henuz acik bir ilan yok."
        subtitle="Ilk ilani sen ac, akis burada dolmaya baslasin!"
      />
    )
  }

  return (
    <div className="tab-content">
      <ul className="card-list">
        {items.map((item) => (
          <FeedCard key={`${item.kind}-${item.id}`} item={item} onNavigate={onNavigate} />
        ))}
      </ul>
    </div>
  )
}

function FeedCard({ item, onNavigate }) {
  const meta = KIND_META[item.kind]
  const d = item.data
  const owner = d.owner || d.user

  let title = ''
  let subtitle = ''
  if (item.kind === 'order') {
    title = d.restaurant
    subtitle = `${d.joinedCount}/${d.capacity} kisi katildi`
  } else if (item.kind === 'request') {
    title = d.title
    subtitle = d.description || ''
  } else if (item.kind === 'ride') {
    title = d.destination
    subtitle = `${new Date(d.departureAt).toLocaleString('tr-TR')} - ${d.seatsTaken}/${d.seatsTotal} koltuk`
  } else if (item.kind === 'listing') {
    title = d.title
    subtitle = `${d.price} TL`
  }

  return (
    <li className="card feed-card" onClick={() => onNavigate(meta.tab)} style={{ cursor: 'pointer' }}>
      <div className="feed-card-header">
        <Avatar name={owner?.name} size={28} />
        <div>
          <span className="card-meta">
            <ProfileLink userId={owner?.id} name={owner?.name} />
            {owner?.phoneVerified && <VerifiedBadge />}
          </span>
        </div>
        <span className="card-tag feed-kind-tag">
          {meta.icon} {meta.label}
        </span>
      </div>
      <h3>{title}</h3>
      {subtitle && <p className="card-note">{subtitle}</p>}
      <p className="card-meta">{timeAgo(item.createdAt)}</p>
    </li>
  )
}
