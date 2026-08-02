import { useState } from 'react'
import { api } from '../api'

// Bir kart uzerinde "Mesaj Gonder" butonu -> tiklaninca kucuk bir mesaj
// kutusu acilir. Gonderilince baglam (hangi ilan/siparis oldugu) otomatik
// eklenir ki karsi taraf mesajin ustunde kucuk bir kart gorup konuyu
// hemen anlasin.
export default function MessageButton({ toUserId, contextType, contextId, contextTitle }) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!body.trim() || sending) return
    setSending(true)
    setError('')
    try {
      await api.messages.start({ toUserId, contextType, contextId, contextTitle, body: body.trim() })
      setSent(true)
      setBody('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return <p className="card-note">Mesajin gonderildi. "Mesajlar" sekmesinden takip edebilirsin.</p>
  }

  if (!open) {
    return (
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        Mesaj Gonder
      </button>
    )
  }

  return (
    <div className="message-composer">
      <textarea
        placeholder="Merhaba, bu konuda..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
      />
      {error && <p className="form-error">{error}</p>}
      <div className="card-actions">
        <button className="btn-primary" disabled={sending || !body.trim()} onClick={handleSend}>
          {sending ? 'Gonderiliyor...' : 'Gonder'}
        </button>
        <button className="btn-link" onClick={() => setOpen(false)}>
          Vazgec
        </button>
      </div>
    </div>
  )
}
