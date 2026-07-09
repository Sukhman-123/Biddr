import { ArrowLeft, Wifi, WifiOff, CircleDot } from 'lucide-react'
import './TopBar.css'

// Top bar for the auction room. Shows the tournament name, a live
// connection indicator, and a Leave button.
export default function TopBar({
  tournament,
  connected,
  showConnection = true,
  onLeave,
  auxActions,
  auxActionLabel,
  onAuxAction,
  auxActionTone = 'neutral',
  showEndAuction = false,
  endDisabled = false,
  endDisabledReason,
  onEndAuction,
}) {
  const resolvedAuxActions = auxActions?.length
    ? auxActions
    : auxActionLabel
    ? [{ label: auxActionLabel, onClick: onAuxAction, tone: auxActionTone }]
    : []

  return (
    <header className="room-topbar">
      <button
        type="button"
        className="room-topbar-back"
        onClick={onLeave}
        aria-label="Leave the auction room"
      >
        <ArrowLeft size={16} />
        <span>Leave</span>
      </button>

      <div className="room-topbar-meta">
        <h1 className="room-topbar-title">
          {tournament?.name || 'Auction Room'}
        </h1>
        <span className="room-topbar-sub">
          {tournament?.shortCode ? `#${tournament.shortCode}` : 'Live auction floor'}
        </span>
      </div>

      {resolvedAuxActions.length > 0 ? (
        <div className="room-topbar-actions">
          {resolvedAuxActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`room-topbar-aux is-${action.tone || 'neutral'}`}
              onClick={action.onClick}
            >
              {action.icon || null}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      ) : null}

      {showEndAuction ? (
        <button
          type="button"
          className="room-topbar-end"
          onClick={onEndAuction}
          disabled={endDisabled}
          title={endDisabledReason}
        >
          End auction
        </button>
      ) : null}

      {showConnection ? (
        <div
          className={`room-topbar-conn ${connected ? 'is-on' : 'is-off'}`}
          role="status"
          aria-live="polite"
        >
          {connected ? (
            <>
              <CircleDot size={12} className="room-topbar-conn-dot" />
              <Wifi size={14} />
              <span>Live</span>
            </>
          ) : (
            <>
              <WifiOff size={14} />
              <span>Reconnecting</span>
            </>
          )}
        </div>
      ) : null}
    </header>
  )
}
