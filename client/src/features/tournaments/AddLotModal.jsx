import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, ExternalLink, Trash2, Upload, X } from 'lucide-react'
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
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const photoInputRef = useRef(null)

  const isEdit = Boolean(lot)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, saving])

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousRootOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousRootOverflow
    }
  }, [])

  useEffect(() => () => {
    if (photoPreview.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  const updateField = (key) => (e) =>
    setDraft((prev) => ({ ...prev, [key]: e.target.value }))

  const onPhotoSelected = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Player photo must be 2 MB or smaller')
      return
    }

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    setPreviewFailed(false)
    setError(null)
    setDraft((prev) => ({ ...prev, photoUrl: '' }))
  }

  const removePhoto = () => {
    setPhotoFile(null)
    setPhotoPreview('')
    setPreviewFailed(false)
    setDraft((prev) => ({ ...prev, photoUrl: '' }))
  }

  const updatePhotoUrl = (event) => {
    setPhotoFile(null)
    setPhotoPreview('')
    setPreviewFailed(false)
    setDraft((prev) => ({ ...prev, photoUrl: event.target.value }))
  }

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
        ? await updateLotRequest(lot.id, { ...v.data, photoFile })
        : await createLotRequest(tournamentId, { ...v.data, photoFile })
      onSaved(saved)
    } catch (err) {
      setError(err?.message ?? 'Could not save the player')
    } finally {
      setSaving(false)
    }
  }

  const previewSource = photoPreview || draft.photoUrl
  const playerInitial = (draft.name || '?').trim().charAt(0).toUpperCase() || '?'

  return createPortal(
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

            <div className="addlot-field">
              <span>Player photo (optional)</span>
              <div className="addlot-photo-card">
                <div className="addlot-photo-preview">
                  {previewSource && !previewFailed ? (
                    <a
                      href={previewSource}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`Open full photo for ${draft.name || 'player'} in a new tab`}
                      title="Open full image in a new tab"
                    >
                      <img
                        src={previewSource}
                        alt=""
                        onError={() => setPreviewFailed(true)}
                      />
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : (
                    <span>{playerInitial}</span>
                  )}
                </div>
                <div className="addlot-photo-copy">
                  <strong>{photoFile ? photoFile.name : previewSource ? 'Photo selected' : 'Add a player photo'}</strong>
                  <small>JPG, PNG, or WebP · maximum 2 MB</small>
                  <div className="addlot-photo-actions">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={saving}
                    >
                      <Upload size={13} />
                      {previewSource ? 'Replace' : 'Choose photo'}
                    </button>
                    {previewSource ? (
                      <>
                        <a href={previewSource} target="_blank" rel="noreferrer">
                          <ExternalLink size={13} />
                          {photoFile ? 'Preview' : 'Open full image'}
                        </a>
                        <button type="button" onClick={removePhoto} disabled={saving}>
                          <Trash2 size={13} /> Remove
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                <input
                  ref={photoInputRef}
                  className="addlot-photo-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={onPhotoSelected}
                  disabled={saving}
                />
              </div>

              <details className="addlot-photo-url-option">
                <summary><Camera size={13} /> Use an image URL instead</summary>
                <div className="addlot-photo-input">
                  <Camera size={14} />
                  <input
                    type="url"
                    value={draft.photoUrl}
                    onChange={updatePhotoUrl}
                    placeholder="https://example.com/player.jpg"
                    maxLength={600}
                    disabled={saving}
                  />
                </div>
              </details>
            </div>

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
                  ? photoFile ? 'Uploading…' : 'Saving…'
                  : isEdit
                    ? 'Save changes'
                    : 'Add to pool'}
              </button>
            </footer>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

export default AddLotModal
