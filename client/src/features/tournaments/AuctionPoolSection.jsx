import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import {
  listLotsRequest,
  bulkUploadLotsRequest,
  deleteLotRequest,
  downloadTemplateRequest,
} from './tournament.api'
import {
  groupLotsBySet,
  initialsFor,
  statusBreakdown,
  statusTone,
  styleTone,
} from './lot.utils'
import { formatPurse } from './tournament.utils'
import AddLotModal from './AddLotModal'
import './AuctionPoolSection.css'

const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'queued', label: 'Queued' },
  { id: 'sold', label: 'Sold' },
  { id: 'unsold', label: 'Unsold' },
]

function AuctionPoolSection({ tournamentId, currency }) {
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editingLot, setEditingLot] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [collapsedSets, setCollapsedSets] = useState(() => new Set())
  const fileRef = useRef(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listLotsRequest(tournamentId)
      setLots(data)
    } catch (err) {
      setError(err?.message ?? 'Could not load the pool')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Intentionally fetches on mount/tournamentId change. The setState calls
    // inside `refresh` are the desired side effect — this is the standard
    // "fetch data when something changes" effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId])

  const counts = useMemo(() => statusBreakdown(lots), [lots])

  const filteredLots = useMemo(() => {
    const q = query.trim().toLowerCase()
    return lots.filter((lot) => {
      const matchesQuery =
        !q ||
        lot.name?.toLowerCase().includes(q) ||
        lot.country?.toLowerCase().includes(q) ||
        lot.style?.toLowerCase().includes(q)
      const matchesStatus =
        statusFilter === 'all' || lot.status?.toLowerCase() === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [lots, query, statusFilter])

  const groups = useMemo(() => groupLotsBySet(filteredLots), [filteredLots])

  const toggleSet = (setName) => {
    setCollapsedSets((prev) => {
      const next = new Set(prev)
      if (next.has(setName)) next.delete(setName)
      else next.add(setName)
      return next
    })
  }

  const allSetNames = useMemo(() => groups.map((g) => g.set), [groups])
  const allCollapsed =
    allSetNames.length > 0 && allSetNames.every((s) => collapsedSets.has(s))

  const toggleAll = () => {
    setCollapsedSets(allCollapsed ? new Set() : new Set(allSetNames))
  }

  const onAddedOrEdited = (lot) => {
    if (!lot) return
    setLots((prev) => {
      const idx = prev.findIndex((l) => l.id === lot.id)
      if (idx === -1) return [...prev, lot]
      const next = prev.slice()
      next[idx] = lot
      return next
    })
    setAdding(false)
    setEditingLot(null)
  }

  const onRemove = async (lot) => {
    if (!window.confirm(`Remove ${lot.name} from the pool?`)) return
    try {
      await deleteLotRequest(lot.id)
      setLots((prev) => prev.filter((l) => l.id !== lot.id))
    } catch (err) {
      window.alert(err?.message ?? 'Could not remove')
    }
  }

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    setUploadResult(null)
    try {
      const result = await bulkUploadLotsRequest(tournamentId, file)
      setUploadResult(result)
      await refresh()
    } catch (err) {
      setUploadResult({ created: 0, errors: [{ row: 0, message: err?.message ?? 'Upload failed' }] })
    } finally {
      setUploading(false)
    }
  }

  const onDownload = async (format) => {
    try {
      await downloadTemplateRequest(tournamentId, format)
    } catch (err) {
      window.alert(err?.message ?? 'Could not download the template')
    }
  }

  const totalMatched = filteredLots.length
  const isFiltering = query.trim() !== '' || statusFilter !== 'all'

  return (
    <section className="pool-section" aria-label="Auction pool">
      <header className="pool-head">
        <div className="pool-head-text">
          <span className="tournaments-eyebrow">Auction pool</span>
          <h2>Players</h2>
          <p>
            {loading
              ? 'Loading…'
              : `${lots.length} player${lots.length === 1 ? '' : 's'} · ${counts.queued} queued · ${counts.sold} sold · ${counts.unsold} unsold`}
          </p>
        </div>
        <div className="pool-actions">
          <button
            type="button"
            className="pool-btn pool-btn--ghost"
            onClick={() => onDownload('csv')}
          >
            <Download size={14} /> CSV template
          </button>
          <button
            type="button"
            className="pool-btn pool-btn--ghost"
            onClick={() => onDownload('xlsx')}
          >
            <FileSpreadsheet size={14} /> XLSX template
          </button>
          <button
            type="button"
            className="pool-btn pool-btn--secondary"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} />
            {uploading ? 'Uploading…' : 'Upload sheet'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={onFileChosen}
            hidden
          />
          <button
            type="button"
            className="pool-btn pool-btn--primary"
            onClick={() => setAdding(true)}
          >
            <Plus size={14} /> Add player
          </button>
        </div>
      </header>

      {error ? (
        <div className="pool-banner pool-banner--error">{error}</div>
      ) : null}

      {uploadResult ? (
        <div
          className={clsx(
            'pool-banner',
            uploadResult.errors.length === 0
              ? 'pool-banner--ok'
              : uploadResult.created > 0
                ? 'pool-banner--partial'
                : 'pool-banner--error',
          )}
        >
          <strong>
            {uploadResult.created} added
            {uploadResult.errors.length > 0
              ? `, ${uploadResult.errors.length} skipped`
              : ''}
          </strong>
          {uploadResult.errors.length > 0 ? (
            <ul className="pool-banner-errors">
              {uploadResult.errors.slice(0, 20).map((e, idx) => (
                <li key={`${e.row}-${idx}`}>
                  Row {e.row}: {e.message}
                </li>
              ))}
              {uploadResult.errors.length > 20 ? (
                <li>…and {uploadResult.errors.length - 20} more</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      {!loading && lots.length > 0 ? (
        <div className="pool-toolbar">
          <div className="pool-search">
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, country, or style…"
            />
            {query ? (
              <button
                type="button"
                className="pool-search-clear"
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>
          <div className="pool-filters">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={clsx('pool-filter-chip', statusFilter === f.id && 'is-active')}
                onClick={() => setStatusFilter(f.id)}
              >
                {f.label}
                {f.id !== 'all' ? (
                  <span className="pool-filter-count">{counts[f.id] ?? 0}</span>
                ) : null}
              </button>
            ))}
          </div>
          {allSetNames.length > 1 ? (
            <button type="button" className="pool-collapse-all" onClick={toggleAll}>
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </button>
          ) : null}
        </div>
      ) : null}

      {isFiltering ? (
        <p className="pool-match-count">
          {totalMatched} match{totalMatched === 1 ? '' : 'es'}
        </p>
      ) : null}

      {!loading && lots.length === 0 ? (
        <div className="pool-empty">
          <Users size={28} />
          <p>No players yet — add one or upload a sheet.</p>
        </div>
      ) : null}

      {!loading && lots.length > 0 && filteredLots.length === 0 ? (
        <div className="pool-empty">
          <Search size={28} />
          <p>No players match your search or filter.</p>
        </div>
      ) : null}

      {groups.map((group) => {
        const isCollapsed = collapsedSets.has(group.set)
        return (
          <div className="pool-group" key={group.set}>
            <button
              type="button"
              className="pool-group-head"
              onClick={() => toggleSet(group.set)}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              <span className="pool-group-title">{group.set}</span>
              <span className="pool-group-count">{group.lots.length}</span>
            </button>
            <AnimatePresence initial={false}>
              {!isCollapsed ? (
                <motion.ul
                  className="pool-grid"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ overflow: 'hidden' }}
                >
                  {group.lots.map((lot) => {
                    const style = styleTone(lot.style)
                    const status = statusTone(lot.status)
                    return (
                      <motion.li
                        key={lot.id}
                        className="pool-card"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="pool-card-top">
                          <div
                            className="pool-avatar"
                            style={
                              lot.photoUrl
                                ? { backgroundImage: `url(${lot.photoUrl})` }
                                : undefined
                            }
                          >
                            {lot.photoUrl ? null : initialsFor(lot.name)}
                          </div>
                          <div className="pool-row-actions">
                            <button
                              type="button"
                              className="pool-row-btn"
                              onClick={() => setEditingLot(lot)}
                              aria-label={`Edit ${lot.name}`}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              className="pool-row-btn pool-row-btn--danger"
                              onClick={() => onRemove(lot)}
                              aria-label={`Remove ${lot.name}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <div className="pool-info">
                          <span className="pool-name" title={lot.name}>
                            {lot.name}
                          </span>
                          <div className="pool-info-line">
                            <span
                              className="pool-chip pool-chip--style"
                              style={{ background: style.bg, color: style.fg }}
                            >
                              {lot.style}
                            </span>
                            <span className="pool-chip pool-chip--country">
                              {lot.country}
                            </span>
                          </div>
                          <div className="pool-info-sub">
                            <span>Base {formatPurse(lot.basePrice, currency)}</span>
                            <span
                              className="pool-status"
                              style={{ background: status.bg, color: status.fg }}
                            >
                              {lot.status}
                            </span>
                          </div>
                        </div>
                      </motion.li>
                    )
                  })}
                </motion.ul>
              ) : null}
            </AnimatePresence>
          </div>
        )
      })}

      {adding ? (
        <AddLotModal
          tournamentId={tournamentId}
          onClose={() => setAdding(false)}
          onSaved={onAddedOrEdited}
        />
      ) : null}
      {editingLot ? (
        <AddLotModal
          tournamentId={tournamentId}
          lot={editingLot}
          onClose={() => setEditingLot(null)}
          onSaved={onAddedOrEdited}
        />
      ) : null}
    </section>
  )
}

export default AuctionPoolSection