import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Clock, Filter, Play, Search, Sparkles } from 'lucide-react'
import { formatPurse } from '../../tournaments/tournament.utils'
import './PlayerQueuePanel.css'

export default function PlayerQueuePanel({ lots, onSelectLot, busy, currency = 'INR' }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('queued')
  const [page, setPage] = useState(1)
  const pageSize = 8

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

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter, lots])

  const pageCount = Math.max(1, Math.ceil(filteredLots.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const startIndex = (currentPage - 1) * pageSize
  const visibleLots = filteredLots.slice(startIndex, startIndex + pageSize)
  const featuredLot = visibleLots[0] ?? null

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
        <>
          {featuredLot ? (
            <motion.section
              className="queue-spotlight"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="queue-spotlight-copy">
                <span className="queue-spotlight-label">
                  <Sparkles size={14} />
                  Next best option
                </span>
                <h4 className="queue-spotlight-name">{featuredLot.name}</h4>
                <p className="queue-spotlight-details">
                  {featuredLot.style} · {featuredLot.country} · {featuredLot.set}
                </p>
                <div className="queue-item-badges">
                  <span className="queue-badge">
                    <Clock size={12} />
                    Base {formatPurse(featuredLot.basePrice, currency, { compact: true })}
                  </span>
                  {featuredLot.bidIncrement != null && (
                    <span className="queue-badge">
                      Min +{formatPurse(featuredLot.bidIncrement, currency, { compact: true })}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="queue-activate-btn"
                disabled={busy}
                onClick={() => onSelectLot && onSelectLot(featuredLot.id)}
              >
                <Play size={16} />
                Activate now
              </button>
            </motion.section>
          ) : null}

          <div className="queue-pagination">
            <span className="queue-page-copy">
              Showing {startIndex + 1}-{Math.min(startIndex + visibleLots.length, filteredLots.length)} of {filteredLots.length}
            </span>
            <div className="queue-page-actions">
              <button
                type="button"
                className="queue-page-btn"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} />
                Prev
              </button>
              <span className="queue-page-indicator">
                Page {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                className="queue-page-btn"
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                disabled={currentPage === pageCount}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="queue-grid">
            {visibleLots.map((lot, index) => (
              <motion.div
                key={lot.id}
                className={`queue-card ${index === 0 ? 'is-featured' : ''}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                onClick={() => onSelectLot && onSelectLot(lot.id)}
              >
                <div className="queue-card-top">
                  <div className="queue-item-info">
                    <h4 className="queue-item-name">{lot.name}</h4>
                    <p className="queue-item-details">
                      {lot.style} · {lot.country}
                    </p>
                  </div>
                  <span className="queue-card-set">{lot.set}</span>
                </div>
                <div className="queue-item-badges">
                  <span className="queue-badge">
                    <Clock size={12} />
                    Base {formatPurse(lot.basePrice, currency, { compact: true })}
                  </span>
                  {lot.bidIncrement != null && (
                    <span className="queue-badge">
                      Min +{formatPurse(lot.bidIncrement, currency, { compact: true })}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="queue-activate-btn"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectLot && onSelectLot(lot.id)
                  }}
                >
                  <Play size={16} />
                  Activate
                </button>
              </motion.div>
            ))}
          </div>
        </>
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
