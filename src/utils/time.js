// Kart uzerinde "14:32" gibi saat gosterimi
export function formatClock(dateStr) {
  return new Date(dateStr).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

// "5 dk once", "2 sa once" gibi goreli zaman
export function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'az once'
  if (mins < 60) return `${mins} dk once`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} sa once`
  return `${Math.floor(hours / 24)} gun once`
}

// Bir son kullanma tarihine ("60 dk sonra duser" gibi) ne kadar kaldigini
// gosterir. Suresi gecmisse null doner (o zaman zaten listeden dusmus olur).
export function timeUntil(dateStr) {
  if (!dateStr) return null
  const diffMs = new Date(dateStr).getTime() - Date.now()
  if (diffMs <= 0) return null
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'az sonra duser'
  if (mins < 60) return `${mins} dk sonra duser`
  const hours = Math.floor(mins / 60)
  return `${hours} sa ${mins % 60} dk sonra duser`
}
