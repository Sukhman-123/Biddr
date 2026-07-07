import { useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Flag, X } from 'lucide-react'
import './StartAuctionModal.css'

export default function EndAuctionModal({
  open,
  tournament,
  busy,
  errorMessage,
  onConfirm,
  onCancel,
}) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="start-auction-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-auction-title"
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
              <Flag size={28} />
            </div>
            <h2 id="end-auction-title" className="start-auction-title">
              End the auction?
            </h2>
            <p className="start-auction-body">
              You're about to mark <strong>{tournament?.name || 'this tournament'}</strong> as <em>completed</em>.
            </p>
            <ul className="start-auction-list">
              <li>The tournament moves out of the live state.</li>
              <li>No more lots can be brought to the floor.</li>
              <li>Make sure every active lot has been sold, passed, or skipped first.</li>
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
                <span className="cta-btn-content">Keep it live</span>
              </button>
              <button
                type="button"
                className="cta-btn start-auction-confirm"
                onClick={onConfirm}
                disabled={busy}
              >
                <span className="cta-btn-content">
                  <Flag size={16} />
                  {busy ? 'Ending…' : 'End the auction'}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
