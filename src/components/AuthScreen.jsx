import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function AuthScreen() {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    dormId: '',
    roomNo: '',
    otpCode: '',
  })
  const [identifier, setIdentifier] = useState('') // giriste email veya telefon
  const [loginPassword, setLoginPassword] = useState('')
  const [dorms, setDorms] = useState([])
  const [dormsError, setDormsError] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // OTP akisi icin ayri durum: telefon dogrulanana kadar formun geri kalani
  // gizli kalir, kullanici once "Kod Gonder"e basar.
  const [otpSent, setOtpSent] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpInfo, setOtpInfo] = useState('')

  useEffect(() => {
    api
      .getDorms()
      .then(setDorms)
      .catch(() => setDormsError('Yurt listesi yuklenemedi. Backend calisiyor mu?'))
  }, [])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSendOtp() {
    if (form.phone.length < 10 || otpSending) return
    setError('')
    setOtpSending(true)
    try {
      const res = await api.requestOtp(form.phone)
      setOtpSent(true)
      setOtpInfo(
        res.devCode
          ? `Gelistirme modu: dogrulama kodu "${res.devCode}" (gercek SMS gonderilmedi)`
          : 'Kod telefonuna gonderildi.'
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setOtpSending(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(identifier, loginPassword)
      } else {
        await register({ ...form, email: form.email || undefined })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="pin-dot" />
          <h1>YurtPano</h1>
        </div>
        <p className="auth-tagline">Ayni catinin altinda dayanisma panosu.</p>

        <div className="auth-toggle">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => setMode('login')}
          >
            Giris Yap
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => setMode('register')}
          >
            Kayit Ol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' ? (
            <>
              <label>
                Telefon
                <input
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  placeholder="5551112233"
                  required
                  minLength={10}
                  disabled={otpSent}
                />
              </label>

              {!otpSent ? (
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={form.phone.length < 10 || otpSending}
                  onClick={handleSendOtp}
                >
                  {otpSending ? 'Gonderiliyor...' : 'Dogrulama Kodu Gonder'}
                </button>
              ) : (
                <>
                  {otpInfo && <p className="card-note">{otpInfo}</p>}
                  <label>
                    SMS ile Gelen Kod
                    <input
                      value={form.otpCode}
                      onChange={(e) => update('otpCode', e.target.value)}
                      placeholder="6 haneli kod"
                      required
                      minLength={6}
                      maxLength={6}
                    />
                  </label>

                  <label>
                    Ad Soyad
                    <input
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      required
                      minLength={2}
                    />
                  </label>
                  <label>
                    Yurdun
                    {dormsError ? (
                      <span className="form-error">{dormsError}</span>
                    ) : (
                      <select
                        value={form.dormId}
                        onChange={(e) => update('dormId', e.target.value)}
                        required
                      >
                        <option value="" disabled>
                          Yurdunu sec...
                        </option>
                        {dorms.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.city ? `${d.city} - ${d.name}` : d.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                  <label>
                    Oda No (opsiyonel)
                    <input value={form.roomNo} onChange={(e) => update('roomNo', e.target.value)} />
                  </label>
                  <label>
                    E-posta (opsiyonel)
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="ornek@ogr.edu.tr"
                    />
                  </label>
                  <label>
                    Sifre
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      required
                      minLength={6}
                    />
                  </label>
                </>
              )}
            </>
          ) : (
            <>
              <label>
                Telefon veya E-posta
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="5551112233 ya da ornek@ogr.edu.tr"
                  required
                  minLength={3}
                />
              </label>
              <label>
                Sifre
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </label>
            </>
          )}

          {error && <p className="form-error">{error}</p>}

          {(mode === 'login' || otpSent) && (
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Bekleyin...' : mode === 'login' ? 'Giris Yap' : 'Kayit Ol'}
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
