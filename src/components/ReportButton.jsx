import { useState } from 'react'
import { api } from '../api'

const REASONS = ['Spam', 'Uygunsuz davranis', 'Sahte ilan', 'Taciz', 'Diger']

// Bir kullaniciyi/ilani şikayet etmek için kucuk bir form acan buton.
// contextType/contextId verilirse (orn. bir ilan) şikayet ona baglanir.
export default function ReportButton({ reportedUserId, contextType, contextId }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    setSending(true)
    setError('')
    try {
      await api.reports.create({ reason, details: details || undefined, reportedUserId, contextType, contextId })
      setSent(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return <p className="card-note">Sikayetin iletildi, yönetici inceleyecek.</p>
  }

  if (!open) {
    return (
      <button type="button" className="btn-link report-link" onClick={() => setOpen(true)}>
        Şikayet Et
      </button>
    )
  }

  return (
    <div className="message-composer">
      <select value={reason} onChange={(e) => setReason(e.target.value)}>
        {REASONS.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>
      <textarea
        placeholder="Detay (opsiyonel)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        rows={2}
        style={{ marginTop: 6 }}
      />
      {error && <p className="form-error">{error}</p>}
      <div className="card-actions">
        <button className="btn-secondary" disabled={sending} onClick={handleSend}>
          {sending ? 'Gönderiliyor...' : 'Sikayeti Gönder'}
        </button>
        <button className="btn-link" onClick={() => setOpen(false)}>
          Vazgec
        </button>
      </div>
    </div>
  )
}
