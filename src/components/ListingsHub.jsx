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

// Tum ilan turlerini tek bir "İlanlar" sekmesi altinda toplar. İlan
// OLUSTURMA burada degil, ayri "İlan Ver" sayfasinda - boylece gezinme
// (browse) ve yazma (create) birbirine karismaz.
export default function ListingsHub({ category, onCategoryChange }) {
  return (
    <div className="tab-content">
      <div className="category-grid">
        {CATEGORIES.map((c) => (
          <button
            key={c.key}
            className={category === c.key ? 'category-grid-btn active' : 'category-grid-btn'}
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
