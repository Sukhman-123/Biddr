import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Play, ChevronDown } from 'lucide-react'
import './HostControls.css'

// =============================================================
// HostControls — the only UI on the page that mutates room state.
//
// Two modes:
//   "idle"  — there's no active lot. The host picks one of the
//             queued lots and clicks Activate. We render an
//             inline picker (no full modal — keeps the host in
//             the page and makes "I changed my mind" cheap).
//   "active"— there IS an active lot. The host sees Hammer + Pass.
//             Hammer opens a winner picker (or accepts the
//             default — no winner if no bids).
//
// The host is the auctioneer. This is the auctioneer's cockpit.
// =============================================================

export default function HostControls({
  mode,
  lot,
  queuedLots,
  busy,
  onActivate,
  onHammer,
  onPass,
}) {
  if (mode === 'idle') {
    return <IdlePicker queuedLots={queuedLots} busy={busy} onActivate={onActivate} />
  }
  return <ActiveControls lot={lot} busy={busy} onHammer={onHammer} onPass={onPass} />
}

function IdlePicker({ queuedLots, busy, onActivate }) {
  const [open, setOpen] = useState(false)
  const [pick, setPick] = useState(queuedLots?.[0]?.id || '')

  // Keep the picked lot in sync if the queued list refreshes.
  if (pick && !queuedLots?.some((l) => l.id === pick)) {
    setPick(queuedLots?.[0]?.id || '')
  }

  if (!queuedLots || queuedLots.length === 0) {
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
                    {l.style} · {l.country} · base {l.basePrice?.toLocaleString('en-IN') || '—'}
                    {l.bidIncrement ? ` · +${l.bidIncrement.toLocaleString('en-IN')}` : ' · +—'}
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

function ActiveControls({ lot, busy, onHammer, onPass }) {
  const [confirmHammer, setConfirmHammer] = useState(false)
  const [confirmPass, setConfirmPass] = useState(false)

  if (confirmHammer) {
    return (
      <div className="host-controls host-controls-confirm">
        <p className="host-controls-confirm-text">
          Hammer <strong>{lot.name}</strong> at the current bid? The lot will be marked sold and the room will go back to the empty state.
        </p>
        <div className="host-controls-row">
          <button
            type="button"
            className="cta-btn host-controls-hammer"
            onClick={() => {
              onHammer()
              setConfirmHammer(false)
            }}
            disabled={busy}
          >
            <span className="cta-btn-content">
              <Check size={16} />
              Confirm hammer
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

  return (
    <div className="host-controls host-controls-active">
      <div className="host-controls-row">
        <button
          type="button"
          className="cta-btn host-controls-hammer"
          onClick={() => setConfirmHammer(true)}
          disabled={busy}
        >
          <span className="cta-btn-content">
            <Check size={16} />
            Hammer
          </span>
        </button>
        <button
          type="button"
          className="cta-btn host-controls-pass"
          onClick={() => setConfirmPass(true)}
          disabled={busy}
        >
          <span className="cta-btn-content">
            <X size={16} />
            Pass
          </span>
        </button>
      </div>
      <p className="host-controls-hint">
        The room returns to empty after this. No auto-advance.
      </p>
    </div>
  )
}