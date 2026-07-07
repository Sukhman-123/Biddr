import { CircleDot, Clock3, Gavel, Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { formatPurse } from '../../tournaments/tournament.utils'
import './AuctioneerPanel.css'

export default function AuctioneerPanel({
  tournament,
  activeLot,
  queuedLots,
  undoAvailable,
  connected,
  busy,
  recentEvents,
  onActivateNext,
  onPause,
  onResume,
  onUndo,
  onDeactivate,
  onOpenEndAuction,
}) {
  const auctionMode = tournament?.auctionMode || 'remote'
  const isPhysical = auctionMode === 'physical'
  const nextLot = queuedLots?.[0] ?? null
  const currentLeader = activeLot
    ? tournament?.franchises?.find(
        (franchise) => franchise.id === activeLot.currentBidderFranchiseId,
      ) ?? null
    : null
  const panelEvents = Array.isArray(recentEvents) ? recentEvents.slice(0, 4) : []

  return (
    <section className="auctioneer-panel" aria-label="Auctioneer control panel">
      <header className="auctioneer-panel-head">
        <div>
          <span className="auctioneer-panel-eyebrow">Auctioneer Panel</span>
          <h2 className="auctioneer-panel-title">
            {isPhysical ? 'Physical auction command desk' : 'Remote auction command desk'}
          </h2>
          <p className="auctioneer-panel-sub">
            Live auction actions save immediately. Use this desk to manage the room, floor state, and next moves.
          </p>
        </div>
        <div className="auctioneer-panel-pills">
          <span className={`auctioneer-panel-pill ${isPhysical ? 'is-physical' : 'is-remote'}`}>
            {isPhysical ? 'Physical auction' : 'Remote auction'}
          </span>
          <span className={`auctioneer-panel-pill ${connected ? 'is-online' : 'is-offline'}`}>
            {connected ? 'Room synced' : 'Reconnecting'}
          </span>
        </div>
      </header>

      <div className="auctioneer-panel-grid">
        <section className="auctioneer-panel-card">
          <div className="auctioneer-panel-card-head">
            <span className="auctioneer-panel-label">Current lot</span>
            <span className={`auctioneer-panel-state ${activeLot ? 'is-live' : 'is-idle'}`}>
              {activeLot
                ? activeLot.auctionStatus === 'paused'
                  ? 'Paused'
                  : 'Live on floor'
                : 'Waiting'}
            </span>
          </div>
          <strong className="auctioneer-panel-value">
            {activeLot?.name || 'No lot on the floor'}
          </strong>
          <p className="auctioneer-panel-copy">
            {activeLot
              ? currentLeader
                ? `${currentLeader.name} is leading at ${formatPurse(activeLot.currentBid, tournament?.currency || 'INR')}.`
                : `Current bid is ${formatPurse(activeLot.currentBid, tournament?.currency || 'INR')}.`
              : isPhysical
                ? 'Bring the next player up when the room is ready, then call and record bids from the floor.'
                : 'Bring the next player up when you are ready. Franchise owners can bid directly once the lot is live.'}
          </p>
          <div className="auctioneer-panel-actions">
            {activeLot ? (
              <>
                {activeLot.auctionStatus === 'paused' ? (
                  <button
                    type="button"
                    className="auctioneer-panel-btn is-success"
                    onClick={onResume}
                    disabled={busy}
                  >
                    <Play size={15} />
                    Resume
                  </button>
                ) : (
                  <button
                    type="button"
                    className="auctioneer-panel-btn is-warning"
                    onClick={onPause}
                    disabled={busy}
                  >
                    <Pause size={15} />
                    Pause
                  </button>
                )}
                <button
                  type="button"
                  className="auctioneer-panel-btn is-neutral"
                  onClick={onDeactivate}
                  disabled={busy}
                >
                  <SkipForward size={15} />
                  Re-queue
                </button>
              </>
            ) : (
              <button
                type="button"
                className="auctioneer-panel-btn is-gold"
                onClick={() => nextLot && onActivateNext?.(nextLot.id)}
                disabled={busy || !nextLot}
              >
                <Gavel size={15} />
                {nextLot ? `Bring ${nextLot.name}` : 'No next lot'}
              </button>
            )}
          </div>
        </section>

        <section className="auctioneer-panel-card">
          <div className="auctioneer-panel-card-head">
            <span className="auctioneer-panel-label">Queue control</span>
            <span className="auctioneer-panel-meta">
              <Clock3 size={14} />
              {queuedLots?.length || 0} queued
            </span>
          </div>
          <strong className="auctioneer-panel-value">
            {nextLot?.name || 'Queue is empty'}
          </strong>
          <p className="auctioneer-panel-copy">
            {nextLot
              ? `${nextLot.style || 'Player'} · base ${formatPurse(nextLot.basePrice, tournament?.currency || 'INR')}`
              : 'Add more lots from the lobby if you want to continue the auction after this room clears.'}
          </p>
          <div className="auctioneer-panel-actions">
            <button
              type="button"
              className="auctioneer-panel-btn is-gold"
              onClick={() => nextLot && onActivateNext?.(nextLot.id)}
              disabled={busy || !nextLot || Boolean(activeLot)}
            >
              <Play size={15} />
              Activate next lot
            </button>
            <button
              type="button"
              className="auctioneer-panel-btn is-purple"
              onClick={onUndo}
              disabled={busy || !undoAvailable}
            >
              <RotateCcw size={15} />
              Undo
            </button>
          </div>
        </section>

        <section className="auctioneer-panel-card">
          <div className="auctioneer-panel-card-head">
            <span className="auctioneer-panel-label">Room status</span>
            <span className="auctioneer-panel-meta">
              <CircleDot size={14} />
              {tournament?.status || 'upcoming'}
            </span>
          </div>
          <strong className="auctioneer-panel-value">
            {isPhysical ? 'Auctioneer controlled bidding' : 'Shared live bidding'}
          </strong>
          <p className="auctioneer-panel-copy">
            {isPhysical
              ? 'Every bid, winner, pause, and skip is under your control in this room.'
              : 'Franchise owners can bid themselves, while you still manage the lot lifecycle and final outcomes.'}
          </p>
          <div className="auctioneer-panel-actions">
            <button
              type="button"
              className="auctioneer-panel-btn is-danger"
              onClick={onOpenEndAuction}
              disabled={busy || Boolean(activeLot)}
            >
              <Gavel size={15} />
              End auction
            </button>
          </div>
        </section>
      </div>

      <section className="auctioneer-panel-feed">
        <div className="auctioneer-panel-card-head">
          <span className="auctioneer-panel-label">Recent floor activity</span>
          <span className="auctioneer-panel-meta">{panelEvents.length} events</span>
        </div>
        {panelEvents.length > 0 ? (
          <ul className="auctioneer-panel-feed-list">
            {panelEvents.map((item) => (
              <li key={item.id} className="auctioneer-panel-feed-item">
                <span className="auctioneer-panel-feed-type">{item.type}</span>
                <span className="auctioneer-panel-feed-text">
                  {describeFeedItem(item, tournament?.currency || 'INR')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="auctioneer-panel-copy">
            No live activity yet. Once the auction starts moving, the latest room events will appear here.
          </p>
        )}
      </section>
    </section>
  )
}

function describeFeedItem(item, currency) {
  switch (item.type) {
    case 'bid':
      return `${item.franchiseName || item.actor} bid ${formatPurse(item.amount, currency)} on ${item.lotName || 'the current lot'}.`
    case 'hammered':
      return `${item.lotName || 'Lot'} sold for ${formatPurse(item.amount, currency)}.`
    case 'activated':
      return `${item.lotName || 'Lot'} was brought to the floor.`
    case 'passed':
      return `${item.lotName || 'Lot'} was marked unsold.`
    case 'paused':
      return 'Auction paused.'
    case 'resumed':
      return 'Auction resumed.'
    case 'undone':
      return `Last action was undone${item.action ? ` (${item.action})` : ''}.`
    case 'deactivated':
      return 'Current lot was returned to the queue.'
    default:
      return item.lotName || 'Room activity updated.'
  }
}
