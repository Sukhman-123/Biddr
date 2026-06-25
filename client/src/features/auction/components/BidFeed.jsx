import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Play, Clock } from 'lucide-react'
import { formatPurse } from '../../tournaments/tournament.utils'
import './BidFeed.css'

// BidFeed — read-only stream of host-driven events. Each entry is
// a row with an icon, a description, and a relative timestamp.
// v1 events come from the socket only; v2 will also include
// paddle raises from viewers.
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
            {items.map((it) => (
              <motion.li
                key={it.id}
                layout
                className={`bid-feed-item is-${it.type}`}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="bid-feed-icon" aria-hidden="true">
                  {it.type === 'activated' ? <Play size={14} /> : null}
                  {it.type === 'hammered' ? <Check size={14} /> : null}
                  {it.type === 'passed' ? <X size={14} /> : null}
                </span>
                <div className="bid-feed-body">
                  <p className="bid-feed-line">
                    <strong>{it.actor}</strong>{' '}
                    {it.type === 'activated'
                      ? `brought ${it.lotName} to the floor`
                      : it.type === 'hammered'
                      ? `hammered ${it.lotName}${it.amount ? ' at ' + formatPurse(it.amount, currency, { compact: true }) : ''}`
                      : it.type === 'passed'
                      ? `passed ${it.lotName}`
                      : it.lotName}
                  </p>
                  <span className="bid-feed-time">
                    <Clock size={11} /> {formatTime(it.at)}
                  </span>
                </div>
              </motion.li>
            ))}
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