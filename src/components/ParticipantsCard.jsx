import Avatar from './Avatar'
import ProfileLink from './ProfileLink'
import VerifiedBadge from './VerifiedBadge'
import MessageButton from './MessageButton'

// Bir ilana (siparis/yolculuk) katilan herkesi gosteren kart. Katilanlar
// birbirini gorup dogrudan mesajlasabilir (sadece sahibiyle degil), ve
// ilan sahibi isterse bir katilimciyi kontenjandan cikarabilir.
export default function ParticipantsCard({ participants, isOwner, onRemove, contextType, contextId, contextTitle }) {
  if (!participants || participants.length === 0) return null

  return (
    <div className="participants-card">
      <p className="participants-card-title">Katılanlar ({participants.length})</p>
      <ul className="participants-list">
        {participants.map((p) => (
          <li key={p.id} className="participant-row">
            <Avatar name={p.user?.name} size={26} />
            <span className="participant-name">
              <ProfileLink userId={p.user?.id} name={p.user?.name} />
              {p.user?.emailVerified && <VerifiedBadge />}
            </span>
            <div className="participant-actions">
              <MessageButton
                toUserId={p.user?.id}
                contextType={contextType}
                contextId={contextId}
                contextTitle={contextTitle}
              />
              {isOwner && (
                <button
                  type="button"
                  className="btn-link participant-remove"
                  onClick={() => onRemove(p.user?.id)}
                >
                  Çıkar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
