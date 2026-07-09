import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Play, ChevronDown, Pause, Zap, RotateCcw, Gavel, Ban, SkipForward, TimerReset } from 'lucide-react'
import { useToast } from '../../../components/ToastProvider'
import { formatPurse } from '../../tournaments/tournament.utils'
import BidControls from './BidControls'
import './HostControls.css'

// =============================================================
// HostControls — the auctioneer's cockpit with timer and undo.
//
// Three modes:
//   "idle"    — no active lot. Pick queued lots.
//   "active"  — lot is live. See Hammer + Pass + Pause + Undo + Timer.
//   "paused"  — auction paused. See Hammer + Pass + Resume + Undo.
//
// Timer: counts down from server's currentBidAt (e.g., 60 seconds).
//         Auto-reloads state when countdown completes (v2 auto-sell).
// =============================================================

export default function HostControls({
  mode,
  lot,
  queuedLots,
  busy,
  timerSeconds,
  franchises,
  auctionMode,
  currency,
  canUndo,
  onActivate,
  onHammer,
  onPass,
  onDeactivate,
  onPause,
  onResume,
  onUndo,
  onPlaceBid,
}) {
  if (mode === 'idle') {
    return (
      <IdlePicker
        queuedLots={queuedLots}
        busy={busy}
        currency={currency}
        canUndo={canUndo}
        onActivate={onActivate}
        onUndo={onUndo}
      />
    )
  }
  return (
    <div className="host-controls-stack">
      {/* Manual bid controls for the host — physical mode only */}
      {auctionMode === 'physical' && mode !== 'paused' && (
        <BidControls
          lot={lot}
          franchises={franchises || []}
          onPlaceBid={onPlaceBid}
          busy={busy}
          isHost
          currency={currency}
        />
      )}
      <ActiveControls
        lot={lot}
        mode={mode}
        busy={busy}
        timerSeconds={timerSeconds}
        franchises={franchises}
        auctionMode={auctionMode}
        currency={currency}
        onHammer={onHammer}
        onPass={onPass}
        onDeactivate={onDeactivate}
        onPause={onPause}
        onResume={onResume}
        onUndo={onUndo}
        canUndo={canUndo}
      />
    </div>
  )
}

