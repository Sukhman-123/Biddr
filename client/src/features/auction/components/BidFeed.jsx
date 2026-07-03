import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Play, Clock, ArrowUp, Pause, Zap, RotateCcw, SkipForward } from 'lucide-react'
import { formatPurse } from '../../tournaments/tournament.utils'
import './BidFeed.css'

const TYPE_META = {
  activated: {
    icon: <Play size={14} />,
    label: (it) => `brought ${it.lotName} to the floor`,
    cssClass: 'is-activated',
  },
  hammered: {
    icon: <Check size={14} />,
    label: (it, currency) =>
      `hammered ${it.lotName}${it.amount ? ' at ' + formatPurse(it.amount, currency, { compact: true }) : ''}`,
    cssClass: 'is-hammered',
  },
  passed: {
    icon: <X size={14} />,
    label: (it) => `passed ${it.lotName}`,
    cssClass: 'is-passed',
  },
  bid: {
    icon: <ArrowUp size={14} />,
    label: (it, currency) =>
      `${it.franchiseName || it.actor} bid ${formatPurse(it.amount, currency, { compact: true })} on ${it.lotName}`,
    cssClass: 'is-bid',
  },
  paused: {
    icon: <Pause size={14} />,
    label: () => `paused the auction`,
    cssClass: 'is-paused',
  },
  resumed: {
    icon: <Zap size={14} />,
    label: () => `resumed the auction`,
    cssClass: 'is-resumed',
  },
  undone: {
    icon: <RotateCcw size={14} />,
    label: (it) => `undid ${it.action || 'last action'}`,
    cssClass: 'is-undone',
  },
  deactivated: {
    icon: <SkipForward size={14} />,
    label: (it) => `skipped ${it.lotName || 'the lot'} back to queue`,
    cssClass: 'is-deactivated',
  },
}

export default function BidFeed({ items, currency }) {
  return (
    <div className="bid-feed" role="log" aria-live="polite" aria-relevant="additions">
      <div className="bid-feed-head">
        <span className="bid-feed-title">Auction feed</span>
        <span className="bid-feed-sub">Live event stream</span>
      </div>
      {items.length === 0 ? (
        <div className="bid-feed-empty">
          <p>Waiting for the first event.</p>
        </div>
      ) : (
        <ul className="bid-feed-list">
          <AnimatePresence initial={false}>
            {items.map((it) => {
              const meta = TYPE_META[it.type] || TYPE_META.activated
              return (
                <motion.li
                  key={it.id}
                  layout
                  className={`bid-feed-item ${meta.cssClass}`}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span className="bid-feed-icon" aria-hidden="true">
                    {meta.icon}
                  </span>
                  <div className="bid-feed-body">
                    <p className="bid-feed-line">
                      <strong>{it.actor}</strong> {meta.label(it, currency)}
                    </p>
                    <span className="bid-feed-time">
                      <Clock size={11} /> {formatTime(it.at)}
                    </span>
                  </div>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}

function formatTime(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ''
  }
}