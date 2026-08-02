export default function CapacityBar({ joined, capacity }) {
  const pct = Math.min(100, Math.round((joined / capacity) * 100))
  return (
    <div className="jar">
      <div className="jar-track">
        <div className="jar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="jar-label">
        {joined} / {capacity} kisi katildi
      </span>
    </div>
  )
}
