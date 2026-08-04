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
  listing: 'İkinci El İlanı',
  request: 'Sosyalleşme İlanı',
  order: 'Ortak Sipariş',
  ride: 'Yolculuk',
}
const CONTEXT_TABS = { listing: 'listings', request: 'requests', order: 'orders', ride: 'rides' }
const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

// Butun sekme artik tam yukseklikte, WhatsApp benzeri bir "kabuk" -
// normal sayfa dolgusunu/kaydirmasini iptal edip kendi ic kaydirmasini
// yonetiyor (.messages-shell). Liste ve konusma ayni "ekran" gibi
// birbirinin yerine geciyor (mobilde WhatsApp'in yaptigi gibi).
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

  const sohbetler = all.filter((c) => c.status === 'accepted' || (c.status === 'pending' && c.isInitiator))
  const istekler = all.filter((c) => c.status === 'pending' && !c.isInitiator)
  const list = view === 'sohbetler' ? sohbetler : istekler

  if (activeId) {
    return (
      <ConversationThread
        conversationId={activeId}
        onBack={() => {
          setActiveId(null)
          load()
        }}
        onChanged={load}
        onNavigate={onNavigate}
      />
    )
  }

  return (
    <div className="messages-shell">
      <div className="messages-header">
        <div className="admin-subnav" style={{ margin: 0, border: 'none', padding: 0 }}>
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
            İstekler {istekler.length > 0 ? `(${istekler.length})` : ''}
          </button>
        </div>
      </div>

      <div className="messages-scroll">
        {error && <p className="form-error">{error}</p>}
        {loading ? (
          <p className="muted">Yükleniyor...</p>
        ) : list.length === 0 ? (
          <EmptyState
            kind="chat"
            title={view === 'sohbetler' ? 'Henüz bir sohbetin yok.' : 'Bekleyen mesaj isteğin yok.'}
            subtitle={view === 'sohbetler' ? 'Bir ilana mesaj gönderdiğinde burada görünecek.' : ''}
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
                      e.stopPropagation()
                      onNavigate?.(CONTEXT_TABS[c.contextType] || 'feed')
                    }}
                  >
                    {CONTEXT_LABELS[c.contextType] || 'İlan'}: {c.contextTitle} ↗
                  </button>
                )}
                <div className="feed-card-header" style={{ marginTop: 6 }}>
                  {c.unread && <span className="unread-dot" title="Okunmadı" />}
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

