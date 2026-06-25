import { ArrowLeft, Wifi, WifiOff, CircleDot } from 'lucide-react'
import './TopBar.css'

// Top bar for the auction room. Shows the tournament name, a live
// connection indicator, and a Leave button.
export default function TopBar({ tournament, connected, onLeave }) {
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
    </header>
  )
}