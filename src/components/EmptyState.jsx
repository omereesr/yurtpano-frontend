// Bos liste durumlarinda duz bir yazi yerine soluk bir ikon + teşvik edici
// bir mesaj gosteriyoruz. Ikon secimi "kind" prop'una gore degisir.
const ICONS = {
  box: (
    <svg viewBox="0 0 64 64" width="56" height="56" fill="none">
      <path
        d="M8 20l24-10 24 10-24 10-24-10z M8 20v24l24 10 24-10V20 M32 30v24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  ),
  cart: (
    <svg viewBox="0 0 64 64" width="56" height="56" fill="none">
      <path
        d="M10 14h6l6 28h26l6-18H20 M24 52a3 3 0 100-6 3 3 0 000 6z M42 52a3 3 0 100-6 3 3 0 000 6z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  ),
  car: (
    <svg viewBox="0 0 64 64" width="56" height="56" fill="none">
      <path
        d="M8 38l4-14a4 4 0 014-3h32a4 4 0 014 3l4 14 M8 38h48v8H8z M18 46a3 3 0 100-6 3 3 0 000 6z M46 46a3 3 0 100-6 3 3 0 000 6z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 64 64" width="56" height="56" fill="none">
      <path
        d="M10 12h44v30H24l-10 10V42h-4z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  ),
  megaphone: (
    <svg viewBox="0 0 64 64" width="56" height="56" fill="none">
      <path
        d="M10 26v12h8l24 12V14L18 26h-8z M42 24a8 8 0 010 16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  ),
}

export default function EmptyState({ kind = 'box', title, subtitle }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{ICONS[kind] || ICONS.box}</div>
      <p className="empty-state-title">{title}</p>
      {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
    </div>
  )
}
