import { useEffect, useState } from 'react'
import { api } from '../api'
import { timeAgo } from '../utils/time'
import { useToast } from '../context/ToastContext'

export default function AdminTab() {
  const [section, setSection] = useState('stats')
  const [dorms, setDorms] = useState([])
  const [selectedDormId, setSelectedDormId] = useState('') // '' = kendi yurdum

  useEffect(() => {
    api.admin
      .getDorms()
      .then(setDorms)
      .catch(() => {})
  }, [])

  return (
    <div className="tab-content">
      <div className="new-item-card">
        <label className="profile-label">
          Hangi yurdu goruntuluyorsun?
          <select value={selectedDormId} onChange={(e) => setSelectedDormId(e.target.value)}>
            <option value="">Kendi yurdum</option>
            {dorms.map((d) => (
              <option key={d.id} value={d.id}>
                {d.city ? `${d.city} - ${d.name}` : d.name}
              </option>
            ))}
          </select>
        </label>
        <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
          Yönetici olarak diger yurtlardaki ilanlari/kullanicilari da gorebilirsin.
        </p>
      </div>

      <div className="admin-subnav">
        <button
          className={section === 'stats' ? 'admin-subnav-btn active' : 'admin-subnav-btn'}
          onClick={() => setSection('stats')}
        >
          Istatistikler
        </button>
        <button
          className={section === 'users' ? 'admin-subnav-btn active' : 'admin-subnav-btn'}
          onClick={() => setSection('users')}
        >
          Kullanıcılar
        </button>
        <button
          className={section === 'browse' ? 'admin-subnav-btn active' : 'admin-subnav-btn'}
          onClick={() => setSection('browse')}
        >
          İlanlar
        </button>
        <button
          className={section === 'dorms' ? 'admin-subnav-btn active' : 'admin-subnav-btn'}
          onClick={() => setSection('dorms')}
        >
          Yurtlar
        </button>
        <button
          className={section === 'reports' ? 'admin-subnav-btn active' : 'admin-subnav-btn'}
          onClick={() => setSection('reports')}
        >
          Sikayetler
        </button>
      </div>

      {section === 'stats' && <StatsSection dormId={selectedDormId} />}
      {section === 'users' && <UsersSection dormId={selectedDormId} />}
      {section === 'browse' && <BrowseSection dormId={selectedDormId} />}
      {section === 'dorms' && <DormsSection />}
      {section === 'reports' && <ReportsSection dormId={selectedDormId} />}
    </div>
  )
}

function StatsSection({ dormId }) {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setStats(null)
    api.admin
      .getStats(dormId)
      .then(setStats)
      .catch((err) => setError(err.message))
  }, [dormId])

  if (error) return <p className="form-error">{error}</p>
  if (!stats) return <p className="muted">Yükleniyor...</p>

  const items = [
    { label: 'Kayitli Kullanıcı', value: stats.userCount },
    { label: 'Açık Ortak Siparis', value: stats.openOrders },
    { label: 'Açık Ihtiyac Ilani', value: stats.openRequests },
    { label: 'Açık Yolculuk', value: stats.openRides },
    { label: 'Satistaki İlan', value: stats.activeListings },
    { label: 'Açık Şikayet', value: stats.openReports },
  ]

  return (
    <div className="stats-grid">
      {items.map((item) => (
        <div key={item.label} className="stat-card">
          <div className="stat-value">{item.value}</div>
          <div className="stat-label">{item.label}</div>
        </div>
      ))}
    </div>
  )
}

