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

export default function RidesTab() {
  const { user } = useAuth()
  const [rides, setRides] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ destination: '', departureAt: '', seatsTotal: 4, note: '' })
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
      setRides(await api.getRides())
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
      await api.createRide({
        destination: form.destination,
        departureAt: new Date(form.departureAt).toISOString(),
        seatsTotal: Number(form.seatsTotal),
        note: form.note || undefined,
      })
      setForm({ destination: '', departureAt: '', seatsTotal: 4, note: '' })
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
      await api.joinRide(id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setItemBusy(id, 'join', false)
    }
  }

  async function handleCancel(id) {
    if (isBusy(id, 'cancel')) return
    setError('')
    setItemBusy(id, 'cancel', true)
    try {
      await api.cancelRide(id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setItemBusy(id, 'cancel', false)
    }
  }

  async function handleLeave(id) {
    if (isBusy(id, 'leave')) return
    setError('')
    setItemBusy(id, 'leave', true)
    try {
      await api.leaveRide(id)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setItemBusy(id, 'leave', false)
    }
  }

  return (
    <div className="tab-content">
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
          <button className="btn-primary" type="submit" disabled={creating}>
            {creating ? 'Paylasiliyor...' : 'Paylas'}
          </button>
        </form>
      </section>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Yukleniyor...</p>
      ) : rides.length === 0 ? (
        <EmptyState kind="car" title="Su an planlanan bir yolculuk yok." subtitle="Ilk yolculugu sen paylas!" />
      ) : (
        <ul className="card-list">
          {rides.map((r) => {
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
