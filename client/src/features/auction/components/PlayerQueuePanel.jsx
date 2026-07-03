import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Clock, Play, Filter } from 'lucide-react'
import { formatPurse } from '../../tournaments/tournament.utils'
import './PlayerQueuePanel.css'

export default function PlayerQueuePanel({ lots, onSelectLot, busy }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('queued')

  // Filter queued lots only
  const queuedLots = useMemo(() => {
    return lots.filter(lot => lot.status === 'queued' && lot.auctionStatus === 'idle')
  }, [lots])

  const filteredLots = useMemo(() => {
    const q = query.trim().toLowerCase()
    return queuedLots.filter(lot => {
      return !q ||
        lot.name?.toLowerCase().includes(q) ||
        lot.country?.toLowerCase().includes(q) ||
        lot.style?.toLowerCase().includes(q)
    })
  }, [queuedLots, query])

  return (
    <div className="player-queue">
      <div className="queue-head">
        <div className="queue-header-text">
          <h3 className="queue-title">
            {filteredLots.length > 0 ? (
              <>
                <span>Queued players</span>
                <span className="queue-count">({filteredLots.length})</span>
              </>
            ) : (
              'No players queued'
            )}
          </h3>
        </div>

        <div className="queue-controls">
          <div className="queue-search">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search players..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="queue-search-input"
            />
          </div>

          <div className="queue-filter">
            <Filter size={14} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="queue-filter-select"
            >
              <option value="queued">Queued only</option>
            </select>
          </div>
        </div>
      </div>

      {filteredLots.length > 0 ? (
        <div className="queue-list">
          {filteredLots.map((lot, index) => (
            <motion.div
              key={lot.id}
              className="queue-item"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              onClick={() => onSelectLot && onSelectLot(lot)}
            >
              <div className="queue-item-left">
                <div className="queue-item-info">
                  <h4 className="queue-item-name">{lot.name}</h4>
                  <p className="queue-item-details">
                    {lot.style} · {lot.country} · {lot.set}
                  </p>
                </div>
                <div className="queue-item-badges">
                  <span className="queue-badge">
                    <Clock size={12} />
                    Base {formatPurse(lot.basePrice, 'INR', { compact: true })}
                  </span>
                  {lot.bidIncrement && (
                    <span className="queue-badge">
                      Min +{formatPurse(lot.bidIncrement, 'INR', { compact: true })}
                    </span>
                  )}
                </div>
              </div>

              <div className="queue-item-right">
                <button
                  type="button"
                  className="queue-activate-btn"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectLot && onSelectLot(lot)
                  }}
                >
                  <Play size={16} />
                  Activate
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : query ? (
        <div className="queue-empty">
          No players match your search
        </div>
      ) : (
        <div className="queue-empty">
          <p>All players are on the floor or have been sold</p>
          <p>Queue more from the tournament lobby</p>
        </div>
      )}
    </div>
  )
}