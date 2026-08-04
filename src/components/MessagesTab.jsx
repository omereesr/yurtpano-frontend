import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { getSocket } from '../socket'
import ProfileLink from './ProfileLink'
import Avatar from './Avatar'
import ReportButton from './ReportButton'
import EmptyState from './EmptyState'
import { formatClock } from '../utils/time'

const CONTEXT_LABELS = {
  listing: 'Ikinci El Ilani',
  request: 'Sosyallesme Ilani',
  order: 'Ortak Siparis',
  ride: 'Yolculuk',
}
const CONTEXT_TABS = { listing: 'listings', request: 'requests', order: 'orders', ride: 'rides' }

export default function MessagesTab({ onNavigate }) {
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
  // bekleyen istekler (kendi gonderdigin istek senin için bir sohbet gibi
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
        <ConversationThread conversationId={activeId} onChanged={load} onNavigate={onNavigate} />
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
        <p className="muted">Yükleniyor...</p>
      ) : list.length === 0 ? (
        <EmptyState
          kind="chat"
          title={view === 'sohbetler' ? 'Henuz bir sohbetin yok.' : 'Bekleyen mesaj istegin yok.'}
          subtitle={view === 'sohbetler' ? 'Bir ilana mesaj gonderdiginde burada gorunecek.' : ''}
        />
      ) : (
        <ul className="card-list">
          {list.map((c) => (
            <li
              key={c.id}
              className={c.unread ? 'card conversation-unread' : 'card'}
              onClick={() => setActiveId(c.id)}
              style={{ cursor: 'pointer' }}
            >
              {c.contextTitle && (
                <button
                  type="button"
                  className="card-tag context-tag-link"
                  onClick={(e) => {
                    e.stopPropagation() // konusmayi acmasin, direkt ilana gitsin
                    onNavigate?.(CONTEXT_TABS[c.contextType] || 'feed')
                  }}
                >
                  {CONTEXT_LABELS[c.contextType] || 'İlan'}: {c.contextTitle} ↗
                </button>
              )}
              <div className="feed-card-header" style={{ marginTop: 6 }}>
                {c.unread && <span className="unread-dot" title="Okunmadi" />}
                <Avatar name={c.otherUser?.name} size={28} isSystem={c.otherUser?.isSystem} />
                <h3 style={{ margin: 0 }} className={c.unread ? 'conversation-unread-title' : ''}>
                  {c.otherUser?.isSystem ? (
                    c.otherUser?.name
                  ) : (
                    <ProfileLink userId={c.otherUser?.id} name={c.otherUser?.name} />
                  )}
                </h3>
              </div>
              {c.lastMessage && (
                <p className={c.unread ? 'card-note conversation-unread-preview' : 'card-note'}>
                  {c.lastMessage.body}
                </p>
              )}
              {view === 'istekler' && <RequestActions conversationId={c.id} onDone={load} />}
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

function ConversationThread({ conversationId, onChanged, onNavigate }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [otherLastReadAt, setOtherLastReadAt] = useState(null)
  const threadRef = useRef(null)

  // Mesaj listesi degistikce (ilk yuklenme, yeni mesaj gelince/gonderilince)
  // WhatsApp/Instagram gibi otomatik olarak EN ALTA (en yeni mesaja) kay.
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [data?.messages?.length, otherTyping])

  async function load() {
    try {
      const result = await api.messages.getMessages(conversationId)
      setData(result)
      setOtherLastReadAt(result.conversation.otherLastReadAt)
      // Bu istek backend'de "okundu" zamanini da guncelliyor - ust bardaki
      // zil/avatar rozetindeki sayinin ANINDA dusmesi için global bir event
      // yayinliyoruz (F5 atmadan).
      window.dispatchEvent(new Event('yurtpano:messages-read'))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()

    const socket = getSocket()
    if (!socket) return
    let typingTimeout
    function handleNewMessage(payload) {
      if (payload.conversationId !== conversationId) return
      setData((prev) => (prev ? { ...prev, messages: [...prev.messages, payload.message] } : prev))
      setOtherTyping(false)
      window.dispatchEvent(new Event('yurtpano:messages-read'))
    }
    function handleDeleted(payload) {
      if (payload.conversationId !== conversationId) return
      setData((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== payload.messageId) } : prev
      )
    }
    function handleTyping(payload) {
      if (payload.conversationId !== conversationId) return
      setOtherTyping(true)
      clearTimeout(typingTimeout)
      typingTimeout = setTimeout(() => setOtherTyping(false), 3000)
    }
    function handleRead(payload) {
      if (payload.conversationId !== conversationId) return
      setOtherLastReadAt(new Date().toISOString())
    }
    socket.on('message:new', handleNewMessage)
    socket.on('message:deleted', handleDeleted)
    socket.on('typing', handleTyping)
    socket.on('messages:read', handleRead)
    return () => {
      socket.off('message:new', handleNewMessage)
      socket.off('message:deleted', handleDeleted)
      socket.off('typing', handleTyping)
      socket.off('messages:read', handleRead)
      clearTimeout(typingTimeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  function handleTypingInput(value) {
    setBody(value)
    const socket = getSocket()
    const otherUserId = data?.conversation?.otherUser?.id
    if (socket && otherUserId && !data?.conversation?.otherUser?.isSystem) {
      socket.emit('typing', { conversationId, toUserId: otherUserId })
    }
  }

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
  if (!data) return <p className="muted">Yükleniyor...</p>

  const otherUser = data.conversation.otherUser
  const isSystemThread = !!otherUser?.isSystem
  const isPendingForMe = data.conversation.status === 'pending' && data.conversation.initiatorId !== user.id
  // Benim gonderdigim son mesaj, karsi tarafin "okundu" zamanindan ONCE
  // gonderilmisse "Görüldü" gosterebiliriz.
  const myMessages = data.messages.filter((m) => m.senderId === user.id)
  const lastMineId = myMessages.length > 0 ? myMessages[myMessages.length - 1].id : null

  return (
    <div className="new-item-card" style={{ marginTop: 14 }}>
      <div className="feed-card-header">
        <Avatar name={otherUser?.name} size={32} isSystem={isSystemThread} />
        <h3 style={{ margin: 0 }}>
          {isSystemThread ? otherUser?.name : <ProfileLink userId={otherUser?.id} name={otherUser?.name} />}
        </h3>
        {!isSystemThread && (
          <ReportButton reportedUserId={otherUser?.id} contextType="message" contextId={conversationId} />
        )}
      </div>

      {data.conversation.contextTitle && (
        <button
          type="button"
          className="card-tag context-tag-link"
          onClick={() => onNavigate?.(CONTEXT_TABS[data.conversation.contextType] || 'feed')}
        >
          {CONTEXT_LABELS[data.conversation.contextType] || 'İlan'}: {data.conversation.contextTitle} ↗
        </button>
      )}

      <div className="message-thread" ref={threadRef}>
        {data.messages.map((m) => (
          <div key={m.id} className={m.senderId === user.id ? 'message-bubble mine' : 'message-bubble'}>
            <p>{m.body}</p>

            {/* Sistem mesaji "X kisi ilanina katıldı" ise, direkt o kisiye
                gidip mesaj atabilecegin ve ilana gidebilecegin kucuk
                baglantilar göster. */}
            {m.refUserId && (
              <div className="message-ref-chip">
                👤 <ProfileLink userId={m.refUserId} name={m.refUserName} />
              </div>
            )}
            {m.refContextId && onNavigate && (
              <button
                className="message-ref-chip message-ref-link"
                onClick={() => onNavigate(CONTEXT_TABS[m.refContextType] || 'feed')}
              >
                📎 {m.refContextTitle || 'Ilana git'}
              </button>
            )}

            <div className="message-bubble-meta">
              <span className="message-bubble-time">{formatClock(m.createdAt)}</span>
              {m.senderId === user.id && (
                <button className="message-bubble-delete" onClick={() => handleDelete(m.id)}>
                  Sil
                </button>
              )}
            </div>
            {m.id === lastMineId && otherLastReadAt && new Date(m.createdAt) <= new Date(otherLastReadAt) && (
              <span className="read-receipt">Görüldü ✓✓</span>
            )}
          </div>
        ))}
      </div>

      {otherTyping && <p className="typing-indicator">{otherUser?.name} yazıyor...</p>}

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
            onChange={(e) => handleTypingInput(e.target.value)}
            rows={2}
          />
          {error && <p className="form-error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={sending || !body.trim()}>
            {sending ? 'Gönderiliyor...' : 'Gönder'}
          </button>
        </form>
      )}
    </div>
  )
}
