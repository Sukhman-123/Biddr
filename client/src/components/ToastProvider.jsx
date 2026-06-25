import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import './ToastProvider.css'

// =============================================================
// Project-wide toast / notification system.
//
// Mount <ToastProvider> once near the top of the React tree (in
// App.jsx). Anywhere below it, call useToast() to get:
//   toast.success('Bid accepted')
//   toast.warn('You were outbid')
//   toast.error('Could not reach the server')
//   toast.info('Time extended by 10 seconds')
//
// Toasts auto-dismiss after 4 seconds. Up to 3 are visible at once;
// newer ones push older ones out. The animation respects
// useReducedMotion so screen-reader users and motion-sensitive
// users get a clean fade-in instead of a slide.
//
// This is the first toast system in the codebase. The auction
// room uses it for "Paddle raise coming soon" and for
// acknowledgement of host actions. Other pages can adopt it
// incrementally.
// =============================================================

const ToastContext = createContext(null)

const VARIANT_TO_TONE = {
  success: 'is-success',
  warn: 'is-warn',
  error: 'is-error',
  info: 'is-info',
}

const VARIANT_TO_ICON = {
  success: '✓',
  warn: '!',
  error: '×',
  info: 'i',
}

const MAX_VISIBLE = 3
const AUTO_DISMISS_MS = 4000

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counterRef = useRef(0)
  const reduceMotion = useReducedMotion()

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (variant, message) => {
      if (!message) return
      counterRef.current += 1
      const id = `toast-${Date.now()}-${counterRef.current}`
      const entry = { id, variant, message }
      setToasts((current) => {
        const next = [...current, entry]
        // Cap visible count; drop oldest first.
        return next.slice(-MAX_VISIBLE)
      })
      // Auto-dismiss. Stored in a closure so each toast has its own timer.
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    },
    [dismiss],
  )

  const api = useMemo(
    () => ({
      success: (msg) => show('success', msg),
      warn: (msg) => show('warn', msg),
      error: (msg) => show('error', msg),
      info: (msg) => show('info', msg),
      dismiss,
    }),
    [show, dismiss],
  )

  // Entrance / exit animation. Calm: small slide-up + opacity, no bounce.
  const motionProps = reduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, y: 12, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -8, scale: 0.98 },
        transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
      }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="biddr-toast-region"
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`biddr-toast ${VARIANT_TO_TONE[t.variant] || 'is-info'}`}
              {...motionProps}
              onClick={() => dismiss(t.id)}
              role="status"
            >
              <span className="biddr-toast-icon" aria-hidden="true">
                {VARIANT_TO_ICON[t.variant] || 'i'}
              </span>
              <span className="biddr-toast-message">{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // No provider — degrade to a no-op so non-toast-using trees
    // (e.g. tests) don't crash. A console.warn helps the developer
    // notice that they forgot to mount the provider.
    if (typeof console !== 'undefined') {
      console.warn(
        'useToast() called without a <ToastProvider> in the tree; calls are no-ops.',
      )
    }
    return {
      success: () => {},
      warn: () => {},
      error: () => {},
      info: () => {},
      dismiss: () => {},
    }
  }
  return ctx
}

export default ToastProvider