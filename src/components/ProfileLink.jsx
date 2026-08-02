import { useEffect, useState } from 'react'
import { api } from '../api'
import MessageButton from './MessageButton'
import Avatar from './Avatar'
import VerifiedBadge from './VerifiedBadge'
import ReportButton from './ReportButton'

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

// Bir kart uzerindeki isme tiklayinca o kisinin profilini gosteren kucuk
// bir pencere acar. Ayni yurttan olmayan / bulunamayan kullanicilar icin
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

function ProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.profile
      .getUser(userId)
      .then(setProfile)
      .catch((err) => setError(err.message))
  }, [userId])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="btn-link modal-close" onClick={onClose}>
          Kapat ✕
        </button>

        {error && <p className="form-error">{error}</p>}
        {!profile && !error && <p className="muted">Yukleniyor...</p>}

        {profile && (
          <>
            <div className="profile-modal-header">
              <Avatar name={profile.name} size={48} />
              <div>
                <h2 style={{ margin: 0 }}>
                  {profile.name} {profile.phoneVerified && <VerifiedBadge />}
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

            <div style={{ marginTop: 14 }} className="card-actions">
              <MessageButton toUserId={profile.id} />
              <ReportButton reportedUserId={profile.id} contextType="user" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
