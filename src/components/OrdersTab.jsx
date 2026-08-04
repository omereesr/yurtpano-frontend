import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getSocket } from '../socket'
import CapacityBar from './CapacityBar'
import MessageButton from './MessageButton'
import ProfileLink from './ProfileLink'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'
import ReportButton from './ReportButton'
import ParticipantsCard from './ParticipantsCard'
import EmptyState from './EmptyState'
import SkeletonList from './SkeletonList'
import { timeAgo, timeUntil } from '../utils/time'

export default function OrdersTab({ mode = 'browse', onPosted }) {
  const { user } = useAuth()
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ restaurant: '', capacity: '', minAmount: '', note: '' })
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState({})

  function isBusy(id, action) {
    return busy[`${id}:${action}`] === true
  }
  function setItemBusy(id, action, value) {
    setBusy((b) => ({ ...b, [`${id}:${action}`]: value }))
  }

  // silent=true: arka planda tazele, "Yükleniyor..." donmesin (F5 hissi vermesin)
  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      setOrders(await api.getOrders())
    } catch (err) {
      if (!silent) setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'create') return // sadece form gosterilecekse listeyi hic cekme
    load()

    // Başka biri (ya da başka bir sekmede kendimiz) bir siparis actiginda/
    // degistirdiginde F5 atmadan sessizce guncelle.
    const socket = getSocket()
    if (!socket) return
    function handleChanged(payload) {
      if (payload.kind === 'orders') load(true)
    }
    socket.on('listing:changed', handleChanged)
    return () => socket.off('listing:changed', handleChanged)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

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
      toast('Siparis acildi! 🎉')
      onPosted?.()
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

    // ONCE ekrani guncelle (sunucu cevabini beklemeden) - butona basar
    // basmaz "katildim" hissi versin. Hata donerse asagida geri aliyoruz.
    const prevOrders = orders
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o
        const newJoinedCount = o.joinedCount + 1
        return {
          ...o,
          joinedCount: newJoinedCount,
          status: newJoinedCount >= o.capacity ? 'closed' : o.status,
          participants: [
            ...o.participants,
            { id: `optimistic-${Date.now()}`, user: { id: user.id, name: user.name, roomNo: user.roomNo } },
          ],
        }
      })
    )

    try {
      await api.joinOrder(id)
      toast('Siparise katildin!')
      await load(true) // gercek veriyle sessizce mutabakat (silent reconcile)
    } catch (err) {
      setOrders(prevOrders) // geri al
      setError(err.message)
    } finally {
      setItemBusy(id, 'join', false)
    }
  }

  async function handleLeave(id) {
    if (isBusy(id, 'leave')) return
    setError('')
    setItemBusy(id, 'leave', true)

    const prevOrders = orders
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              joinedCount: Math.max(0, o.joinedCount - 1),
              status: o.status === 'closed' ? 'open' : o.status,
              participants: o.participants.filter((p) => p.user?.id !== user.id),
            }
          : o
      )
    )

    try {
      await api.leaveOrder(id)
      toast('Siparisten ayrıldın.')
      await load(true)
    } catch (err) {
      setOrders(prevOrders)
      setError(err.message)
    } finally {
      setItemBusy(id, 'leave', false)
    }
  }

  async function handleRemoveParticipant(orderId, participantUserId) {
    if (isBusy(orderId, 'remove')) return
    setError('')
    setItemBusy(orderId, 'remove', true)

    const prevOrders = orders
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              joinedCount: Math.max(0, o.joinedCount - 1),
              status: o.status === 'closed' ? 'open' : o.status,
              participants: o.participants.filter((p) => p.user?.id !== participantUserId),
            }
          : o
      )
    )

    try {
      await api.removeOrderParticipant(orderId, participantUserId)
      toast('Katılımcı çıkarıldı.')
      await load(true)
    } catch (err) {
      setOrders(prevOrders)
      setError(err.message)
    } finally {
      setItemBusy(orderId, 'remove', false)
    }
  }

  async function handleCancel(id) {
    if (isBusy(id, 'cancel')) return
    setError('')
    setItemBusy(id, 'cancel', true)

    // Iptal edilen siparis açık listede zaten gorunmeyecek, o yuzden
    // dogrudan listeden cikariyoruz.
    const prevOrders = orders
    setOrders((prev) => prev.filter((o) => o.id !== id))

    try {
      await api.cancelOrder(id)
      toast('Siparis iptal edildi.')
    } catch (err) {
      setOrders(prevOrders) // hata olursa siparisi geri koy
      setError(err.message)
    } finally {
      setItemBusy(id, 'cancel', false)
    }
  }

  if (mode === 'create') {
    return (
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
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={creating}>
            {creating ? 'Aciliyor...' : 'Ac'}
          </button>
        </form>
      </section>
    )
  }

  const visibleOrders = search
    ? orders.filter((o) => o.restaurant.toLowerCase().includes(search.toLowerCase()))
    : orders

  return (
    <div className="tab-content">
      {orders.length > 0 && (
        <input
          className="search-box"
          placeholder="Restoran ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <SkeletonList />
      ) : visibleOrders.length === 0 ? (
        <EmptyState
          kind="cart"
          title={search ? 'Aramana uyan siparis yok.' : 'Su an açık siparis yok.'}
          subtitle={search ? '' : '"İlan Ver" sekmesinden ilk siparisi sen ac!'}
        />
      ) : (
        <ul className="card-list">
          {visibleOrders.map((o) => {
            const alreadyJoined = o.participants?.some((p) => p.user?.id === user.id)
            return (
              <li key={o.id} className="card">
                <div className="feed-card-header">
                  <Avatar name={o.owner?.name} size={28} />
                  <span className="card-meta">
                    <ProfileLink userId={o.owner?.id} name={o.owner?.name} />
                    {o.owner?.emailVerified && <VerifiedBadge />}
                    {o.owner?.roomNo ? ` - Oda ${o.owner.roomNo}` : ''}
                  </span>
                  <div className="card-tag">Ortak Siparis</div>
                </div>
                <h3>{o.restaurant}</h3>
                <p className="card-meta">
                  {timeAgo(o.createdAt)}
                  {timeUntil(o.expiresAt) ? ` - ⏳ ${timeUntil(o.expiresAt)}` : ''}
                </p>
                {o.minAmount && <p className="card-note">Min. sepet: {o.minAmount} TL</p>}
                {o.note && <p className="card-note">{o.note}</p>}
                <CapacityBar joined={o.joinedCount} capacity={o.capacity} />

                <ParticipantsCard
                  participants={o.participants}
                  isOwner={o.ownerId === user.id}
                  onRemove={(participantUserId) => handleRemoveParticipant(o.id, participantUserId)}
                  contextType="order"
                  contextId={o.id}
                  contextTitle={o.restaurant}
                />

                <div className="card-actions">
                  {o.ownerId === user.id ? (
                    <button
                      className="btn-secondary"
                      disabled={isBusy(o.id, 'cancel')}
                      onClick={() => handleCancel(o.id)}
                    >
                      {isBusy(o.id, 'cancel') ? 'Bekleyin...' : 'İptal Et'}
                    </button>
                  ) : alreadyJoined ? (
                    <button
                      className="btn-secondary"
                      disabled={isBusy(o.id, 'leave')}
                      onClick={() => handleLeave(o.id)}
                    >
                      {isBusy(o.id, 'leave') ? 'Bekleyin...' : 'Ayrıl'}
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn-secondary"
                        disabled={isBusy(o.id, 'join')}
                        onClick={() => handleJoin(o.id)}
                      >
                        {isBusy(o.id, 'join') ? 'Katılıyor...' : 'Katıl'}
                      </button>
                      <MessageButton
                        toUserId={o.ownerId}
                        contextType="order"
                        contextId={o.id}
                        contextTitle={o.restaurant}
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
