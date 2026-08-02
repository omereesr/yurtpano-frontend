import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import MessageButton from './MessageButton'
import ProfileLink from './ProfileLink'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'
import ReportButton from './ReportButton'
import EmptyState from './EmptyState'
import { timeAgo } from '../utils/time'

const TYPE_LABELS = {
  esya: 'Esya',
  not: 'Ders Notu',
  calisma_arkadasi: 'Calisma Arkadasi',
  etkinlik: 'Etkinlik / Oyun',
  diger: 'Diger',
}

export default function RequestsTab() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ type: 'esya', title: '', description: '' })
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState({})

  function isBusy(id, action) {
    return busy[`${id}:${action}`] === true
  }
  function setItemBusy(id, action, value) {
    setBusy((b) => ({ ...b, [`${id}:${action}`]: value }))
  }

  async function load() {
    setLoading(true)
    try {
      setItems(await api.getRequests())
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
      await api.createRequest({ ...form, description: form.description || undefined })
      setForm({ type: 'esya', title: '', description: '' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleFulfill(id) {
    if (isBusy(id, 'fulfill')) return
    setError('')
    setItemBusy(id, 'fulfill', true)
    try {
      await api.fulfillRequest(id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setItemBusy(id, 'fulfill', false)
    }
  }

  async function handleCancel(id) {
    if (isBusy(id, 'cancel')) return
    setError('')
    setItemBusy(id, 'cancel', true)
    try {
      await api.cancelRequest(id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setItemBusy(id, 'cancel', false)
    }
  }

  return (
    <div className="tab-content">
      <section className="new-item-card">
        <h2>Anlik ihtiyacini paylas</h2>
        <form onSubmit={handleCreate} className="inline-form">
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="esya">Esya</option>
            <option value="not">Ders Notu</option>
            <option value="calisma_arkadasi">Calisma Arkadasi</option>
            <option value="etkinlik">Etkinlik / Oyun Arkadasi</option>
            <option value="diger">Diger</option>
          </select>
          <input
            placeholder="Orn. 'Type-C sarj aleti olan var mi?' ya da 'Valorant icin +1 araniyor'"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            placeholder="Detay (opsiyonel)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <button className="btn-primary" type="submit" disabled={creating}>
            {creating ? 'Paylasiliyor...' : 'Paylas'}
          </button>
        </form>
      </section>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Yukleniyor...</p>
      ) : items.length === 0 ? (
        <EmptyState
          kind="megaphone"
          title="Su an acik bir ilan yok."
          subtitle="Bir ihtiyacini, ders arkadasligini ya da oyun arkadasligi ilanini ilk sen ac!"
        />
      ) : (
        <ul className="card-list">
          {items.map((r) => (
            <li key={r.id} className="card">
              <div className="feed-card-header">
                <Avatar name={r.user?.name} size={28} />
                <span className="card-meta">
                  <ProfileLink userId={r.user?.id} name={r.user?.name} />
                  {r.user?.phoneVerified && <VerifiedBadge />}
                  {r.user?.roomNo ? ` - Oda ${r.user.roomNo}` : ''}
                </span>
                <div className={r.type === 'esya' ? 'card-tag urgent' : 'card-tag'}>
                  {TYPE_LABELS[r.type]}
                </div>
              </div>
              <h3>{r.title}</h3>
              <p className="card-meta">{timeAgo(r.createdAt)}</p>
              {r.description && <p className="card-note">{r.description}</p>}
              {r.userId === user.id ? (
                <div className="card-actions">
                  <button
                    className="btn-secondary"
                    disabled={isBusy(r.id, 'fulfill')}
                    onClick={() => handleFulfill(r.id)}
                  >
                    {isBusy(r.id, 'fulfill') ? 'Bekleyin...' : 'Cozuldu isaretle'}
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={isBusy(r.id, 'cancel')}
                    onClick={() => handleCancel(r.id)}
                  >
                    {isBusy(r.id, 'cancel') ? 'Bekleyin...' : 'Iptal Et'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="card-actions">
                    <MessageButton
                      toUserId={r.userId}
                      contextType="request"
                      contextId={r.id}
                      contextTitle={r.title}
                    />
                  </div>
                  <ReportButton reportedUserId={r.userId} contextType="request" contextId={r.id} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
