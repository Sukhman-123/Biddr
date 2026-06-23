import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, X } from 'lucide-react'
import {
  validateLotInput,
  emptyLotDraft,
  LOT_STYLES,
} from './lot.utils'
import { createLotRequest, updateLotRequest } from './tournament.api'
import './AddLotModal.css'

function AddLotModal({ tournamentId, lot, onClose, onSaved }) {
  const initial = lot
    ? {
        name: lot.name,
        style: lot.style,
        country: lot.country,
        basePrice: String(lot.basePrice),
        photoUrl: lot.photoUrl ?? '',
        set: lot.set,
      }
    : emptyLotDraft()
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(lot)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  const updateField = (key) => (e) =>
    setDraft((prev) => ({ ...prev, [key]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    const v = validateLotInput(draft)
    if (!v.ok) {
      setError(v.message)
      return
    }
    setError(null)
    setSaving(true)
    try {
      const saved = isEdit
        ? await updateLotRequest(lot.id, v.data)
        : await createLotRequest(tournamentId, v.data)
      onSaved(saved)
    } catch (err) {
      setError(err?.message ?? 'Could not save the player')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="addlot-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={() => !saving && onClose()}
        role="presentation"
      >
        <motion.div
          className="addlot-modal"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={isEdit ? 'Edit player' : 'Add player'}
        >
          <header className="addlot-head">
            <div>
              <h3>{isEdit ? 'Edit player' : 'Add player'}</h3>
              <p>
                {isEdit
                  ? 'Update this player before auctioning.'
                  : 'Add a single player to the auction pool.'}
              </p>
            </div>
            <button
              type="button"
              className="addlot-close"
              onClick={() => !saving && onClose()}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </header>

          <form className="addlot-form" onSubmit={onSubmit}>
            <label className="addlot-field">
              <span>Player name</span>
              <input
                type="text"
                value={draft.name}
                onChange={updateField('name')}
                maxLength={120}
                autoFocus
                required
              />
            </label>

            <div className="addlot-row">
              <label className="addlot-field">
                <span>Cricketing style</span>
                <select value={draft.style} onChange={updateField('style')}>
                  {LOT_STYLES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="addlot-field">
                <span>Country</span>
                <input
                  type="text"
                  value={draft.country}
                  onChange={updateField('country')}
                  maxLength={80}
                  placeholder="India"
                />
              </label>
            </div>

            <div className="addlot-row">
              <label className="addlot-field">
                <span>Base price</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draft.basePrice}
                  onChange={updateField('basePrice')}
                  placeholder="2000000"
                />
              </label>

              <label className="addlot-field">
                <span>Set</span>
                <input
                  type="text"
                  value={draft.set}
                  onChange={updateField('set')}
                  maxLength={60}
                  placeholder="Marquee"
                />
              </label>
            </div>

            <label className="addlot-field">
              <span>Photo URL (optional)</span>
              <div className="addlot-photo-input">
                <Camera size={14} />
                <input
                  type="url"
                  value={draft.photoUrl}
                  onChange={updateField('photoUrl')}
                  placeholder="https://example.com/player.jpg"
                  maxLength={600}
                />
              </div>
            </label>

            {error ? <div className="addlot-error">{error}</div> : null}

            <footer className="addlot-foot">
              <button
                type="button"
                className="addlot-btn addlot-btn--ghost"
                onClick={() => !saving && onClose()}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="addlot-btn addlot-btn--primary"
                disabled={saving}
              >
                {saving
                  ? 'Saving…'
                  : isEdit
                    ? 'Save changes'
                    : 'Add to pool'}
              </button>
            </footer>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default AddLotModal
