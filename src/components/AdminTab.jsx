import { useEffect, useState } from 'react'
import { api } from '../api'

export default function AdminTab() {
  const [section, setSection] = useState('stats')

  return (
    <div className="tab-content">
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
          Kullanicilar
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

      {section === 'stats' && <StatsSection />}
      {section === 'users' && <UsersSection />}
      {section === 'dorms' && <DormsSection />}
      {section === 'reports' && <ReportsSection />}
    </div>
  )
}

function StatsSection() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.admin
      .getStats()
      .then(setStats)
      .catch((err) => setError(err.message))
  }, [])

  if (error) return <p className="form-error">{error}</p>
  if (!stats) return <p className="muted">Yukleniyor...</p>

  const items = [
    { label: 'Kayitli Kullanici', value: stats.userCount },
    { label: 'Acik Ortak Siparis', value: stats.openOrders },
    { label: 'Acik Ihtiyac Ilani', value: stats.openRequests },
    { label: 'Acik Yolculuk', value: stats.openRides },
    { label: 'Satistaki Ilan', value: stats.activeListings },
    { label: 'Acik Sikayet', value: stats.openReports },
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

function UsersSection() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState({})

  async function load() {
    setLoading(true)
    try {
      setUsers(await api.admin.getUsers())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

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

  if (loading) return <p className="muted">Yukleniyor...</p>

  return (
    <div>
      {error && <p className="form-error">{error}</p>}
      {users.length === 0 ? (
        <p className="empty-state">Bu yurtta kayitli kullanici yok.</p>
      ) : (
        <ul className="card-list">
          {users.map((u) => (
            <li key={u.id} className="card">
              <h3>
                {u.name} {u.isAdmin && <span className="card-tag">Yonetici</span>}
              </h3>
              <p className="card-meta">
                {u.phone}
                {u.email ? ` - ${u.email}` : ''}
                {u.roomNo ? ` - Oda ${u.roomNo}` : ''}
              </p>
              {u.banned && <p className="card-note">Bu kullanici askiya alinmis.</p>}
              {u.active === false && <p className="card-note">Bu kullanici hesabini dondurmus.</p>}
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
        <p className="muted">Yukleniyor...</p>
      ) : (
        <ul className="card-list">
          {dorms.map((d) => (
            <li key={d.id} className="card">
              <h3>{d.name}</h3>
              <p className="card-meta">
                {d.city ? `${d.city} - ` : ''}
                {d.code} - {d._count?.users ?? 0} kullanici
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

function ReportsSection() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState({})

  async function load() {
    setLoading(true)
    try {
      setReports(await api.admin.getReports())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

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

  if (loading) return <p className="muted">Yukleniyor...</p>

  return (
    <div>
      {error && <p className="form-error">{error}</p>}
      {reports.length === 0 ? (
        <p className="empty-state">Henuz bir sikayet yok.</p>
      ) : (
        <ul className="card-list">
          {reports.map((r) => (
            <li key={r.id} className="card">
              <div className={r.status === 'open' ? 'card-tag urgent' : 'card-tag'}>
                {r.status === 'open' ? 'Acik' : 'Cozuldu'}
              </div>
              <h3>{r.reason}</h3>
              {r.details && <p className="card-note">{r.details}</p>}
              <p className="card-meta">
                Sikayet eden: {r.reporter?.name || 'Bilinmiyor'}
                {r.reportedUser ? ` - Hakkinda: ${r.reportedUser.name}` : ''}
                {r.contextType ? ` - Konu: ${r.contextType}` : ''}
              </p>
              <p className="card-meta">{new Date(r.createdAt).toLocaleString('tr-TR')}</p>
              {r.status === 'open' && (
                <div className="card-actions">
                  <button className="btn-secondary" disabled={busy[r.id]} onClick={() => resolve(r.id)}>
                    {busy[r.id] ? 'Bekleyin...' : 'Cozuldu Isaretle'}
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
