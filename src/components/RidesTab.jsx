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
import ParticipantsCard from './ParticipantsCard'
import GroupChatView from './GroupChatView'
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
  const [openGroupId, setOpenGroupId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  async function openGroupChat(rideId) {
    try {
      const group = await api.groups.getByListing('ride', rideId)
      setOpenGroupId(group.id)
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  function startEdit(r) {
    setEditingId(r.id)
    setEditError('')
    // datetime-local input "YYYY-MM-DDTHH:mm" formati bekliyor - ISO'dan
    // saniye/zaman dilimi kismini kirpip donusturuyoruz.
    const localDateTime = new Date(r.departureAt).toISOString().slice(0, 16)
    setEditForm({
      destination: r.destination,
      departureAt: localDateTime,
      seatsTotal: r.seatsTotal,
      note: r.note || '',
    })
  }

  async function handleEditSave(rideId) {
    setEditSaving(true)
    setEditError('')
    try {
      const payload = {
        destination: editForm.destination,
        departureAt: new Date(editForm.departureAt).toISOString(),
        seatsTotal: Number(editForm.seatsTotal),
        note: editForm.note || null,
      }
      await api.updateRide(rideId, payload)
      toast('İlan güncellendi.')
      setEditingId(null)
      await load(true)
    } catch (err) {
      setEditError(err.message)
    } finally {
      setEditSaving(false)
    }
  }

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

    // NOT: sahibi onay istiyorsa bu bir KOLTUK KAPMA degil, bir ISTEK
    // olur - optimistic guncelleme yapamayiz, once sunucudan sonucu
    // ogrenmemiz gerekiyor.
    try {
      const result = await api.joinRide(id)
      if (result?.pending) {
        toast('İstek gönderildi, sahibi onaylayınca katılmış olacaksın.')
      } else {
        toast('Koltugu kaptin!')
      }
      await load(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setItemBusy(id, 'join', false)
    }
  }

  async function handleApproveJoin(rideId, userId) {
    const key = `${rideId}:approve:${userId}`
    if (busy[key]) return
    setBusy((b) => ({ ...b, [key]: true }))
    setError('')
    try {
      await api.approveRideJoin(rideId, userId)
      toast('Katılım onaylandı.')
      await load(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy((b) => ({ ...b, [key]: false }))
    }
  }

  async function handleDeclineJoin(rideId, userId) {
    const key = `${rideId}:decline:${userId}`
    if (busy[key]) return
    setBusy((b) => ({ ...b, [key]: true }))
    setError('')
    try {
      await api.declineRideJoin(rideId, userId)
      toast('İstek reddedildi.')
      await load(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy((b) => ({ ...b, [key]: false }))
    }
  }

  async function handleRemoveParticipant(rideId, participantUserId) {
    if (isBusy(rideId, 'remove')) return
    setError('')
    setItemBusy(rideId, 'remove', true)

    const prevRides = rides
    setRides((prev) =>
      prev.map((r) =>
        r.id === rideId
          ? {
              ...r,
              seatsTaken: Math.max(1, r.seatsTaken - 1),
              status: r.status === 'closed' ? 'open' : r.status,
              participants: r.participants.filter((p) => p.user?.id !== participantUserId),
            }
          : r
      )
    )

    try {
      await api.removeRideParticipant(rideId, participantUserId)
      toast('Katılımcı çıkarıldı.')
      await load(true)
    } catch (err) {
      setRides(prevRides)
      setError(err.message)
    } finally {
      setItemBusy(rideId, 'remove', false)
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
      toast('Yolculuktan ayrıldın.')
      await load(true)
    } catch (err) {
      setRides(prevRides)
      setError(err.message)
    } finally {
      setItemBusy(id, 'leave', false)
    }
  }

  if (openGroupId) {
    return <GroupChatView groupId={openGroupId} onBack={() => setOpenGroupId(null)} />
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
            min="1"
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
          <p className="muted" style={{ fontSize: '0.8rem', marginTop: -6 }}>
            💡 Varsayılan olarak "Koltuk Kap"a basan direkt katılır. Önce senin onayını istemelerini
            istersen, <strong>Profilim → İlan Katılım Tercihi</strong>'nden değiştirebilirsin.
          </p>
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
          subtitle={search ? '' : '"İlan Ver" sekmesinden ilk yolculugu sen paylas!'}
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
                    {r.owner?.emailVerified && <VerifiedBadge />}
                  </span>
                  <div className="card-tag">Yolculuk</div>
                </div>
                {editingId === r.id ? (
                  <div className="inline-form" style={{ marginTop: 8 }}>
                    <input
                      value={editForm.destination}
                      onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                      placeholder="Nereye"
                    />
                    <input
                      type="datetime-local"
                      value={editForm.departureAt}
                      onChange={(e) => setEditForm({ ...editForm, departureAt: e.target.value })}
                    />
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={editForm.seatsTotal}
                      onChange={(e) => setEditForm({ ...editForm, seatsTotal: e.target.value })}
                      placeholder="Koltuk sayısı"
                    />
                    <input
                      value={editForm.note}
                      onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                      placeholder="Not (opsiyonel)"
                    />
                    {editError && <p className="form-error">{editError}</p>}
                    <div className="card-actions">
                      <button
                        className="btn-primary"
                        disabled={editSaving}
                        onClick={() => handleEditSave(r.id)}
                      >
                        {editSaving ? 'Kaydediliyor...' : 'Kaydet'}
                      </button>
                      <button className="btn-secondary" disabled={editSaving} onClick={() => setEditingId(null)}>
                        Vazgeç
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>{r.destination}</h3>
                    <p className="card-meta">
                      {new Date(r.departureAt).toLocaleString('tr-TR')} - {timeAgo(r.createdAt)} paylasildi
                    </p>
                    {r.note && <p className="card-note">{r.note}</p>}
                    {r.ownerId === user.id && (
                      <button type="button" className="btn-link" onClick={() => startEdit(r)}>
                        ✏️ Düzenle
                      </button>
                    )}
                  </>
                )}
                <p className="card-meta">
                  Koltuk: {r.seatsTaken}/{r.seatsTotal}
                </p>
                {r.ownerId === user.id && r.pendingParticipants?.length > 0 && (
                  <div className="participants-card" style={{ borderColor: 'var(--accent-amber)' }}>
                    <p className="participants-card-title">
                      ⏳ Bekleyen İstekler ({r.pendingParticipants.length})
                    </p>
                    <ul className="participants-list">
                      {r.pendingParticipants.map((p) => (
                        <li key={p.id} className="participant-row">
                          <Avatar name={p.user?.name} size={26} />
                          <span className="participant-name">{p.user?.name}</span>
                          <div className="participant-actions">
                            <button
                              className="btn-secondary"
                              disabled={busy[`${r.id}:approve:${p.user.id}`]}
                              onClick={() => handleApproveJoin(r.id, p.user.id)}
                            >
                              Onayla
                            </button>
                            <button
                              className="btn-link participant-remove"
                              disabled={busy[`${r.id}:decline:${p.user.id}`]}
                              onClick={() => handleDeclineJoin(r.id, p.user.id)}
                            >
                              Reddet
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <ParticipantsCard
                  participants={r.participants}
                  isOwner={r.ownerId === user.id}
                  onRemove={(participantUserId) => handleRemoveParticipant(r.id, participantUserId)}
                  contextType="ride"
                  contextId={r.id}
                  contextTitle={r.destination}
                />

                {(r.ownerId === user.id || alreadyJoined) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: 8 }}
                    onClick={() => openGroupChat(r.id)}
                  >
                    👥 Grup Sohbeti
                  </button>
                )}

                <div className="card-actions">
                  {r.ownerId === user.id ? (
                    <button
                      className="btn-secondary"
                      disabled={isBusy(r.id, 'cancel')}
                      onClick={() => handleCancel(r.id)}
                    >
                      {isBusy(r.id, 'cancel') ? 'Bekleyin...' : 'İptal Et'}
                    </button>
                  ) : alreadyJoined ? (
                    <button
                      className="btn-secondary"
                      disabled={isBusy(r.id, 'leave')}
                      onClick={() => handleLeave(r.id)}
                    >
                      {isBusy(r.id, 'leave') ? 'Bekleyin...' : 'Ayrıl'}
                    </button>
                  ) : (
                    <>
                      <button
                        className="btn-secondary"
                        disabled={r.seatsTaken >= r.seatsTotal || isBusy(r.id, 'join') || r.myPendingRequest}
                        onClick={() => handleJoin(r.id)}
                      >
                        {isBusy(r.id, 'join')
                          ? 'Kapılıyor...'
                          : r.myPendingRequest
                            ? '⏳ Onay Bekleniyor'
                            : 'Koltuk Kap'}
                      </button>
                      <MessageButton
                        toUserId={r.ownerId}
                        contextType="ride"
                        contextId={r.id}
                        contextTitle={r.destination}
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
