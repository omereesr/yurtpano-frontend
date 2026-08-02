import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getSocket } from '../socket'
import MessageButton from './MessageButton'
import ProfileLink from './ProfileLink'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'
import ReportButton from './ReportButton'
import EmptyState from './EmptyState'
import SkeletonList from './SkeletonList'
import { timeAgo } from '../utils/time'

export default function RidesTab({ mode = 'browse', onPosted }) {
  const { user } = useAuth()
  const toast = useToast()
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ destination: '', departureAt: '', seatsTotal: 4, note: '' })
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState({})

  function isBusy(id, action) {
    return busy[`${id}:${action}`] === true
  }
  function setItemBusy(id, action, value) {
    setBusy((b) => ({ ...b, [`${id}:${action}`]: value }))
  }

  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      setRides(await api.getRides())
    } catch (err) {
      if (!silent) setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    if (mode === 'create') return
    load()
    const socket = getSocket()
    if (!socket) return
    function handleChanged(payload) {
      if (payload.kind === 'rides') load(true)
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
      await api.createRide({
        destination: form.destination,
        departureAt: new Date(form.departureAt).toISOString(),
        seatsTotal: Number(form.seatsTotal),
        note: form.note || undefined,
      })
      setForm({ destination: '', departureAt: '', seatsTotal: 4, note: '' })
      toast('Yolculuk paylasildi! 🎉')
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

    const prevRides = rides
    setRides((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const newSeatsTaken = r.seatsTaken + 1
        return {
          ...r,
          seatsTaken: newSeatsTaken,
          status: newSeatsTaken >= r.seatsTotal ? 'closed' : r.status,
          participants: [
            ...r.participants,
            { id: `optimistic-${Date.now()}`, user: { id: user.id, name: user.name, roomNo: user.roomNo } },
          ],
        }
      })
    )

    try {
      await api.joinRide(id)
      toast('Koltugu kaptin!')
      await load(true)
    } catch (err) {
      setRides(prevRides)
      setError(err.message)
    } finally {
      setItemBusy(id, 'join', false)
    }
  }

  async function handleCancel(id) {
    if (isBusy(id, 'cancel')) return
    setError('')
    setItemBusy(id, 'cancel', true)

    const prevRides = rides
    setRides((prev) => prev.filter((r) => r.id !== id))

    try {
      await api.cancelRide(id)
      toast('Yolculuk iptal edildi.')
    } catch (err) {
      setRides(prevRides)
      setError(err.message)
    } finally {
      setItemBusy(id, 'cancel', false)
    }
  }

  async function handleLeave(id) {
    if (isBusy(id, 'leave')) return
    setError('')
    setItemBusy(id, 'leave', true)

    const prevRides = rides
    setRides((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              seatsTaken: Math.max(1, r.seatsTaken - 1),
              status: r.status === 'closed' ? 'open' : r.status,
              participants: r.participants.filter((p) => p.user?.id !== user.id),
            }
          : r
      )
    )

    try {
      await api.leaveRide(id)
      toast('Yolculuktan ayrildin.')
      await load(true)
    } catch (err) {
      setRides(prevRides)
      setError(err.message)
    } finally {
      setItemBusy(id, 'leave', false)
    }
  }

  if (mode === 'create') {
    return (
      <section className="new-item-card">
        <h2>Yolculuk paylas</h2>
        <form onSubmit={handleCreate} className="inline-form">
          <input
            placeholder="Nereye? (orn. Otogar)"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            required
          />
          <input
            type="datetime-local"
            value={form.departureAt}
            onChange={(e) => setForm({ ...form, departureAt: e.target.value })}
            required
          />
          <input
            type="number"
            min="2"
            max="8"
            value={form.seatsTotal}
            onChange={(e) => setForm({ ...form, seatsTotal: e.target.value })}
          />
          <input
            placeholder="Not (opsiyonel)"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={creating}>
            {creating ? 'Paylasiliyor...' : 'Paylas'}
          </button>
        </form>
      </section>
    )
  }

  const visibleRides = search
    ? rides.filter((r) => r.destination.toLowerCase().includes(search.toLowerCase()))
    : rides

  return (
    <div className="tab-content">
      {rides.length > 0 && (
        <input
          className="search-box"
          placeholder="Nereye gidiyor ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <SkeletonList />
      ) : visibleRides.length === 0 ? (
        <EmptyState
          kind="car"
          title={search ? 'Aramana uyan yolculuk yok.' : 'Su an planlanan bir yolculuk yok.'}
          subtitle={search ? '' : '"Ilan Ver" sekmesinden ilk yolculugu sen paylas!'}
        />
      ) : (
        <ul className="card-list">
          {visibleRides.map((r) => {
            const alreadyJoined = r.participants?.some((p) => p.user?.id === user.id)
            return (
              <li key={r.id} className="card">
                <div className="feed-card-header">
                  <Avatar name={r.owner?.name} size={28} />
                  <span className="card-meta">
                    <ProfileLink userId={r.owner?.id} name={r.owner?.name} />
                    {r.owner?.phoneVerified && <VerifiedBadge />}
                  </span>
                  <div className="card-tag">Yolculuk</div>
                </div>
                <h3>{r.destination}</h3>
                <p className="card-meta">
                  {new Date(r.departureAt).toLocaleString('tr-TR')} - {timeAgo(r.createdAt)} paylasildi
                </p>
                {r.note && <p className="card-note">{r.note}</p>}
                <p className="card-meta">
                  Koltuk: {r.seatsTaken}/{r.seatsTotal}
                </p>
                {r.participants?.length > 0 && (
                  <p className="card-meta">
                    Katilanlar:{' '}
                    {r.participants.map((p, i) => (
                      <span key={p.id}>
                        <ProfileLink userId={p.user?.id} name={p.user?.name} />
                        {i < r.participants.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                )}
                <div className="card-actions">
                  {r.ownerId === user.id ? (
                    <button
                      className="btn-secondary"
                      disabled={isBusy(r.id, 'cancel')}
                      onClick={() => handleCancel(r.id)}
                    >
                      {isBusy(r.id, 'cancel') ? 'Bekleyin...' : 'Iptal Et'}
                    </button>
                  ) : alreadyJoined ? (
                    <button
                      className="btn-secondary"
                      disabled={isBusy(r.id, 'leave')}
                      onClick={() => handleLeave(r.id)}
                    >
                      {isBusy(r.id, 'leave') ? 'Bekleyin...' : 'Ayril'}
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn-secondary"
                        disabled={r.seatsTaken >= r.seatsTotal || isBusy(r.id, 'join')}
                        onClick={() => handleJoin(r.id)}
                      >
                        {isBusy(r.id, 'join') ? 'Kapiliyor...' : 'Koltuk Kap'}
                      </button>
                      <MessageButton
                        toUserId={r.ownerId}
                        contextType="ride"
                        contextId={r.id}
                        contextTitle={`Yolculuk: ${r.destination}`}
                      />
                    </>
                  )}
                </div>
                {r.ownerId !== user.id && (
                  <ReportButton reportedUserId={r.ownerId} contextType="ride" contextId={r.id} />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
