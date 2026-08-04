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

export default function ListingsTab({ mode = 'browse', onPosted }) {
  const { user } = useAuth()
  const toast = useToast()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ title: '', description: '', price: '' })
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
      setListings(await api.getListings())
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
      if (payload.kind === 'listings') load(true)
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
      await api.createListing({
        title: form.title,
        description: form.description || undefined,
        price: Number(form.price),
      })
      setForm({ title: '', description: '', price: '' })
      toast('İlan verildi! 🎉')
      onPosted?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleSold(id) {
    if (isBusy(id, 'sold')) return
    setError('')
    setItemBusy(id, 'sold', true)

    // Satilan ilan "satista" listesinde gorunmeyecek, direkt cikar.
    const prevListings = listings
    setListings((prev) => prev.filter((l) => l.id !== id))

    try {
      await api.markSold(id)
      toast('Satildi olarak isaretlendi.')
    } catch (err) {
      setListings(prevListings)
      setError(err.message)
    } finally {
      setItemBusy(id, 'sold', false)
    }
  }

  async function handleCancel(id) {
    if (isBusy(id, 'cancel')) return
    setError('')
    setItemBusy(id, 'cancel', true)

    const prevListings = listings
    setListings((prev) => prev.filter((l) => l.id !== id))

    try {
      await api.cancelListing(id)
      toast('İlan kaldirildi.')
    } catch (err) {
      setListings(prevListings)
      setError(err.message)
    } finally {
      setItemBusy(id, 'cancel', false)
    }
  }

  if (mode === 'create') {
    return (
      <section className="new-item-card">
        <h2>Ikinci el esya sat</h2>
        <form onSubmit={handleCreate} className="inline-form">
          <input
            placeholder="Orn. Kettle - az kullanilmis"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            type="number"
            min="0"
            placeholder="Fiyat (TL)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
          <input
            placeholder="Detay (opsiyonel)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={creating}>
            {creating ? 'İlan Veriliyor...' : 'İlan Ver'}
          </button>
        </form>
      </section>
    )
  }

  const visibleListings = search
    ? listings.filter((l) => l.title.toLowerCase().includes(search.toLowerCase()))
    : listings

  return (
    <div className="tab-content">
      {listings.length > 0 && (
        <input
          className="search-box"
          placeholder="Esya ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}
      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <SkeletonList />
      ) : visibleListings.length === 0 ? (
        <EmptyState
          kind="box"
          title={search ? 'Aramana uyan esya yok.' : 'Su an satista esya yok.'}
          subtitle={search ? '' : '"İlan Ver" sekmesinden ilk esyani sen sat!'}
        />
      ) : (
        <ul className="card-list">
          {visibleListings.map((l) => (
            <li key={l.id} className="card">
              <div className="feed-card-header">
                <Avatar name={l.user?.name} size={28} />
                <span className="card-meta">
                  <ProfileLink userId={l.user?.id} name={l.user?.name} />
                  {l.user?.emailVerified && <VerifiedBadge />}
                  {l.user?.roomNo ? ` - Oda ${l.user.roomNo}` : ''}
                </span>
                <div className="card-tag">Ikinci El</div>
              </div>
              <h3>{l.title}</h3>
              <p className="card-meta">{timeAgo(l.createdAt)}</p>
              {l.description && <p className="card-note">{l.description}</p>}
              <p className="card-price">{l.price} TL</p>
              {l.userId === user.id ? (
                <div className="card-actions">
                  <button
                    className="btn-secondary"
                    disabled={isBusy(l.id, 'sold')}
                    onClick={() => handleSold(l.id)}
                  >
                    {isBusy(l.id, 'sold') ? 'Bekleyin...' : 'Satildi işaretle'}
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={isBusy(l.id, 'cancel')}
                    onClick={() => handleCancel(l.id)}
                  >
                    {isBusy(l.id, 'cancel') ? 'Bekleyin...' : 'İptal Et'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="card-actions">
                    <MessageButton
                      toUserId={l.userId}
                      contextType="listing"
                      contextId={l.id}
                      contextTitle={l.title}
                    />
                  </div>
                  <ReportButton reportedUserId={l.userId} contextType="listing" contextId={l.id} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
