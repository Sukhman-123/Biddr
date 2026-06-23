import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import {
  Download,
  FileSpreadsheet,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Users,
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

function AuctionPoolSection({ tournamentId, currency }) {
  const [lots, setLots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [adding, setAdding] = useState(false)
  const [editingLot, setEditingLot] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
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
  const groups = useMemo(() => groupLotsBySet(lots), [lots])

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

      {!loading && lots.length === 0 ? (
        <div className="pool-empty">
          <Users size={28} />
          <p>No players yet — add one or upload a sheet.</p>
        </div>
      ) : null}

      {groups.map((group) => (
        <div className="pool-group" key={group.set}>
          <header className="pool-group-head">
            <span className="pool-group-title">{group.set}</span>
            <span className="pool-group-count">{group.lots.length}</span>
          </header>
          <ul className="pool-list">
            {group.lots.map((lot) => {
              const style = styleTone(lot.style)
              const status = statusTone(lot.status)
              return (
                <motion.li
                  key={lot.id}
                  className="pool-row"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
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
                  <div className="pool-info">
                    <div className="pool-info-line">
                      <span className="pool-name">{lot.name}</span>
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
                      Base {formatPurse(lot.basePrice, currency)}
                      <span
                        className="pool-status"
                        style={{ background: status.bg, color: status.fg }}
                      >
                        {lot.status}
                      </span>
                    </div>
                  </div>
                  <div className="pool-row-actions">
                    <button
                      type="button"
                      className="pool-row-btn"
                      onClick={() => setEditingLot(lot)}
                      aria-label={`Edit ${lot.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="pool-row-btn pool-row-btn--danger"
                      onClick={() => onRemove(lot)}
                      aria-label={`Remove ${lot.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        </div>
      ))}

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