function UsersSection({ dormId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState({})

  async function load() {
    setLoading(true)
    try {
      setUsers(await api.admin.getUsers(dormId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dormId])

  async function toggleBan(user) {
    setBusy((b) => ({ ...b, [user.id]: true }))
    setError('')
    try {
      if (user.banned) await api.admin.unbanUser(user.id)
      else await api.admin.banUser(user.id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy((b) => ({ ...b, [user.id]: false }))
    }
  }

  async function reactivate(user) {
    setBusy((b) => ({ ...b, [user.id]: true }))
    setError('')
    try {
      await api.admin.reactivateUser(user.id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy((b) => ({ ...b, [user.id]: false }))
    }
  }

  if (loading) return <p className="muted">Yükleniyor...</p>

  return (
    <div>
      {error && <p className="form-error">{error}</p>}
      {users.length === 0 ? (
        <p className="empty-state">Bu yurtta kayitli kullanıcı yok.</p>
      ) : (
        <ul className="card-list">
          {users.map((u) => (
            <li key={u.id} className="card">
              <h3>
                {u.name} {u.isAdmin && <span className="card-tag">Yönetici</span>}
              </h3>
              <p className="card-meta">
                {u.phone}
                {u.email ? ` - ${u.email}` : ''}
                {u.roomNo ? ` - Oda ${u.roomNo}` : ''}
              </p>
              {u.banned && <p className="card-note">Bu kullanıcı askiya alinmis.</p>}
              {u.active === false && <p className="card-note">Bu kullanıcı hesabini dondurmus.</p>}
              {!u.isAdmin && (
                <div className="card-actions">
                  <button
                    className="btn-secondary"
                    disabled={busy[u.id]}
                    onClick={() => toggleBan(u)}
                  >
                    {busy[u.id] ? 'Bekleyin...' : u.banned ? 'Banı Kaldır' : 'Banla'}
                  </button>
                  {u.active === false && (
                    <button
                      className="btn-secondary"
                      disabled={busy[u.id]}
                      onClick={() => reactivate(u)}
                    >
                      {busy[u.id] ? 'Bekleyin...' : 'Yeniden Aktif Et'}
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Yönetici, seçili yurdun tum ilanlarini (siparis/sosyallesme/yolculuk/
// ikinci el) tek bir listede, salt-okunur olarak gezebilir. Amac katilim
// degil moderasyon/genel bakis oldugu için islem butonlari yok.
function BrowseSection({ dormId }) {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState({})

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [orders, requests, rides, listings] = await Promise.all([
        api.getOrders(dormId),
        api.getRequests(dormId),
        api.getRides(dormId),
        api.getListings(dormId),
      ])
      const merged = [
        ...orders.map((o) => ({ kind: 'Ortak Sipariş', apiKind: 'orders', id: o.id, title: o.restaurant, sub: `${o.joinedCount}/${o.capacity} kişi`, owner: o.owner?.name, createdAt: o.createdAt })),
        ...requests.map((r) => ({ kind: 'Sosyalleşme', apiKind: 'requests', id: r.id, title: r.title, sub: r.description, owner: r.user?.name, createdAt: r.createdAt })),
        ...rides.map((r) => ({ kind: 'Yolculuk', apiKind: 'rides', id: r.id, title: r.destination, sub: `${r.seatsTaken}/${r.seatsTotal} koltuk`, owner: r.owner?.name, createdAt: r.createdAt })),
        ...listings.map((l) => ({ kind: 'İkinci El', apiKind: 'listings', id: l.id, title: l.title, sub: `${l.price} TL`, owner: l.user?.name, createdAt: l.createdAt })),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setItems(merged)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dormId])

  const DELETE_FN = {
    orders: api.cancelOrder,
    requests: api.cancelRequest,
    rides: api.cancelRide,
    listings: api.cancelListing,
  }

  async function handleDelete(item) {
    const key = `${item.apiKind}-${item.id}`
    setBusy((b) => ({ ...b, [key]: true }))
    try {
      await DELETE_FN[item.apiKind](item.id)
      toast('İlan silindi.')
      setItems((prev) => prev.filter((i) => !(i.apiKind === item.apiKind && i.id === item.id)))
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy((b) => ({ ...b, [key]: false }))
    }
  }

  if (loading) return <p className="muted">Yükleniyor...</p>
  if (error) return <p className="form-error">{error}</p>
  if (items.length === 0) return <p className="empty-state">Bu yurtta açık ilan yok.</p>

  return (
    <ul className="card-list">
      {items.map((item) => (
        <li key={`${item.kind}-${item.id}`} className="card">
          <div className="card-tag">{item.kind}</div>
          <h3>{item.title}</h3>
          {item.sub && <p className="card-note">{item.sub}</p>}
          <p className="card-meta">
            {item.owner} - {timeAgo(item.createdAt)}
          </p>
          <div className="card-actions">
            <button
              className="btn-secondary"
              disabled={busy[`${item.apiKind}-${item.id}`]}
              onClick={() => handleDelete(item)}
            >
              {busy[`${item.apiKind}-${item.id}`] ? 'Bekleyin...' : 'İlanı Sil'}
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

function DormsSection() {
  const [dorms, setDorms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', code: '', city: '' })
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState({})

  async function load() {
    setLoading(true)
    try {
      setDorms(await api.admin.getDorms())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(e) {
    e.preventDefault()
    if (creating) return
    setError('')
    setCreating(true)
    try {
      await api.admin.createDorm(form)
      setForm({ name: '', code: '', city: '' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id) {
    setBusy((b) => ({ ...b, [id]: true }))
    setError('')
    try {
      await api.admin.deleteDorm(id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy((b) => ({ ...b, [id]: false }))
    }
  }

  return (
    <div>
      <section className="new-item-card">
        <h2>Yeni yurt ekle</h2>
        <form onSubmit={handleCreate} className="inline-form">
          <input
            placeholder="Yurt adi"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Kod (orn. KYK-IZMIR-YENI)"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
          />
          <input
            placeholder="Sehir (opsiyonel)"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <button className="btn-primary" type="submit" disabled={creating}>
            {creating ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </form>
      </section>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Yükleniyor...</p>
      ) : (
        <ul className="card-list">
          {dorms.map((d) => (
            <li key={d.id} className="card">
              <h3>{d.name}</h3>
              <p className="card-meta">
                {d.city ? `${d.city} - ` : ''}
                {d.code} - {d._count?.users ?? 0} kullanıcı
              </p>
              <div className="card-actions">
                <button
                  className="btn-secondary"
                  disabled={busy[d.id]}
                  onClick={() => handleDelete(d.id)}
                >
                  {busy[d.id] ? 'Bekleyin...' : 'Sil'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ReportsSection({ dormId }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState({})
  const [openDetailId, setOpenDetailId] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setReports(await api.admin.getReports(dormId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dormId])

  async function resolve(id) {
    setBusy((b) => ({ ...b, [id]: true }))
    setError('')
    try {
      await api.admin.resolveReport(id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy((b) => ({ ...b, [id]: false }))
    }
  }

  async function toggleBan(reportedUser) {
    setBusy((b) => ({ ...b, [reportedUser.id]: true }))
    setError('')
    try {
      if (reportedUser.banned) await api.admin.unbanUser(reportedUser.id)
      else await api.admin.banUser(reportedUser.id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy((b) => ({ ...b, [reportedUser.id]: false }))
    }
  }

  if (loading) return <p className="muted">Yükleniyor...</p>

  return (
    <div>
      {error && <p className="form-error">{error}</p>}
      {reports.length === 0 ? (
        <p className="empty-state">Henuz bir şikayet yok.</p>
      ) : (
        <ul className="card-list">
          {reports.map((r) => (
            <li key={r.id} className="card">
              <div className={r.status === 'open' ? 'card-tag urgent' : 'card-tag'}>
                {r.status === 'open' ? 'Açık' : 'Çözüldü'}
              </div>
              <h3>{r.reason}</h3>
              {r.details && <p className="card-note">{r.details}</p>}
              <p className="card-meta">
                Şikayet eden: {r.reporter?.name || 'Bilinmiyor'}
                {r.reportedUser ? ` - Hakkinda: ${r.reportedUser.name}` : ''}
                {r.contextType ? ` - Konu: ${r.contextType}` : ''}
              </p>
              {r.reportedUser?.banned && <p className="card-note">Bu kullanıcı zaten banli.</p>}
              <p className="card-meta">{new Date(r.createdAt).toLocaleString('tr-TR')}</p>
              <div className="card-actions">
                <button
                  className="btn-secondary"
                  onClick={() => setOpenDetailId(openDetailId === r.id ? null : r.id)}
                >
                  {openDetailId === r.id ? 'Detayı Gizle' : 'Detayı Gör'}
                </button>
                {r.status === 'open' && (
                  <button className="btn-secondary" disabled={busy[r.id]} onClick={() => resolve(r.id)}>
                    {busy[r.id] ? 'Bekleyin...' : 'Çözüldü İşaretle'}
                  </button>
                )}
                {r.reportedUser && (
                  <button
                    className="btn-secondary"
                    disabled={busy[r.reportedUser.id]}
                    onClick={() => toggleBan(r.reportedUser)}
                  >
                    {busy[r.reportedUser.id]
                      ? 'Bekleyin...'
                      : r.reportedUser.banned
                        ? 'Kullanicinin Banini Kaldir'
                        : 'Kullaniciyi Banla'}
                  </button>
                )}
              </div>
              {openDetailId === r.id && <ReportDetail reportId={r.id} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Sikayetin GERCEK icerigini gosterir - sadece şikayet edenin yazdigi
// metni degil, şikayet edilen mesaj/ilan neyse onu.
function ReportDetail({ reportId }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.admin
      .getReportDetail(reportId)
      .then(setDetail)
      .catch((err) => setError(err.message))
  }, [reportId])

  if (error) return <p className="form-error">{error}</p>
  if (!detail) return <p className="muted">Yükleniyor...</p>

  const { context } = detail
  if (!context) return <p className="muted">Bu şikayet için ek icerik yok (kullanıcı sikayeti olabilir).</p>

  return (
    <div className="report-detail">
      {context.type === 'message' && (
        <div className="message-thread" style={{ maxHeight: 220 }}>
          {context.messages.map((m) => (
            <div key={m.id} className="message-bubble">
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600 }}>{m.sender?.name}</p>
              <p style={{ margin: 0 }}>{m.body}</p>
            </div>
          ))}
        </div>
      )}
      {context.type === 'order' && context.data && (
        <p className="card-note">
          Siparis: {context.data.restaurant} ({context.data.owner?.name})
        </p>
      )}
      {context.type === 'ride' && context.data && (
        <p className="card-note">
          Yolculuk: {context.data.destination} ({context.data.owner?.name})
        </p>
      )}
      {context.type === 'request' && context.data && (
        <p className="card-note">
          İlan: {context.data.title} ({context.data.user?.name})
        </p>
      )}
      {context.type === 'listing' && context.data && (
        <p className="card-note">
          İlan: {context.data.title} - {context.data.price} TL ({context.data.user?.name})
        </p>
      )}
    </div>
  )
}
