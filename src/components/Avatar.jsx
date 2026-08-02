// Isme gore sabit (deterministik) bir renk secip bas harf(ler)i gosteren
// kucuk yuvarlak avatar. Gercek bir fotograf yuklemesi olmadigi icin bu,
// kartlarin "kim actı" hissini gucllendiren en ucuz/hizli cozum.
const PALETTE = ['#2f6f5e', '#e2a33d', '#c1483b', '#3d6fa8', '#8a5fc7', '#c76f9e']

function colorFor(name) {
  if (!name) return PALETTE[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function initialsFor(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] || ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export default function Avatar({ name, size = 32, isSystem = false }) {
  if (isSystem) {
    return (
      <div
        className="avatar avatar-system"
        style={{ width: size, height: size, fontSize: size * 0.5 }}
        title="Sistem bildirimi"
      >
        🔔
      </div>
    )
  }

  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: colorFor(name),
      }}
    >
      {initialsFor(name)}
    </div>
  )
}
