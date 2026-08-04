// "Yükleniyor..." yazisi yerine, gercek kartlarin hayaletini andiran
// parlayan (shimmer) kutucuklar gosteriyoruz - bu, uygulamayi anlik/hizli
// hissettiren en ucuz gorsel numaralardan biri.
export default function SkeletonList({ count = 3 }) {
  return (
    <ul className="card-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="card skeleton-card">
          <div className="skeleton-line skeleton-tag" />
          <div className="skeleton-line skeleton-title" />
          <div className="skeleton-line skeleton-text" />
          <div className="skeleton-line skeleton-text-short" />
        </li>
      ))}
    </ul>
  )
}
