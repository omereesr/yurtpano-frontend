import { useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import MessageButton from './MessageButton'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'
import ReportButton from './ReportButton'

function monthsSince(dateStr) {
  const start = new Date(dateStr)
  const now = new Date()
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  if (months < 1) return 'Bu ay katıldı'
  if (months === 1) return '1 aydir yurtta'
  if (months < 12) return `${months} aydir yurtta`
  const years = Math.floor(months / 12)
  return years === 1 ? '1 yildir yurtta' : `${years} yildir yurtta`
}

// Bir kart uzerindeki isme tiklayinca o kisinin profilini gosteren kucuk
// bir pencere acar. Ayni yurttan olmayan / bulunamayan kullanıcılar için
// sessizce hata gosterir.
export default function ProfileLink({ userId, name, children }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className="profile-link"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        {children || name}
      </button>
      {open && <ProfileModal userId={userId} onClose={() => setOpen(false)} />}
    </>
  )
}

function StarRating({ userId, ratingAverage, ratingCount, myRating, onRated }) {
  const toast = useToast()
  const [hover, setHover] = useState(0)
  const [saving, setSaving] = useState(false)

  async function handleRate(score) {
    if (saving) return
    setSaving(true)
    try {
      const result = await api.profile.rate(userId, score)
      onRated(result)
      toast('Puanin kaydedildi ⭐')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={saving}
            className={n <= (hover || myRating || 0) ? 'filled' : ''}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => handleRate(n)}
          >
            ★
          </button>
        ))}
        <span className="rating-summary">
          {ratingCount > 0 ? `${ratingAverage.toFixed(1)} (${ratingCount} degerlendirme)` : 'Henuz puan yok'}
        </span>
      </div>
      {myRating && <p className="card-note" style={{ margin: '4px 0 0' }}>Senin puanin: {myRating} ⭐</p>}
    </div>
  )
}

function ProfileModal({ userId, onClose }) {
  const { user: me } = useAuth()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.profile
      .getUser(userId)
      .then(setProfile)
      .catch((err) => setError(err.message))
  }, [userId])

  const isOwnProfile = profile && me && profile.id === me.id

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn-link modal-close" onClick={onClose}>
          Kapat ✕
        </button>

        {error && <p className="form-error">{error}</p>}
        {!profile && !error && <p className="muted">Yükleniyor...</p>}

        {profile && (
          <>
            <div className="profile-modal-header">
              <Avatar name={profile.name} size={48} />
              <div>
                <h2 style={{ margin: 0 }}>
                  {profile.name} {profile.emailVerified && <VerifiedBadge />}
                </h2>
                <p className="card-meta" style={{ margin: '2px 0 0' }}>
                  {monthsSince(profile.createdAt)}
                </p>
              </div>
            </div>

            {(profile.university || profile.department) && (
              <p className="card-meta">
                {profile.university}
                {profile.university && profile.department ? ' - ' : ''}
                {profile.department}
              </p>
            )}
            {(profile.block || profile.floor || profile.roomNo) && (
              <p className="card-meta">
                {[profile.block, profile.floor, profile.roomNo ? `Oda ${profile.roomNo}` : null]
                  .filter(Boolean)
                  .join(' - ')}
              </p>
            )}

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

            {(profile.instagram || profile.linkedin || profile.discord) && (
              <div className="profile-socials">
                {profile.instagram && <span className="card-tag">Instagram: {profile.instagram}</span>}
                {profile.linkedin && <span className="card-tag">LinkedIn: {profile.linkedin}</span>}
                {profile.discord && <span className="card-tag">Discord: {profile.discord}</span>}
              </div>
            )}

            {isOwnProfile ? (
              // Kendi profilin: puan VEREMEZSIN, sadece aldigin puanin
              // ozetini goruyorsun. Mesaj/şikayet de anlamsiz, gizliyoruz.
              <p className="rating-summary" style={{ marginTop: 10 }}>
                ⭐{' '}
                {profile.ratingCount > 0
                  ? `${profile.ratingAverage.toFixed(1)} (${profile.ratingCount} degerlendirme)`
                  : 'Henuz puan almadin'}
              </p>
            ) : (
              <>
                <StarRating
                  userId={profile.id}
                  ratingAverage={profile.ratingAverage}
                  ratingCount={profile.ratingCount}
                  myRating={profile.myRating}
                  onRated={(result) => setProfile((p) => ({ ...p, ...result }))}
                />
                <div style={{ marginTop: 14 }} className="card-actions">
                  <MessageButton toUserId={profile.id} />
                  <ReportButton reportedUserId={profile.id} contextType="user" />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
