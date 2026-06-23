import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, RefreshCw, X } from 'lucide-react'
import { updateMeRequest } from '../auth/auth.api'
import './EditProfileModal.css'

const ACCENT_PRESETS = [
  '#f5b94a',
  '#ff7a5a',
  '#5ac8ff',
  '#52e88e',
  '#cf6bd6',
  '#7e7eff',
  '#ffaa52',
]

function EditProfileModal({ user, onClose, onSaved }) {
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accentColor, setAccentColor] = useState(
    localStorage.getItem('biddr:profile-preferences')
      ? JSON.parse(localStorage.getItem('biddr:profile-preferences')).accentColor ?? '#f5b94a'
      : '#f5b94a',
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

  const onSubmit = async (e) => {
    e.preventDefault()
    if (saving) return
    setError(null)

    if (fullName.trim() && fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters')
      return
    }
    if (password && password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setSaving(true)
    try {
      const patch = {}
      if (fullName.trim() && fullName.trim() !== user?.fullName) {
        patch.fullName = fullName.trim()
      }
      if (password) {
        patch.password = password
      }
      const updated = await updateMeRequest(patch)

      // Persist accent change to localStorage as the existing preferences hook expects
      const currentPrefs = JSON.parse(
        localStorage.getItem('biddr:profile-preferences') || '{}',
      )
      localStorage.setItem(
        'biddr:profile-preferences',
        JSON.stringify({ ...currentPrefs, accentColor }),
      )
      window.dispatchEvent(new Event('biddr:preferences-changed'))

      onSaved(updated)
    } catch (err) {
      setError(err?.message ?? 'Could not save your changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="profile-edit-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        onClick={() => !saving && onClose()}
        role="presentation"
      >
        <motion.div
          className="profile-edit-modal"
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Edit profile"
        >
          <header className="profile-edit-head">
            <div>
              <h3>Edit profile</h3>
              <p>Update your name, password, and accent color.</p>
            </div>
            <button
              type="button"
              className="profile-edit-close"
              onClick={() => !saving && onClose()}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </header>

          <form className="profile-edit-form" onSubmit={onSubmit}>
            <label className="profile-edit-field">
              <span>Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={80}
                autoComplete="name"
                required
              />
            </label>

            <label className="profile-edit-field">
              <span>New password (leave blank to keep current)</span>
              <div className="profile-edit-password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="profile-edit-toggle-password"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </label>

            <div className="profile-edit-field">
              <span>Accent color</span>
              <div className="profile-edit-accents">
                {ACCENT_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`profile-edit-accent${accentColor === color ? ' is-active' : ''}`}
                    style={{ background: color }}
                    onClick={() => setAccentColor(color)}
                    aria-label={`Accent ${color}`}
                    aria-pressed={accentColor === color}
                  />
                ))}
                <label className="profile-edit-accent-pick">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                  />
                  <RefreshCw size={12} />
                  <span>Custom</span>
                </label>
              </div>
              <div
                className="profile-edit-accent-preview"
                style={{ '--preview': accentColor }}
              >
                Live preview on the cover and tournament cards.
              </div>
            </div>

            {error ? (
              <div className="profile-edit-error">{error}</div>
            ) : null}

            <footer className="profile-edit-foot">
              <button
                type="button"
                className="profile-edit-btn profile-edit-btn--ghost"
                onClick={() => !saving && onClose()}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="profile-edit-btn profile-edit-btn--primary"
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </footer>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default EditProfileModal
