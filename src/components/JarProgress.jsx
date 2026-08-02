export default function JarProgress({ current, min }) {
  const pct = Math.min(100, Math.round((current / min) * 100))
  return (
    <div className="jar">
      <div className="jar-track">
        <div className="jar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="jar-label">
        {current} / {min} TL toplandi
      </span>
    </div>
  )
}
