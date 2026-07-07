import { Gavel, Play, Check, X, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import HostControls from './HostControls'
import { formatPurse } from '../../tournaments/tournament.utils'
import './CurrentLotCard.css'

// PaddleBar — visible only to franchise owners during a live lot.
// Lets them raise their paddle on their franchise without leaving the room.
function PaddleBar({ lot, isHost, franchises, onRaisePaddle }) {
  let user = null
  try {
    user = require('../../../features/auth/useAuth').useAuth().user
  } catch (_) {
    // No AuthProvider — silently skip
  }
  const myFranchise = franchises?.find((f) =>
    (f.members || []).some((m) => m.userId === user?.id),
  )

  if (!myFranchise || isHost) return null

  const isOwner = (myFranchise.members || []).some(
    (m) => m.userId === user?.id && m.role === 'owner',
  )

  if (!isOwner) return null

  const currentBidder = lot.currentBidderFranchiseId === myFranchise.id
  const nextBid = (lot.currentBid || lot.basePrice) + (lot.bidIncrement || 0)

  return (
    <div className="paddle-bar">
      <div className="paddle-bar-info">
        <User size={14} />
        <span>
          {myFranchise.name} —{currentBidder ? ' leading at' : ' next bid at'}{' '}
          {formatPurse(nextBid, 'INR', { compact: true })}
        </span>
      </div>
      <button
        className="paddle-bar-btn"
        onClick={() => onRaisePaddle(myFranchise.id, nextBid)}
        aria-label={`Raise paddle for ${myFranchise.name}`}
      >
        Raise Paddle
      </button>
    </div>
  )
}

// CurrentLotCard — the headline card showing what's on the floor
// right now. Three states:
//   1. No active lot — empty state + host-only "Activate lot" CTA
//      if there's at least one queued lot.
//   2. Active lot — big card with photo / name / style / country,
//      current bid, and the host's Hammer / Pass controls inline.
//   3. Hammered lot — brief win banner (handled by toast; we just
//      show the empty state again since the room is now empty).
export default function CurrentLotCard({
  lot,
  isHost,
  queuedLots,
  busy,
  timerSeconds,
  franchises,
  auctionMode,
  canUndo,
  onActivate,
  onHammer,
  onPass,
  onDeactivate,
  onPause,
  onResume,
  onUndo,
  onRaisePaddle,
  onPlaceBid,
}) {
  return (
    <div className="current-lot-card">
      <AnimatePresence mode="wait">
        {lot ? (
          <motion.div
            key={`lot-${lot.id}`}
            className="current-lot-active"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="current-lot-head">
              <div className="current-lot-pic" aria-hidden="true">
                {lot.photoUrl ? (
                  <img src={lot.photoUrl} alt="" />
                ) : (
                  <span className="current-lot-pic-initial">
                    {(lot.name || '?').slice(0, 1)}
                  </span>
                )}
              </div>
              <div className="current-lot-meta">
                <h2 className="current-lot-name">{lot.name}</h2>
                <p className="current-lot-sub">
                  {lot.style} · {lot.country} · {lot.set}
                </p>
                <span className="current-lot-status is-active">On the floor</span>
              </div>
            </div>

            <div className="current-lot-price-row">
              <div className="current-lot-price-cell">
                <span className="current-lot-price-label">Base price</span>
                <span className="current-lot-price-value">
                  {formatPurse(lot.basePrice, 'INR', { compact: true })}
                </span>
              </div>
              <div className="current-lot-price-cell is-current">
                <span className="current-lot-price-label">Current bid</span>
                <motion.span
                  key={lot.currentBid}
                  className="current-lot-price-value is-big"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {formatPurse(lot.currentBid, 'INR', { compact: true })}
                </motion.span>
              </div>
              <div className="current-lot-price-cell">
                <span className="current-lot-price-label">Increment</span>
                <span className="current-lot-price-value">
                  {lot.bidIncrement
                    ? formatPurse(lot.bidIncrement, 'INR', { compact: true })
                    : '—'}
                </span>
              </div>
            </div>

            {/* Franchise owners see a paddle bar right below the prices */}
            {!isHost && (
              <PaddleBar
                lot={lot}
                isHost={isHost}
                franchises={franchises}
                onRaisePaddle={onRaisePaddle}
              />
            )}

            {isHost ? (
              <HostControls
                mode={lot.auctionStatus === 'paused' ? 'paused' : 'active'}
                busy={busy}
                lot={lot}
                timerSeconds={timerSeconds}
                franchises={franchises}
                auctionMode={auctionMode}
                onHammer={onHammer}
                onPass={onPass}
                onPause={onPause}
                onResume={onResume}
                onUndo={onUndo}
                onPlaceBid={onPlaceBid}
                onDeactivate={onDeactivate}
              />
            ) : (
              <p className="current-lot-hint">
                Bidding is live. The auctioneer will hammer when the price is right.
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            className="current-lot-empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="current-lot-empty-icon" aria-hidden="true">
              <Gavel size={28} />
            </div>
            <h2 className="current-lot-empty-title">Waiting for the next lot</h2>
            <p className="current-lot-empty-sub">
              {isHost
                ? queuedLots.length > 0
                  ? auctionMode === 'physical'
                    ? 'Pick a queued lot to bring to the floor, then run bids from the auctioneer desk.'
                    : 'Pick a queued lot to bring to the floor and let franchises start bidding live.'
                  : auctionMode === 'physical'
                    ? 'No queued lots remain. Add more from the lobby before continuing the room.'
                    : 'No queued lots remain. Add more from the lobby.'
                : 'The auctioneer will bring the next lot to the floor shortly.'}
            </p>

            {isHost && (queuedLots.length > 0 || canUndo) ? (
              <HostControls
                mode="idle"
                busy={busy}
                queuedLots={queuedLots}
                canUndo={canUndo}
                onActivate={onActivate}
                onUndo={onUndo}
              />
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
