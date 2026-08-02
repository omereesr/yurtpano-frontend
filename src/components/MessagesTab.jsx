import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { getSocket } from '../socket'
import ProfileLink from './ProfileLink'
import Avatar from './Avatar'
import ReportButton from './ReportButton'
import EmptyState from './EmptyState'

const CONTEXT_LABELS = {
  listing: 'Ikinci El Ilani',
  request: 'Sosyallesme Ilani',
  order: 'Ortak Siparis',
  ride: 'Yolculuk',
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

export default function MessagesTab() {
  const [view, setView] = useState('sohbetler') // sohbetler | istekler
  const [all, setAll] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState(null)

  async function load() {
    setLoading(true)
    try {
      setAll(await api.messages.getConversations())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()

    // Yeni bir mesaj ya da mesaj istegi geldiginde listeyi canli guncelle.
    const socket = getSocket()
    if (!socket) return
    const refresh = () => load()
    socket.on('message:new', refresh)
    socket.on('conversation:new', refresh)
    socket.on('conversation:accepted', refresh)
    return () => {
      socket.off('message:new', refresh)
      socket.off('conversation:new', refresh)
      socket.off('conversation:accepted', refresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "Sohbetler": kabul edilmis konusmalar + kendi gonderdigim ("baslattigim")
  // bekleyen istekler (kendi gonderdigin istek senin icin bir sohbet gibi
  // gorunur, karsi tarafta ise "istek" olarak kalir).
  const sohbetler = all.filter((c) => c.status === 'accepted' || (c.status === 'pending' && c.isInitiator))
  // "Istekler": sadece BASKASININ sana gonderdigi, henuz cevap vermedigin istekler.
  const istekler = all.filter((c) => c.status === 'pending' && !c.isInitiator)

  const list = view === 'sohbetler' ? sohbetler : istekler

  if (activeId) {
    return (
      <div className="tab-content">
        <button
          className="btn-link"
          onClick={() => {
            setActiveId(null)
            load()
          }}
        >
          ← Listeye don
        </button>
        <ConversationThread conversationId={activeId} onChanged={load} />
      </div>
    )
  }

  return (
    <div className="tab-content">
      <div className="admin-subnav">
        <button
          className={view === 'sohbetler' ? 'admin-subnav-btn active' : 'admin-subnav-btn'}
          onClick={() => setView('sohbetler')}
        >
          Sohbetler {sohbetler.length > 0 ? `(${sohbetler.length})` : ''}
        </button>
        <button
          className={view === 'istekler' ? 'admin-subnav-btn active' : 'admin-subnav-btn'}
          onClick={() => setView('istekler')}
        >
          Istekler {istekler.length > 0 ? `(${istekler.length})` : ''}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <p className="muted">Yukleniyor...</p>
      ) : list.length === 0 ? (
        <EmptyState
          kind="chat"
          title={view === 'sohbetler' ? 'Henuz bir sohbetin yok.' : 'Bekleyen mesaj istegin yok.'}
          subtitle={
            view === 'sohbetler'
              ? 'Bir ilana mesaj gonderdiginde burada gorunecek.'
              : ''
          }
        />
      ) : (
        <ul className="card-list">
          {list.map((c) => (
            <li key={c.id} className="card" onClick={() => setActiveId(c.id)} style={{ cursor: 'pointer' }}>
              {c.contextTitle && (
                <div className="card-tag">
                  {CONTEXT_LABELS[c.contextType] || 'Ilan'}: {c.contextTitle}
                </div>
              )}
              <div className="feed-card-header" style={{ marginTop: 6 }}>
                <Avatar name={c.otherUser?.name} size={28} />
                <h3 style={{ margin: 0 }}>
                  <ProfileLink userId={c.otherUser?.id} name={c.otherUser?.name} />
                </h3>
              </div>
              {c.lastMessage && <p className="card-note">{c.lastMessage.body}</p>}
              {view === 'istekler' && (
                <RequestActions conversationId={c.id} onDone={load} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function RequestActions({ conversationId, onDone }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function respond(action) {
    setBusy(true)
    setError('')
    try {
      if (action === 'accept') await api.messages.accept(conversationId)
      else await api.messages.decline(conversationId)
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card-actions" onClick={(e) => e.stopPropagation()}>
      {error && <p className="form-error">{error}</p>}
      <button className="btn-primary" disabled={busy} onClick={() => respond('accept')}>
        Kabul Et
      </button>
      <button className="btn-secondary" disabled={busy} onClick={() => respond('decline')}>
        Reddet
      </button>
    </div>
  )
}

function ConversationThread({ conversationId, onChanged }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  async function load() {
    try {
      setData(await api.messages.getMessages(conversationId))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()

    const socket = getSocket()
    if (!socket) return
    function handleNewMessage(payload) {
      if (payload.conversationId !== conversationId) return
      setData((prev) => (prev ? { ...prev, messages: [...prev.messages, payload.message] } : prev))
    }
    function handleDeleted(payload) {
      if (payload.conversationId !== conversationId) return
      setData((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== payload.messageId) } : prev
      )
    }
    socket.on('message:new', handleNewMessage)
    socket.on('message:deleted', handleDeleted)
    return () => {
      socket.off('message:new', handleNewMessage)
      socket.off('message:deleted', handleDeleted)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  async function handleSend(e) {
    e.preventDefault()
    if (!body.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const message = await api.messages.send(conversationId, body.trim())
      setBody('')
      setData((prev) => (prev ? { ...prev, messages: [...prev.messages, message] } : prev))
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(messageId) {
    try {
      await api.messages.deleteMessage(messageId)
      setData((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== messageId) } : prev
      )
    } catch (err) {
      setError(err.message)
    }
  }

  if (error && !data) return <p className="form-error">{error}</p>
  if (!data) return <p className="muted">Yukleniyor...</p>

  const isPendingForMe = data.conversation.status === 'pending' && data.conversation.initiatorId !== user.id
  const otherUserId =
    data.conversation.userAId === user.id ? data.conversation.userBId : data.conversation.userAId

  return (
    <div className="new-item-card" style={{ marginTop: 14 }}>
      {data.conversation.contextTitle && (
        <div className="card-tag">
          {CONTEXT_LABELS[data.conversation.contextType] || 'Ilan'}: {data.conversation.contextTitle}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ReportButton reportedUserId={otherUserId} contextType="message" contextId={conversationId} />
      </div>
      <div className="message-thread">
        {data.messages.map((m) => (
          <div key={m.id} className={m.senderId === user.id ? 'message-bubble mine' : 'message-bubble'}>
            <p>{m.body}</p>
            <div className="message-bubble-meta">
              <span className="message-bubble-time">{formatTime(m.createdAt)}</span>
              {m.senderId === user.id && (
                <button className="message-bubble-delete" onClick={() => handleDelete(m.id)}>
                  Sil
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isPendingForMe ? (
        <RequestActions
          conversationId={conversationId}
          onDone={() => {
            load()
            onChanged()
          }}
        />
      ) : data.conversation.status === 'declined' ? (
        <p className="card-note">Bu mesaj istegi reddedildi, artik mesaj gonderemezsin.</p>
      ) : (
        <form onSubmit={handleSend} className="inline-form" style={{ marginTop: 12 }}>
          <textarea
            placeholder="Mesajini yaz..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={2}
          />
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={sending || !body.trim()}>
            {sending ? 'Gonderiliyor...' : 'Gonder'}
          </button>
        </form>
      )}
    </div>
  )
}
