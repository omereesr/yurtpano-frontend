import OrdersTab from './OrdersTab'
import RequestsTab from './RequestsTab'
import RidesTab from './RidesTab'
import ListingsTab from './ListingsTab'

const CATEGORIES = [
  { key: 'orders', label: 'Ortak Siparis', icon: '🧾' },
  { key: 'requests', label: 'Sosyallesme', icon: '🆘' },
  { key: 'rides', label: 'Yolculuk', icon: '🚕' },
  { key: 'listings', label: 'Ikinci El', icon: '📦' },
]

// Tum ilan turlerini tek bir "Ilanlar" sekmesi altinda toplar. Ilan
// OLUSTURMA burada degil, ayri "Ilan Ver" sayfasinda - boylece gezinme
// (browse) ve yazma (create) birbirine karismaz.
export default function ListingsHub({ category, onCategoryChange }) {
  return (
    <div className="tab-content">
      <div className="admin-subnav">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={category === c.key ? 'admin-subnav-btn active' : 'admin-subnav-btn'}
            onClick={() => onCategoryChange(c.key)}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {category === 'orders' && <OrdersTab mode="browse" />}
      {category === 'requests' && <RequestsTab mode="browse" />}
      {category === 'rides' && <RidesTab mode="browse" />}
      {category === 'listings' && <ListingsTab mode="browse" />}
    </div>
  )
}
