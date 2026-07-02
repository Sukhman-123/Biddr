import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { updateTournamentRequest } from './tournament.api'
import './EditTournamentModal.css'

const PRESET_GRADIENTS = [
  { id: 'midnight', label: 'Midnight', from: '#1d2436', via: '#3a2a52', to: '#0a0d16' },
  { id: 'sunset', label: 'Sunset', from: '#f59e0b', via: '#ec4899', to: '#1e1b4b' },
  { id: 'forest', label: 'Forest', from: '#14532d', via: '#15803d', to: '#052e16' },
  { id: 'ocean', label: 'Ocean', from: '#0c4a6e', via: '#0e7490', to: '#082f49' },
  { id: 'ruby', label: 'Ruby', from: '#7f1d1d', via: '#9f1239', to: '#1f1010' },
  { id: 'steel', label: 'Steel', from: '#334155', via: '#475569', to: '#0f172a' },
]

function pickPreset(from, via, to) {
  const match = PRESET_GRADIENTS.find(
    (p) => p.from === from && p.via === via && p.to === to,
  )
  return match ? match.id : 'custom'
}

function isoToInput(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

function EditTournamentModal({ tournament, onClose, onSaved }) {
  const [name, setName] = useState(tournament.name ?? '')
  const [description, setDescription] = useState(tournament.description ?? '')
  const [region, setRegion] = useState(tournament.region ?? '')
  const [startDate, setStartDate] = useState(isoToInput(tournament.startDate))
  const [endDate, setEndDate] = useState(isoToInput(tournament.endDate))
  const [visibility, setVisibility] = useState(tournament.visibility ?? 'public')
  const cover = tournament.cover ?? {}
  const [gradientFrom, setGradientFrom] = useState(cover.gradientFrom ?? '#1d2436')
  const [gradientVia, setGradientVia] = useState(cover.gradientVia ?? '#3a2a52')
  const [gradientTo, setGradientTo] = useState(cover.gradientTo ?? '#0a0d16')
  const [accentHex, setAccentHex] = useState(cover.accentHex ?? '#f5b94a')
  const [presetId, setPresetId] = useState(
    pickPreset(cover.gradientFrom, cover.gradientVia, cover.gradientTo),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  // Lock body scroll while the modal is open, and ensure the portal
  // target renders outside any transformed/filtered ancestor so
  // `position: fixed` reliably anchors to the real viewport.
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  const applyPreset = (preset) => {
    setPresetId(preset.id)
    setGradientFrom(preset.from)
    setGradientVia(preset.via)
    setGradientTo(preset.to)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setError(null)
    setSaving(true)
    try {
      const updated = await updateTournamentRequest(tournament.id, {
        name: name.trim(),
        description: description.trim(),
        region: region.trim(),
        visibility,
        startDate: startDate ? new Date(startDate).toISOString() : null,
        endDate: endDate ? new Date(endDate).toISOString() : null,
        cover: {
          gradientFrom,
          gradientVia,
          gradientTo,
          accentHex,
        },
      })
      onSaved(updated)
    } catch (err) {
      setError(err?.message ?? 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="edit-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={() => !saving && onClose()}
        role="presentation"
      >
        <motion.div
          className="edit-modal"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Edit tournament"
        >
          <header className="edit-modal-head">
            <div>
              <h3>Edit tournament</h3>
              <p>Update visibility, schedule, and the look of the lobby.</p>
            </div>
            <button
              type="button"
              className="edit-modal-close"
              onClick={() => !saving && onClose()}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </header>

          <form className="edit-modal-form" onSubmit={onSubmit}>
            <div
              className="edit-cover-preview"
              style={{
                background: `linear-gradient(135deg, ${gradientFrom}, ${gradientVia}, ${gradientTo})`,
                '--cover-accent': accentHex,
              }}
            >
              <div className="edit-cover-preview-grid" />
              <div className="edit-cover-preview-body">
                <span className="edit-cover-preview-code">
                  {tournament.shortCode}
                </span>
                <span className="edit-cover-preview-name">
                  {name || 'Your tournament'}
                </span>
                <span className="edit-cover-preview-pill">
                  {visibility === 'invite-only' ? 'Invite-only' : 'Open'}
                </span>
              </div>
            </div>

            <div className="edit-modal-grid">
              <label className="edit-field edit-field--full">
                <span>Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  required
                />
              </label>
              <label className="edit-field edit-field--full">
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={600}
                  rows={3}
                />
              </label>
              <label className="edit-field">
                <span>Region</span>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  maxLength={80}
                />
              </label>
              <div className="edit-field">
                <span>Visibility</span>
                <div className="edit-vis-toggle">
                  <button
                    type="button"
                    className={`edit-vis-option${visibility === 'public' ? ' is-active' : ''}`}
                    onClick={() => setVisibility('public')}
                  >
                    Public
                  </button>
                  <button
                    type="button"
                    className={`edit-vis-option${visibility === 'invite-only' ? ' is-active' : ''}`}
                    onClick={() => setVisibility('invite-only')}
                  >
                    Invite-only
                  </button>
                </div>
              </div>
              <label className="edit-field">
                <span>Start date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="edit-field">
                <span>End date</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>

            <div className="edit-presets">
              {PRESET_GRADIENTS.map((preset) => {
                const isActive = preset.id === presetId
                return (
                  <button
                    key={preset.id}
                    type="button"
                    className={`edit-preset${isActive ? ' is-active' : ''}`}
                    onClick={() => applyPreset(preset)}
                    aria-label={preset.label}
                    aria-pressed={isActive}
                  >
                    <span
                      className="edit-preset-swatch"
                      style={{
                        background: `linear-gradient(135deg, ${preset.from}, ${preset.via}, ${preset.to})`,
                      }}
                    />
                    <span>{preset.label}</span>
                  </button>
                )
              })}
            </div>

            <div className="edit-color-row">
              {[
                { label: 'From', value: gradientFrom, onChange: setGradientFrom },
                { label: 'Via', value: gradientVia, onChange: setGradientVia },
                { label: 'To', value: gradientTo, onChange: setGradientTo },
                { label: 'Accent', value: accentHex, onChange: setAccentHex },
              ].map((picker) => (
                <label key={picker.label} className="edit-color-pick">
                  <span>{picker.label}</span>
                  <input
                    type="color"
                    value={picker.value}
                    onChange={(e) => {
                      picker.onChange(e.target.value)
                      setPresetId('custom')
                    }}
                  />
                </label>
              ))}
            </div>

            {error ? <div className="edit-modal-error">{error}</div> : null}

            <footer className="edit-modal-foot">
              <button
                type="button"
                className="edit-btn edit-btn--ghost"
                onClick={() => !saving && onClose()}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="edit-btn edit-btn--primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </footer>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

export default EditTournamentModal