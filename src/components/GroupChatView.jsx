import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { getSocket } from '../socket'
import ProfileLink from './ProfileLink'
import useFixedViewport from '../hooks/useFixedViewport'
import { formatClock } from '../utils/time'

// Bir ilana (Ortak Siparis/Yolculuk) katilan HERKESIN konusabildigi,
// ilan suresi boyunca yasayan grup sohbeti. MessagesTab'deki 1-1
// konusma penceresiyle ayni "tam ekran + klavye takibi" mantigini
// kullanir, ama basitlestirilmis: yanitlama/emoji tepkisi yok (v1),
// sadece gonder/al + kimin yazdigini goster + canli guncelleme.
export default function GroupChatView({ groupId, onBack }) {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const threadRef = useRef(null)
  const shellRef = useRef(null)
  const textareaRef = useRef(null)
  useFixedViewport(shellRef)

  async function load() {
    try {
      const result = await api.groups.getMessages(groupId)
      setData(result)
      window.dispatchEvent(new Event('yurtpano:messages-read'))
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    load()
    const socket = getSocket()
    if (!socket) return
    function handleNew(payload) {
      if (payload.groupId !== groupId) return
      setData((prev) => (prev ? { ...prev, messages: [...prev.messages, payload.message] } : prev))
      window.dispatchEvent(new Event('yurtpano:messages-read'))
    }
    socket.on('groupMessage:new', handleNew)
    function handleDeleted(payload) {
      if (payload.groupId !== groupId) return
      setData((prev) =>
        prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== payload.messageId) } : prev
      )
    }
    socket.on('groupMessage:deleted', handleDeleted)
    return () => {
      socket.off('groupMessage:new', handleNew)
      socket.off('groupMessage:deleted', handleDeleted)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
    })
    return () => cancelAnimationFrame(raf)
  }, [data?.messages?.length])

  function handleComposerFocus() {
    document.body.classList.add('composing')
  }
  function handleComposerBlur() {
    document.body.classList.remove('composing')
  }
  useEffect(() => {
    return () => document.body.classList.remove('composing')
  }, [])

  async function handleSend(e) {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed || sending) return

    const tempId = `temp-${Date.now()}`
    const optimisticMessage = {
      id: tempId,
      body: trimmed,
      senderId: user.id,
      sender: { id: user.id, name: user.name },
      createdAt: new Date().toISOString(),
      _sending: true,
    }
    setData((prev) => (prev ? { ...prev, messages: [...prev.messages, optimisticMessage] } : prev))
    setBody('')
    setSending(true)
    setError('')
    textareaRef.current?.focus()

    try {
      const message = await api.groups.send(groupId, trimmed)
      setData((prev) =>
        prev ? { ...prev, messages: prev.messages.map((m) => (m.id === tempId ? message : m)) } : prev
      )
    } catch (err) {
      setData((prev) => (prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) } : prev))
      setBody(trimmed)
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteMessage(messageId) {
    try {
      await api.groups.deleteMessage(groupId, messageId)
      setData((prev) => (prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== messageId) } : prev))
    } catch (err) {
      setError(err.message)
    }
  }

  if (error && !data) return <p className="form-error">{error}</p>
  if (!data) return <p className="muted">Yükleniyor...</p>

  return (
    <div className="messages-shell" ref={shellRef}>
      <div className="messages-header thread-header">
        <button className="btn-link thread-back" onClick={onBack}>
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0 }}>👥 {data.group.title}</h3>
          <button
            type="button"
            className="btn-link"
            style={{ fontSize: '0.75rem', padding: 0 }}
            onClick={() => setShowMembers((s) => !s)}
          >
            {data.members.length} kişi {showMembers ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {showMembers && (
        <div className="messages-header" style={{ borderTop: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.members.map((m) => (
              <span key={m.id} className="card-tag">
                <ProfileLink userId={m.id} name={m.name} />
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="messages-scroll" ref={threadRef}>
        {data.messages.length === 0 && (
          <p className="muted" style={{ textAlign: 'center', marginTop: 20 }}>
            Henüz mesaj yok - ilk mesajı sen yaz!
          </p>
        )}
        {data.messages.map((m) => {
          const isMine = m.senderId === user.id
          return (
            <div key={m.id} className={isMine ? 'message-group mine' : 'message-group'}>
              {!isMine && (
                <span className="card-meta" style={{ marginLeft: 4, marginBottom: 2 }}>
                  <ProfileLink userId={m.sender?.id} name={m.sender?.name} />
                </span>
              )}
              <div
                className={isMine ? 'message-bubble mine' : 'message-bubble'}
                style={m._sending ? { opacity: 0.6 } : undefined}
              >
                <p>{m.body}</p>
                <div className="message-bubble-meta">
                  <span className="message-bubble-time">
                    {m._sending ? 'Gönderiliyor...' : formatClock(m.createdAt)}
                  </span>
                  {isMine && !m._sending && (
                    <button className="message-bubble-delete" onClick={() => handleDeleteMessage(m.id)}>
                      Sil
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {data.group.isOpen === false ? (
        <p className="card-note" style={{ padding: '0 14px 14px' }}>
          ⏳ Bu ilanın süresi doldu/kapandı, grup sohbeti artık sadece geçmişi gösteriyor.
        </p>
      ) : (
        <form onSubmit={handleSend} className="messages-composer">
          <div className="messages-composer-row">
            <textarea
              ref={textareaRef}
              placeholder="Gruba yaz..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onFocus={handleComposerFocus}
              onBlur={handleComposerBlur}
              rows={1}
            />
            <button
              className="btn-primary composer-send"
              type="submit"
              disabled={sending || !body.trim()}
              onMouseDown={(e) => e.preventDefault()}
            >
              {sending ? '...' : 'Gönder'}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </form>
      )}
    </div>
  )
}
