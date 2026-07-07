import { formatPurse } from '../../tournaments/tournament.utils'
import { motion } from 'framer-motion'
import './PaddlesRail.css'

// PaddlesRail — visual bidding interface for franchise owners.
// Active lot shows leading bidder. Click paddle to place minimum+ bid (v1).
// Auction mode controls click behavior: physical = host-only, remote = franchise owner bids.
export default function PaddlesRail({
  franchises,
  activeLot,
  auctionMode,
  onPaddleClick,
  currency = 'INR',
}) {
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
  const isActive = Boolean(activeLot)

  return (
    <div className="paddles-rail" aria-label="Franchise paddles">
      <div className="paddles-rail-head">
        <span className="paddles-rail-title">Franchise paddles</span>
        <span className="paddles-rail-sub">
          {!activeLot
            ? 'Inactive until a lot is on the floor'
            : auctionMode === 'physical'
              ? 'Auctioneer records bids from the floor. Paddles stay visual for table awareness only.'
              : `Leading bid increment: ${formatPurse(baseIncrement, currency, { compact: true })}. Click to bid the next amount.`
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
              {formatPurse(activeLot.currentBid, currency)}
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
              className={`paddle ${isActive ? 'is-active' : 'is-inactive'} ${isLeading ? 'is-leading' : ''}`}
              onClick={() => isActive && onPaddleClick?.(f, activeLot.currentBid + baseIncrement)}
              disabled={!isActive || !canBid}
              style={{ '--paddle-color': color }}
              role="listitem"
              aria-label={isLeading ? `Leading bid for ${f.name}` : `Bid next amount for ${f.name}`}
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
                {canBid && activeLot && (
                  <span className="paddle-bid-hint">
                    Next {formatPurse(activeLot.currentBid + baseIncrement, currency, { compact: true })}
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
