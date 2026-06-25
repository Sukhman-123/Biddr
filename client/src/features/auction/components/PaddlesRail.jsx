import './PaddlesRail.css'

// PaddlesRail — one paddle per franchise. Clicking fires a callback.
// In v1 the click is informational only (toast in the parent), but
// the visual is fully built and uses the franchise's colorHex so
// the "premium" feel is there from day one.
export default function PaddlesRail({ franchises, active, onPaddleClick }) {
  if (!franchises || franchises.length === 0) {
    return (
      <div className="paddles-rail paddles-rail-empty">
        <p>
          No franchises on this tournament yet. Add some in the lobby to populate the bidding floor.
        </p>
      </div>
    )
  }
  return (
    <div className="paddles-rail" aria-label="Franchise paddles">
      <div className="paddles-rail-head">
        <span className="paddles-rail-title">Franchise paddles</span>
        <span className="paddles-rail-sub">
          {active ? 'Click a paddle to show interest' : 'Inactive until a lot is on the floor'}
        </span>
      </div>
      <div className="paddles-rail-list" role="list">
        {franchises.map((f) => {
          const color = f.colorHex || '#f5b94a'
          return (
            <button
              key={f.id}
              type="button"
              className={`paddle ${active ? 'is-active' : 'is-inactive'}`}
              onClick={() => active && onPaddleClick?.(f)}
              disabled={!active}
              style={{ '--paddle-color': color }}
              role="listitem"
              aria-label={`Raise paddle for ${f.name}`}
            >
              <span className="paddle-shape" aria-hidden="true">
                <span className="paddle-handle" />
                <span className="paddle-blade" />
              </span>
              <span className="paddle-meta">
                <span className="paddle-name">{f.name}</span>
                {f.city ? <span className="paddle-city">{f.city}</span> : null}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}