import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import CapacityBar from './CapacityBar'
import MessageButton from './MessageButton'
import ProfileLink from './ProfileLink'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'
import ReportButton from './ReportButton'
import EmptyState from './EmptyState'

export default function OrdersTab() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ restaurant: '', capacity: '', minAmount: '', note: '' })
  const [creating, setCreating] = useState(false)
  // Ayni ana ayni butona birden fazla basilinca (yavas internette) ayni istegin
  // iki kere gitmesini onlemek icin, hangi kartin hangi islemde "mesgul" oldugunu tutuyoruz.
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
      setOrders(await api.getOrders())
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
      await api.createOrder({
        restaurant: form.restaurant,
        capacity: Number(form.capacity),
        minAmount: form.minAmount ? Number(form.minAmount) : undefined,
        note: form.note || undefined,
      })
      setForm({ restaurant: '', capacity: '', minAmount: '', note: '' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleJoin(id) {
    if (isBusy(id, 'join')) return
    setError('')
    setItemBusy(id, 'join', true)
    try {
      await api.joinOrder(id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setItemBusy(id, 'join', false)
    }
  }

  async function handleLeave(id) {
    if (isBusy(id, 'leave')) return
    setError('')
    setItemBusy(id, 'leave', true)
    try {
      await api.leaveOrder(id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setItemBusy(id, 'leave', false)
    }
  }

  async function handleCancel(id) {
    if (isBusy(id, 'cancel')) return
    setError('')
    setItemBusy(id, 'cancel', true)
    try {
      await api.cancelOrder(id)
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
        <h2>Yeni ortak siparis ac</h2>
        <form onSubmit={handleCreate} className="inline-form">
          <input
            placeholder="Restoran (orn. Migros Yemek)"
            value={form.restaurant}
            onChange={(e) => setForm({ ...form, restaurant: e.target.value })}
            required
          />
          <input
            placeholder="Kac kisi ariyorsun? (orn. 3)"
            type="number"
            min="2"
            max="30"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            required
          />
          <input
            placeholder="Restoranin min. sepet tutari (opsiyonel, TL)"
            type="number"
            min="1"
            value={form.minAmount}
            onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
          />
          <input
            placeholder="Not (opsiyonel)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          <button className="btn-primary" type="submit" disabled={creating}>
            {creating ? 'Aciliyor...' : 'Ac'}
          </button>
        </form>
      </section>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Yukleniyor...</p>
      ) : orders.length === 0 ? (
        <EmptyState kind="cart" title="Su an acik siparis yok." subtitle="Ilk siparisi sen ac, birileri katilsin!" />
      ) : (
        <ul className="card-list">
          {orders.map((o) => {
            const alreadyJoined = o.participants?.some((p) => p.user?.id === user.id)
            return (
              <li key={o.id} className="card">
                <div className="feed-card-header">
                  <Avatar name={o.owner?.name} size={28} />
                  <span className="card-meta">
                    <ProfileLink userId={o.owner?.id} name={o.owner?.name} />
                    {o.owner?.phoneVerified && <VerifiedBadge />}
                    {o.owner?.roomNo ? ` - Oda ${o.owner.roomNo}` : ''}
                  </span>
                  <div className="card-tag">Ortak Siparis</div>
                </div>
                <h3>{o.restaurant}</h3>
                {o.minAmount && <p className="card-note">Min. sepet: {o.minAmount} TL</p>}
                {o.note && <p className="card-note">{o.note}</p>}
                <CapacityBar joined={o.joinedCount} capacity={o.capacity} />

                {o.participants?.length > 0 && (
                  <p className="card-meta">
                    Katilanlar:{' '}
                    {o.participants.map((p, i) => (
                      <span key={p.id}>
                        <ProfileLink userId={p.user?.id} name={p.user?.name} />
                        {i < o.participants.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                )}

                <div className="card-actions">
                  {o.ownerId === user.id ? (
                    <button
                      className="btn-secondary"
                      disabled={isBusy(o.id, 'cancel')}
                      onClick={() => handleCancel(o.id)}
                    >
                      {isBusy(o.id, 'cancel') ? 'Bekleyin...' : 'Iptal Et'}
                    </button>
                  ) : alreadyJoined ? (
                    <button
                      className="btn-secondary"
                      disabled={isBusy(o.id, 'leave')}
                      onClick={() => handleLeave(o.id)}
                    >
                      {isBusy(o.id, 'leave') ? 'Bekleyin...' : 'Ayril'}
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn-secondary"
                        disabled={isBusy(o.id, 'join')}
                        onClick={() => handleJoin(o.id)}
                      >
                        {isBusy(o.id, 'join') ? 'Katiliyor...' : 'Katil'}
                      </button>
                      <MessageButton
                        toUserId={o.ownerId}
                        contextType="order"
                        contextId={o.id}
                        contextTitle={`Ortak Siparis: ${o.restaurant}`}
                      />
                    </>
                  )}
                </div>
                {o.ownerId !== user.id && (
                  <ReportButton reportedUserId={o.ownerId} contextType="order" contextId={o.id} />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
