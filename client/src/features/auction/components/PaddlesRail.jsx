import { motion } from 'framer-motion'
import './PaddlesRail.css'

// PaddlesRail — visual bidding interface for franchise owners.
// Active lot shows leading bidder. Click paddle to place minimum+ bid (v1).
// Auction mode controls click behavior: physical = host-only, remote = franchise owner bids.
export default function PaddlesRail({ franchises, activeLot, auctionMode, onPaddleClick }) {
  if (!franchises || franchises.length === 0) {
    return (
      <div className="paddles-rail paddles-rail-empty">
        <p>
          No franchises on this tournament yet. Add some in the lobby to populate the bidding floor.
        </p>
      </div>
    )
  }

  const currentBidder = activeLot?.currentBidderFranchiseId
  const leadingFranchise = franchises.find(f => f.id === currentBidder)
  const baseIncrement = activeLot?.bidIncrement ?? 1000000

  return (
    <div className="paddles-rail" aria-label="Franchise paddles">
      <div className="paddles-rail-head">
        <span className="paddles-rail-title">Franchise paddles</span>
        <span className="paddles-rail-sub">
          {!activeLot
            ? 'Inactive until a lot is on the floor'
            : auctionMode === 'physical'
              ? 'Auctioneer only: paddle raises are decorative'
              : `Leading bid: ${baseIncrement / 1000000}L. Click to bid +${baseIncrement}`
          }
        </span>
      </div>
      {activeLot && leadingFranchise && (
        <div className="paddles-rail-leading">
          <motion.div
            key={leadingFranchise.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div
              className="paddle-indicator"
              style={{ '--paddle-color': leadingFranchise.colorHex || '#f5b94a' }}
            >
              <span>Leading:</span>
              <span>{leadingFranchise.name}</span>
            </div>
            <div className="paddle-bid-amount">
              {activeLot.currentBid.toLocaleString('en-IN')}
            </div>
          </motion.div>
        </div>
      )}
      <div className="paddles-rail-list" role="list">
        {franchises.map((f) => {
          const color = f.colorHex || '#f5b94a'
          const isLeading = f.id === currentBidder
          const canBid = !isLeading && auctionMode === 'remote'

          return (
            <motion.button
              key={f.id}
              type="button"
              className={`paddle ${active ? 'is-active' : 'is-inactive'} ${isLeading ? 'is-leading' : ''}`}
              onClick={() => active && onPaddleClick?.(f, activeLot.currentBid + baseIncrement)}
              disabled={!active || !canBid}
              style={{ '--paddle-color': color }}
              role="listitem"
              aria-label={`${isLeading ? `Leading bid for ${f.name}` : `Bid +${baseIncrement.toLocaleString('en-IN')} for ${f.name}`}`}
              whileHover={!canBid ? {} : { scale: 1.02 }}
              whileTap={!canBid ? {} : { scale: 0.98 }}
            >
              <span className="paddle-shape" aria-hidden="true">
                <span className="paddle-handle" />
                <span className="paddle-blade" />
              </span>
              <span className="paddle-meta">
                <span className="paddle-name">{f.name}</span>
                {f.city ? <span className="paddle-city">{f.city}</span> : null}
                {isLeading && (
                  <span className="paddle-leading-badge">
                    Leading
                  </span>
                )}
                {canBid && (
                  <span className="paddle-bid-hint">
                    +{baseIncrement / 1000000}L
                  </span>
                )}
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}