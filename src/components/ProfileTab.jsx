import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import VerifiedBadge from './VerifiedBadge'

function monthsSince(dateStr) {
  const start = new Date(dateStr)
  const now = new Date()
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (months < 1) return 'Bu ay katildi'
  if (months === 1) return '1 aydir yurtta'
  if (months < 12) return `${months} aydir yurtta`
  const years = Math.floor(months / 12)
  return years === 1 ? '1 yildir yurtta' : `${years} yildir yurtta`
}

export default function ProfileTab() {
  const { logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [section, setSection] = useState('bilgiler')

  async function load() {
    setLoading(true)
    try {
      setProfile(await api.profile.getMe())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <p className="muted">Yukleniyor...</p>
  if (error && !profile) return <p className="form-error">{error}</p>

  return (
    <div className="tab-content">
      <div className="new-item-card profile-header-card">
        <h2 style={{ marginTop: 0 }}>
          {profile.name} {profile.phoneVerified && <VerifiedBadge />}
        </h2>
        <p className="card-meta">{monthsSince(profile.createdAt)}</p>
        {profile.tags && (
          <div className="profile-socials">
            {profile.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
              .map((t) => (
                <span key={t} className="card-tag">
                  {t}
                </span>
              ))}
          </div>
        )}
      </div>

      <div className="admin-subnav">
        <button
          className={section === 'bilgiler' ? 'admin-subnav-btn active' : 'admin-subnav-btn'}
          onClick={() => setSection('bilgiler')}
        >
          Bilgiler
        </button>
        <button
          className={section === 'guvenlik' ? 'admin-subnav-btn active' : 'admin-subnav-btn'}
          onClick={() => setSection('guvenlik')}
        >
          Hesap & Guvenlik
        </button>
      </div>

      {section === 'bilgiler' && <InfoSection profile={profile} onSaved={setProfile} />}
      {section === 'guvenlik' && <SecuritySection profile={profile} onSaved={setProfile} onLogout={logout} />}
    </div>
  )
}

function InfoSection({ profile, onSaved }) {
  const [form, setForm] = useState({
    name: profile.name || '',
    university: profile.university || '',
    department: profile.department || '',
    block: profile.block || '',
    floor: profile.floor || '',
    roomNo: profile.roomNo || '',
    instagram: profile.instagram || '',
    linkedin: profile.linkedin || '',
    discord: profile.discord || '',
    tags: profile.tags || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const updated = await api.profile.updateMe(form)
      onSaved(updated)
      setSaved(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="new-item-card">
      <h2>Temel Bilgiler</h2>
      <div className="inline-form">
        <label className="profile-label">
          Ad Soyad
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label className="profile-label">
          Universite
          <input
            value={form.university}
            onChange={(e) => setForm({ ...form, university: e.target.value })}
            placeholder="orn. Ege Universitesi"
          />
        </label>
        <label className="profile-label">
          Bolum
          <input
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            placeholder="orn. Bilgisayar Muhendisligi"
          />
        </label>
      </div>

      <h2 style={{ marginTop: 20 }}>Yurt Konumu</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 10 }}>
        Tam oda numarani paylasmak zorunda degilsin - sadece blok/kat da yeterli.
      </p>
      <div className="inline-form">
        <label className="profile-label">
          Blok
          <input value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} placeholder="orn. A Blok" />
        </label>
        <label className="profile-label">
          Kat
          <input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="orn. 3. Kat" />
        </label>
        <label className="profile-label">
          Oda No (opsiyonel)
          <input value={form.roomNo} onChange={(e) => setForm({ ...form, roomNo: e.target.value })} />
        </label>
      </div>

      <h2 style={{ marginTop: 20 }}>Sosyal Medya</h2>
      <div className="inline-form">
        <label className="profile-label">
          Instagram
          <input
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder="kullaniciadi"
          />
        </label>
        <label className="profile-label">
          LinkedIn
          <input
            value={form.linkedin}
            onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
            placeholder="kullaniciadi"
          />
        </label>
        <label className="profile-label">
          Discord
          <input
            value={form.discord}
            onChange={(e) => setForm({ ...form, discord: e.target.value })}
            placeholder="kullaniciadi"
          />
        </label>
      </div>

      <h2 style={{ marginTop: 20 }}>Yetenek / Oyun Etiketleri</h2>
      <p className="muted" style={{ marginTop: -8, marginBottom: 10 }}>
        Virgulle ayir, orn: "Valorant oynar, C# kodlar, Gitar calar"
      </p>
      <div className="inline-form">
        <input
          value={form.tags}
          onChange={(e) => setForm({ ...form, tags: e.target.value })}
          placeholder="Valorant oynar, Piyano calar, ..."
        />
      </div>

      {error && <p className="form-error">{error}</p>}
      {saved && <p className="card-note">Kaydedildi.</p>}
      <button className="btn-primary" type="submit" disabled={saving} style={{ marginTop: 14 }}>
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>
    </form>
  )
}

function SecuritySection({ profile, onSaved, onLogout }) {
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' })
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordErr, setPasswordErr] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  const [emailForm, setEmailForm] = useState({ email: profile.email || '', currentPassword: '' })
  const [emailMsg, setEmailMsg] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [emailSaving, setEmailSaving] = useState(false)

  const [dmNotifications, setDmNotifications] = useState(profile.dmNotifications)
  const [notifSaving, setNotifSaving] = useState(false)

  const [deactivatePassword, setDeactivatePassword] = useState('')
  const [deactivateErr, setDeactivateErr] = useState('')
  const [deactivating, setDeactivating] = useState(false)
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false)

  async function handlePasswordChange(e) {
    e.preventDefault()
    setPasswordSaving(true)
    setPasswordErr('')
    setPasswordMsg('')
    try {
      await api.profile.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      setPasswordMsg('Sifre guncellendi.')
      setPasswordForm({ currentPassword: '', newPassword: '' })
    } catch (err) {
      setPasswordErr(err.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  async function handleEmailChange(e) {
    e.preventDefault()
    setEmailSaving(true)
    setEmailErr('')
    setEmailMsg('')
    try {
      const updated = await api.profile.updateEmail(emailForm.email, emailForm.currentPassword)
      onSaved(updated)
      setEmailMsg('E-posta guncellendi.')
      setEmailForm({ ...emailForm, currentPassword: '' })
    } catch (err) {
      setEmailErr(err.message)
    } finally {
      setEmailSaving(false)
    }
  }

  async function handleNotifToggle() {
    const next = !dmNotifications
    setNotifSaving(true)
    try {
      await api.profile.setNotifications(next)
      setDmNotifications(next)
    } catch (err) {
      // sessizce eski haline don
    } finally {
      setNotifSaving(false)
    }
  }

  async function handleDeactivate(e) {
    e.preventDefault()
    setDeactivating(true)
    setDeactivateErr('')
    try {
      await api.profile.deactivate(deactivatePassword)
      onLogout()
    } catch (err) {
      setDeactivateErr(err.message)
    } finally {
      setDeactivating(false)
    }
  }

  return (
    <div>
      <form onSubmit={handlePasswordChange} className="new-item-card">
        <h2>Sifre Degistir</h2>
        <div className="inline-form">
          <input
            type="password"
            placeholder="Mevcut sifre"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="Yeni sifre"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            required
            minLength={6}
          />
          {passwordErr && <p className="form-error">{passwordErr}</p>}
          {passwordMsg && <p className="card-note">{passwordMsg}</p>}
          <button className="btn-primary" type="submit" disabled={passwordSaving}>
            {passwordSaving ? 'Kaydediliyor...' : 'Sifreyi Guncelle'}
          </button>
        </div>
      </form>

      <form onSubmit={handleEmailChange} className="new-item-card">
        <h2>E-posta Guncelle</h2>
        <div className="inline-form">
          <input
            type="email"
            placeholder="Yeni e-posta"
            value={emailForm.email}
            onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Sifren (dogrulama icin)"
            value={emailForm.currentPassword}
            onChange={(e) => setEmailForm({ ...emailForm, currentPassword: e.target.value })}
            required
            minLength={6}
          />
          {emailErr && <p className="form-error">{emailErr}</p>}
          {emailMsg && <p className="card-note">{emailMsg}</p>}
          <button className="btn-primary" type="submit" disabled={emailSaving}>
            {emailSaving ? 'Kaydediliyor...' : 'E-postayi Guncelle'}
          </button>
        </div>
      </form>

      <div className="new-item-card">
        <h2>Bildirimler</h2>
        <div className="card-actions" style={{ marginTop: 0 }}>
          <button className="btn-secondary" disabled={notifSaving} onClick={handleNotifToggle}>
            {notifSaving ? 'Kaydediliyor...' : dmNotifications ? 'DM Bildirimleri: Acik' : 'DM Bildirimleri: Kapali'}
          </button>
        </div>
      </div>

      <div className="new-item-card">
        <h2>Hesabi Dondur / Sil</h2>
        <p className="card-note">
          Hesabini dondurursan tekrar giris yapamazsin. Yeniden aktif etmek icin yurt yoneticisiyle
          iletisime gecmen gerekir.
        </p>
        {!confirmingDeactivate ? (
          <button className="btn-secondary" onClick={() => setConfirmingDeactivate(true)}>
            Hesabimi Dondur
          </button>
        ) : (
          <form onSubmit={handleDeactivate} className="inline-form">
            <input
              type="password"
              placeholder="Sifren (onay icin)"
              value={deactivatePassword}
              onChange={(e) => setDeactivatePassword(e.target.value)}
              required
              minLength={6}
            />
            {deactivateErr && <p className="form-error">{deactivateErr}</p>}
            <div className="card-actions" style={{ marginTop: 0 }}>
              <button className="btn-secondary" type="submit" disabled={deactivating}>
                {deactivating ? 'Bekleyin...' : 'Evet, Hesabimi Dondur'}
              </button>
              <button className="btn-link" type="button" onClick={() => setConfirmingDeactivate(false)}>
                Vazgec
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
