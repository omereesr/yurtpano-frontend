import { useState } from 'react'
import OrdersTab from './OrdersTab'
import RequestsTab from './RequestsTab'
import RidesTab from './RidesTab'
import ListingsTab from './ListingsTab'

const CATEGORIES = [
  { key: 'orders', label: 'Ortak Sipariş', icon: '🧾' },
  { key: 'requests', label: 'Sosyalleşme', icon: '🆘' },
  { key: 'rides', label: 'Yolculuk', icon: '🚕' },
  { key: 'listings', label: 'İkinci El', icon: '📦' },
]

// İlan olusturma buradan yapilir, listeleri gezmekten (İlanlar sekmesi)
// ayri tutuyoruz - form her seferinde listenin en ustunde durup kaydirma
// deneyimini bozmasin diye.
export default function PostAdTab({ onPosted }) {
  const [category, setCategory] = useState('orders')

  return (
    <div className="tab-content">
      <div className="category-grid">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={category === c.key ? 'category-grid-btn active' : 'category-grid-btn'}
            onClick={() => setCategory(c.key)}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {category === 'orders' && <OrdersTab mode="create" onPosted={() => onPosted?.('orders')} />}
      {category === 'requests' && <RequestsTab mode="create" onPosted={() => onPosted?.('requests')} />}
      {category === 'rides' && <RidesTab mode="create" onPosted={() => onPosted?.('rides')} />}
      {category === 'listings' && <ListingsTab mode="create" onPosted={() => onPosted?.('listings')} />}
    </div>
  )
}