function ConversationThread({ conversationId, onBack, onChanged, onNavigate }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [otherTyping, setOtherTyping] = useState(false)
  const [otherLastReadAt, setOtherLastReadAt] = useState(null)
  const [replyTo, setReplyTo] = useState(null) // { id, body, senderName }
  const threadRef = useRef(null)
  const shellRef = useRef(null)

  // ONEMLI: dvh/yukseklik hesaplarina guvenmek yerine, klavye acikken
  // GERCEKTE ne kadar alan kapladigini DOGRUDAN olcup, kabugun altina
  // tam o kadar bosluk (padding) ekliyoruz. Bu, tarayicidan tarayiciya
  // degisen "visualViewport kuculur mu / kayar mi" farklarindan
  // BAGIMSIZ calisan, en guvenilir yontem.
  useEffect(() => {
    function updateKeyboardInset() {
      if (!shellRef.current || !window.visualViewport) return
      const vv = window.visualViewport
      const inset = window.innerHeight - vv.height - vv.offsetTop
      shellRef.current.style.paddingBottom = `${Math.max(0, Math.round(inset))}px`
    }
    updateKeyboardInset()
    window.visualViewport?.addEventListener('resize', updateKeyboardInset)
    window.visualViewport?.addEventListener('scroll', updateKeyboardInset)
    return () => {
      window.visualViewport?.removeEventListener('resize', updateKeyboardInset)
      window.visualViewport?.removeEventListener('scroll', updateKeyboardInset)
    }
  }, [])

  useEffect(() => {
    // requestAnimationFrame: tarayici yeni mesaji/yuksekligi tam
    // yerlestirdikten SONRA kaydirmayi tetikler - aksi halde bazen
    // (ozellikle ilk acilista) scrollHeight henuz guncel olmadan
    // kaydirma yapilip en alta tam ulasamiyordu.
    const raf = requestAnimationFrame(() => {
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [data?.messages?.length, otherTyping])

  async function load() {
    try {
      const result = await api.messages.getMessages(conversationId)
      setData(result)
      setOtherLastReadAt(result.conversation.otherLastReadAt)
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
    function handleReaction(payload) {
      if (payload.conversationId !== conversationId) return
      setData((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m
              ),
            }
          : prev
      )
    }
    socket.on('message:new', handleNewMessage)
    socket.on('message:deleted', handleDeleted)
    socket.on('typing', handleTyping)
    socket.on('messages:read', handleRead)
    socket.on('reaction:changed', handleReaction)
    return () => {
      socket.off('message:new', handleNewMessage)
      socket.off('message:deleted', handleDeleted)
      socket.off('typing', handleTyping)
      socket.off('messages:read', handleRead)
      socket.off('reaction:changed', handleReaction)
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

  // Telefonda klavye acilinca alt navigasyon barinin klavyenin ustunde
  // garip bir sekilde durmasini/kaymasini onlemek icin, yazarken alt
  // barin tamamen gizlenmesini sagliyoruz - sadece yazma kutusu kalir,
  // tam klavyenin ustunde.
  function handleComposerFocus() {
    document.body.classList.add('composing')
  }
  function handleComposerBlur() {
    document.body.classList.remove('composing')
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!body.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const message = await api.messages.send(conversationId, body.trim(), replyTo?.id)
      setBody('')
      setReplyTo(null)
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

  async function handleReact(messageId, emoji) {
    // Iyimser (optimistic) guncelleme: sunucuyu beklemeden aninda goster.
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        messages: prev.messages.map((m) => {
          if (m.id !== messageId) return m
          const mine = m.reactions?.find((r) => r.user?.id === user.id)
          let reactions = m.reactions || []
          if (mine && mine.emoji === emoji) {
            reactions = reactions.filter((r) => r.id !== mine.id)
          } else if (mine) {
            reactions = reactions.map((r) => (r.id === mine.id ? { ...r, emoji } : r))
          } else {
            reactions = [...reactions, { id: `temp-${Date.now()}`, emoji, user: { id: user.id, name: user.name } }]
          }
          return { ...m, reactions }
        }),
      }
    })
    try {
      await api.messages.react(messageId, emoji)
    } catch (err) {
      load() // hata olursa gercek veriyle senkronize et
    }
  }

  function scrollToMessage(messageId) {
    const el = threadRef.current?.querySelector(`[data-message-id="${messageId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('message-bubble-flash')
      setTimeout(() => el.classList.remove('message-bubble-flash'), 900)
    }
  }

  // Konusma ekranindan cikarken (geri donunce, baska sekmeye gecince)
  // "composing" sinifi yapiskan kalip alt bari sonsuza kadar gizli
  // birakmasin diye guvenlik agi.
  useEffect(() => {
    return () => document.body.classList.remove('composing')
  }, [])

  if (error && !data) return <p className="form-error">{error}</p>
  if (!data) return <p className="muted">Yükleniyor...</p>

  const otherUser = data.conversation.otherUser
  const isSystemThread = !!otherUser?.isSystem
  const isPendingForMe = data.conversation.status === 'pending' && data.conversation.initiatorId !== user.id
  const myMessages = data.messages.filter((m) => m.senderId === user.id)
  const lastMineId = myMessages.length > 0 ? myMessages[myMessages.length - 1].id : null

  return (
    <div className="messages-shell" ref={shellRef}>
      <div className="messages-header thread-header">
        <button className="btn-link thread-back" onClick={onBack}>
          ←
        </button>
        <Avatar name={otherUser?.name} size={32} isSystem={isSystemThread} />
        <h3 style={{ margin: 0, flex: 1 }}>
          {isSystemThread ? otherUser?.name : <ProfileLink userId={otherUser?.id} name={otherUser?.name} />}
        </h3>
        {!isSystemThread && (
          <ReportButton reportedUserId={otherUser?.id} contextType="message" contextId={conversationId} />
        )}
      </div>

      <div className="messages-scroll" ref={threadRef}>
        {data.messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            isMine={m.senderId === user.id}
            showContextTag={i === 0 && data.conversation.contextTitle}
            contextLabel={CONTEXT_LABELS[data.conversation.contextType] || 'İlan'}
            contextTitle={data.conversation.contextTitle}
            onNavigateToContext={() => onNavigate?.(CONTEXT_TABS[data.conversation.contextType] || 'feed')}
            onNavigate={onNavigate}
            onDelete={() => handleDelete(m.id)}
            onReply={() => setReplyTo({ id: m.id, body: m.body, senderName: m.sender?.name })}
            onReact={(emoji) => handleReact(m.id, emoji)}
            onQuoteClick={() => m.replyToId && scrollToMessage(m.replyToId)}
            showReadReceipt={
              m.id === lastMineId && otherLastReadAt && new Date(m.createdAt) <= new Date(otherLastReadAt)
            }
          />
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
        <p className="card-note" style={{ padding: '0 14px 14px' }}>
          Bu mesaj isteği reddedildi, artık mesaj gönderemezsin.
        </p>
      ) : (
        <form onSubmit={handleSend} className="messages-composer">
          {replyTo && (
            <div className="reply-preview-bar">
              <div className="reply-preview-text">
                <strong>{replyTo.senderName}</strong>
                <span>{replyTo.body}</span>
              </div>
              <button type="button" className="reply-preview-cancel" onClick={() => setReplyTo(null)}>
                ✕
              </button>
            </div>
          )}
          <div className="messages-composer-row">
            <textarea
              placeholder="Mesajını yaz..."
              value={body}
              onChange={(e) => handleTypingInput(e.target.value)}
              onFocus={handleComposerFocus}
              onBlur={handleComposerBlur}
              rows={1}
            />
            <button className="btn-primary composer-send" type="submit" disabled={sending || !body.trim()}>
              {sending ? '...' : 'Gönder'}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      )}
    </div>
  )
}

// Tek bir mesaj balonu: yaniti (varsa) tirnak icinde gosterir, emoji
// tepkilerini gosterir/toplar, ve WhatsApp'taki gibi "cek" (swipe) ile
// veya kucuk bir butonla cevap verilebilir.
function MessageBubble({
  message: m,
  isMine,
  showContextTag,
  contextLabel,
  contextTitle,
  onNavigateToContext,
  onNavigate,
  onDelete,
  onReply,
  onReact,
  onQuoteClick,
  showReadReceipt,
}) {
  const [showPicker, setShowPicker] = useState(false)

  // Tepkileri emoji'ye gore grupluyoruz: {emoji: [kullanicilar]}
  const grouped = {}
  ;(m.reactions || []).forEach((r) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = []
    grouped[r.emoji].push(r.user?.name || '?')
  })

  return (
    <div className="message-group-wrap" data-message-id={m.id}>
      <div className={isMine ? 'message-group mine' : 'message-group'}>
        {showContextTag && (
          <button
            type="button"
            className={isMine ? 'card-tag context-tag-link context-tag-attached mine' : 'card-tag context-tag-link context-tag-attached'}
            onClick={onNavigateToContext}
          >
            {contextLabel}: {contextTitle} ↗
          </button>
        )}

        <div className="message-bubble-row">
          {!isMine && (
            <button type="button" className="message-hover-btn reply-btn" onClick={onReply} title="Yanıtla">
              ↩
            </button>
          )}
          <div className={isMine ? 'message-bubble mine' : 'message-bubble'}>
            {m.replyToId && (
              <button type="button" className="message-quote" onClick={onQuoteClick}>
                <strong>{m.replyToSenderName}</strong>
                <span>{m.replyToBody}</span>
              </button>
            )}
            <p>{m.body}</p>

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
                📎 {m.refContextTitle || 'İlana git'}
              </button>
            )}

            <div className="message-bubble-meta">
              <span className="message-bubble-time">{formatClock(m.createdAt)}</span>
              {isMine && (
                <button className="message-bubble-delete" onClick={onDelete}>
                  Sil
                </button>
              )}
            </div>
            {showReadReceipt && <span className="read-receipt">Görüldü ✓✓</span>}
          </div>
          {isMine && (
            <button type="button" className="message-hover-btn reply-btn" onClick={onReply} title="Yanıtla">
              ↩
            </button>
          )}
          <button
            type="button"
            className="message-hover-btn react-btn"
            onClick={() => setShowPicker((s) => !s)}
            title="Tepki ver"
          >
            🙂
          </button>
        </div>

        {showPicker && (
          <div className="reaction-picker">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onReact(e)
                  setShowPicker(false)
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {Object.keys(grouped).length > 0 && (
          <div className="reaction-pills">
            {Object.entries(grouped).map(([emoji, names]) => (
              <button
                key={emoji}
                type="button"
                className="reaction-pill"
                title={names.join(', ')}
                onClick={() => onReact(emoji)}
              >
                {emoji} {names.length > 1 ? names.length : ''}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
