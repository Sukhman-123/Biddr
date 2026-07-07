import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Gavel, X } from 'lucide-react'
import './StartAuctionModal.css'

// =============================================================
// StartAuctionModal — one-shot confirm before flipping an
// upcoming tournament to "live".
//
// What it confirms:
//   "You're about to start the auction for {name}. After this,
//    the room becomes live and any queued lots can be brought
//    to the floor. The lobby's Enter-a-room button unlocks."
//
// What it does NOT promise (yet):
//   - It does not auto-advance lots or run a timer. The host
//     drives every transition inside the room.
//   - It cannot be undone from the lobby in v1 — once live, the
//     host can still hammer/pass lots, but the tournament's
//     status is sticky until the host marks it completed (v2).
//
// This is the auctioneer stepping up to the podium. They get
// one click of pause.
// =============================================================

export default function StartAuctionModal({
  open,
  tournament,
  busy,
  errorMessage,
  onConfirm,
  onCancel,
}) {
  const reduceMotion = useReducedMotion()

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  useEffect(() => {
    if (!open) return undefined
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="start-auction-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="start-auction-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={() => !busy && onCancel?.()}
        >
          <motion.div
            className="start-auction-card"
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="start-auction-close"
              onClick={onCancel}
              disabled={busy}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="start-auction-icon" aria-hidden="true">
              <Gavel size={28} />
            </div>
            <h2 id="start-auction-title" className="start-auction-title">
              Start the auction?
            </h2>
            <p className="start-auction-body">
              You're about to flip <strong>{tournament?.name || 'this tournament'}</strong> to <em>live</em>. After this:
            </p>
            <ul className="start-auction-list">
              <li>The lobby's <strong>Enter a room</strong> button unlocks for viewers.</li>
              <li>You'll be able to bring queued lots to the floor.</li>
              <li>You're the auctioneer — only you can hammer or pass.</li>
            </ul>

            {errorMessage ? (
              <p className="start-auction-error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="start-auction-actions">
              <button
                type="button"
                className="cta-btn start-auction-secondary"
                onClick={onCancel}
                disabled={busy}
              >
                <span className="cta-btn-content">Not yet</span>
              </button>
              <button
                type="button"
                className="cta-btn start-auction-confirm"
                onClick={onConfirm}
                disabled={busy}
                data-testid="start-auction-confirm"
              >
                <span className="cta-btn-content">
                  <Gavel size={16} />
                  {busy ? 'Starting…' : 'Start the auction'}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