function IdlePicker({ queuedLots, busy, currency, canUndo, onActivate, onUndo }) {
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState(queuedLots?.[0]?.id || '')

  // Keep the picked lot in sync if the queued list refreshes.
  if (pick && !queuedLots?.some((l) => l.id === pick)) {
    setPick(queuedLots?.[0]?.id || '')
  }

  if ((!queuedLots || queuedLots.length === 0) && !canUndo) {
    return null
  }

  const submit = () => {
    if (!pick) return
    onActivate(pick)
    setOpen(false)
  }

  return (
    <div className="host-controls host-controls-idle">
      <div className="host-controls-row">
        <button
          type="button"
          className="cta-btn host-controls-primary"
          onClick={() => setOpen((v) => !v)}
          disabled={busy}
          aria-expanded={open}
        >
          <span className="cta-btn-content">
            <Play size={16} />
            Activate a lot
            <ChevronDown size={14} className={`host-controls-caret ${open ? 'is-open' : ''}`} />
          </span>
        </button>
        {canUndo ? (
          <button
            type="button"
            className="cta-btn host-controls-secondary"
            onClick={onUndo}
            disabled={busy}
          >
            <span className="cta-btn-content">
              <RotateCcw size={16} />
              Undo last action
            </span>
          </button>
        ) : null}
        <span className="host-controls-hint">
          {queuedLots.length} queued · you choose the order
        </span>
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="host-picker"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <ul className="host-picker-list" role="listbox" aria-label="Pick a queued lot">
              {queuedLots.map((l) => (
                <li
                  key={l.id}
                  className={`host-picker-item ${pick === l.id ? 'is-picked' : ''}`}
                  onClick={() => setPick(l.id)}
                  role="option"
                  aria-selected={pick === l.id}
                >
                  <span className="host-picker-name">{l.name}</span>
                  <span className="host-picker-sub">
                    {l.style} · {l.country} · base {l.basePrice != null ? formatPurse(l.basePrice, currency, { compact: true }) : '—'}
                    {l.bidIncrement != null ? ` · +${formatPurse(l.bidIncrement, currency, { compact: true })}` : ' · +—'}
                  </span>
                  {pick === l.id ? <Check size={16} className="host-picker-tick" /> : null}
                </li>
              ))}
            </ul>
            <div className="host-picker-actions">
              <button
                type="button"
                className="cta-btn host-controls-primary"
                onClick={submit}
                disabled={busy || !pick}
              >
                <span className="cta-btn-content">
                  <Play size={16} />
                  Bring to the floor
                </span>
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function ActiveControls({
  lot,
  mode,
  busy,
  timerSeconds,
  franchises,
  auctionMode,
  currency = 'INR',
  onHammer,
  onPass,
  onDeactivate,
  onPause,
  onResume,
  onUndo,
  canUndo,
}) {
  const [confirmHammer, setConfirmHammer] = useState(false)
  const [confirmPass, setConfirmPass] = useState(false)
  const [confirmUndo, setConfirmUndo] = useState(false)
  const [confirmSkip, setConfirmSkip] = useState(false)
  const [selectedHammerWinner, setSelectedHammerWinner] = useState(
    lot?.currentBidderFranchiseId || '',
  )
  const isPaused = mode === 'paused'
  const isPhysical = auctionMode === 'physical'
  const toast = useToast()
  const salePrice = lot?.currentBid > 0 ? lot.currentBid : lot?.basePrice || 0
  const selectedWinner = (franchises || []).find(
    (franchise) => franchise.id === selectedHammerWinner,
  )
  const selectedWinnerHasWallet =
    selectedWinner?.wallet && selectedWinner.wallet.initial != null
  const selectedWinnerRemaining = selectedWinner
    ? (selectedWinner.wallet?.initial || 0) - (selectedWinner.wallet?.spent || 0)
    : null
  const selectedWinnerSquadSize = selectedWinner?.squad?.playerIds?.length || 0
  const selectedWinnerMaxSquad = selectedWinner?.squad?.maxSize || 11
  const hammerBlockedReason =
    selectedWinner && selectedWinnerHasWallet && selectedWinnerRemaining < salePrice
      ? `Insufficient purse. ${formatPurse(selectedWinnerRemaining, currency)} remaining but price is ${formatPurse(salePrice, currency)}.`
      : selectedWinner && selectedWinnerSquadSize >= selectedWinnerMaxSquad
        ? `Squad is full (${selectedWinnerSquadSize}/${selectedWinnerMaxSquad}).`
        : ''

  useEffect(() => {
    setSelectedHammerWinner(lot?.currentBidderFranchiseId || '')
  }, [lot?.id, lot?.currentBidderFranchiseId])

  // Timer component for the active lot
  const [countdown, setCountdown] = useState(timerSeconds || 0)
  const [timerRunning, setTimerRunning] = useState(isPaused)

  useEffect(() => {
    setCountdown(timerSeconds || 0)
    setTimerRunning(!isPaused && mode === 'active')
  }, [timerSeconds, isPaused, mode])

  useEffect(() => {
    if (!timerRunning || countdown <= 0) return

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          setTimerRunning(false)
          if (lot?.currentBid > 0) {
            toast.warn('Timer expired. Auctioneer must sell, pause, or continue the lot.')
          } else {
            toast.warn('Timer expired. No bids yet — auctioneer must mark unsold or continue.')
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timerRunning, countdown, lot?.currentBid])

  if (confirmHammer) {
    return (
      <div className="host-controls host-controls-confirm">
        <p className="host-controls-confirm-text">
          Hammer <strong>{lot.name}</strong> at the current bid? The lot will be marked sold and the room will go back to the empty state.
        </p>
        {isPhysical ? (
          <div className="host-controls-winner">
            <label className="host-controls-winner-label" htmlFor="hammer-winner">
              Winning franchise
            </label>
            <select
              id="hammer-winner"
              className="host-controls-winner-select"
              value={selectedHammerWinner}
              onChange={(event) => setSelectedHammerWinner(event.target.value)}
              disabled={busy}
            >
              <option value="">No winner selected</option>
              {(franchises || []).map((franchise) => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.name}
                </option>
              ))}
            </select>
            <p className="host-controls-winner-help">
              {hammerBlockedReason ||
                `Final price: ${formatPurse(salePrice, currency)}. Pick the final table winner before you hammer the lot.`}
            </p>
          </div>
        ) : null}
        <div className="host-controls-row">
          <button
            type="button"
            className="cta-btn host-controls-hammer"
            onClick={() => {
              onHammer(selectedHammerWinner || undefined)
              setConfirmHammer(false)
            }}
            disabled={busy || Boolean(hammerBlockedReason)}
            title={hammerBlockedReason || undefined}
          >
            <span className="cta-btn-content">
              <Check size={16} />
              {isPhysical ? 'Confirm sold result' : 'Confirm hammer'}
            </span>
          </button>
          <button
            type="button"
            className="cta-btn host-controls-secondary"
            onClick={() => setConfirmHammer(false)}
            disabled={busy}
          >
            <span className="cta-btn-content">
              <X size={16} />
              Cancel
            </span>
          </button>
        </div>
      </div>
    )
  }
  if (confirmPass) {
    return (
      <div className="host-controls host-controls-confirm">
        <p className="host-controls-confirm-text">
          Pass <strong>{lot.name}</strong>? The lot will be marked unsold and the room will go back to the empty state.
        </p>
        <div className="host-controls-row">
          <button
            type="button"
            className="cta-btn host-controls-pass"
            onClick={() => {
              onPass()
              setConfirmPass(false)
            }}
            disabled={busy}
          >
            <span className="cta-btn-content">
              <Check size={16} />
              Confirm pass
            </span>
          </button>
          <button
            type="button"
            className="cta-btn host-controls-secondary"
            onClick={() => setConfirmPass(false)}
            disabled={busy}
          >
            <span className="cta-btn-content">
              <X size={16} />
              Cancel
            </span>
          </button>
        </div>
      </div>
    )
  }
  if (confirmUndo) {
    return (
      <div className="host-controls host-controls-confirm">
        <p className="host-controls-confirm-text">
          Undo the last action? This will reverse the bid placement or hammer and restore previous state.
        </p>
        <div className="host-controls-row">
          <button
            type="button"
            className="cta-btn host-controls-undo"
            onClick={() => {
              onUndo()
              setConfirmUndo(false)
            }}
            disabled={busy}
          >
            <span className="cta-btn-content">
              <RotateCcw size={16} />
              Confirm undo
            </span>
          </button>
          <button
            type="button"
            className="cta-btn host-controls-secondary"
            onClick={() => setConfirmUndo(false)}
            disabled={busy}
          >
            <span className="cta-btn-content">
              <X size={16} />
              Cancel
            </span>
          </button>
        </div>
      </div>
    )
  }
  if (confirmSkip) {
    return (
      <div className="host-controls host-controls-confirm">
        <p className="host-controls-confirm-text">
          Skip <strong>{lot.name}</strong>? It will go back to the queue without marking sold or unsold.
        </p>
        <div className="host-controls-row">
          <button
            type="button"
            className="cta-btn host-controls-pass"
            onClick={() => {
              onDeactivate()
              setConfirmSkip(false)
            }}
            disabled={busy}
          >
            <span className="cta-btn-content">
              <Check size={16} />
              Confirm skip
            </span>
          </button>
          <button
            type="button"
            className="cta-btn host-controls-secondary"
            onClick={() => setConfirmSkip(false)}
            disabled={busy}
          >
            <span className="cta-btn-content">
              <X size={16} />
              Cancel
            </span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="host-controls host-controls-active">
      <div className="host-action-dock">
        <button
          type="button"
          className="cta-btn host-action-card host-controls-hammer"
          onClick={() => setConfirmHammer(true)}
          disabled={busy}
          aria-label="Sold"
        >
          <span className="cta-btn-content">
            <span className="host-action-icon"><Gavel size={22} /></span>
            <span className="host-action-copy">
              <strong>Sold</strong>
              <small>Hammer the player to the winning team</small>
            </span>
          </span>
        </button>
        <button
          type="button"
          className="cta-btn host-action-card host-controls-pass"
          onClick={() => setConfirmPass(true)}
          disabled={busy}
          aria-label="Unsold"
        >
          <span className="cta-btn-content">
            <span className="host-action-icon"><Ban size={22} /></span>
            <span className="host-action-copy">
              <strong>Unsold</strong>
              <small>Close this lot with no winner</small>
            </span>
          </span>
        </button>
        <button
          type="button"
          className="cta-btn host-action-card host-controls-secondary host-controls-skip"
          onClick={() => setConfirmSkip(true)}
          disabled={busy}
          aria-label="Skip / Re-queue"
        >
          <span className="cta-btn-content">
            <span className="host-action-icon"><SkipForward size={22} /></span>
            <span className="host-action-copy">
              <strong>Skip / Re-queue</strong>
              <small>Move this player back into the pool</small>
            </span>
          </span>
        </button>
      </div>

      <div className="host-utility-dock">
        {isPaused ? (
          <button
            type="button"
            className="cta-btn host-utility-btn host-controls-resume"
            onClick={onResume}
            disabled={busy}
          >
            <span className="cta-btn-content">
              <Zap size={16} />
              Resume
            </span>
          </button>
        ) : (
          <button
            type="button"
            className="cta-btn host-utility-btn host-controls-pause"
            onClick={onPause}
            disabled={busy}
          >
            <span className="cta-btn-content">
              <Pause size={16} />
              Pause
            </span>
          </button>
        )}
        <button
          type="button"
          className="cta-btn host-utility-btn host-controls-undo"
          onClick={() => setConfirmUndo(true)}
          disabled={busy || !canUndo}
        >
          <span className="cta-btn-content">
            <RotateCcw size={16} />
            Undo last action
          </span>
        </button>
        <div className={`host-timer ${timerRunning ? 'is-running' : 'is-paused'} ${countdown <= 10 ? 'is-warn' : ''}`}>
          <TimerReset size={18} />
          <span>{countdown}s</span>
          <small>{timerRunning ? 'Live clock' : 'Clock paused'}</small>
        </div>
      </div>
    </div>
  )
}
