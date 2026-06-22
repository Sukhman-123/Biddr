import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  EyeOff,
  Globe,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '../auth/useAuth'
import { createTournamentRequest } from './tournament.api'
import { formatPurse } from './tournament.utils'
import './CreateTournamentPage.css'

const CURRENCIES = ['INR', 'USD', 'GBP', 'AUD', 'AED', 'ZAR', 'PKR']

const DEFAULT_COLOR = '#f5b94a'

const SUGGESTED_FRANCHISE_COLORS = [
  '#f5b94a',
  '#ff7a5a',
  '#5ac8ff',
  '#52e88e',
  '#cf6bd6',
  '#7e7eff',
  '#ffaa52',
]

const RANDOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const generateShortCode = (len = 4) => {
  let out = ''
  for (let i = 0; i < len; i += 1) {
    out += RANDOM_CODE_ALPHABET[
      Math.floor(Math.random() * RANDOM_CODE_ALPHABET.length)
    ]
  }
  return out
}

const newFranchise = (color = DEFAULT_COLOR) => ({
  id: `f-${Math.random().toString(36).slice(2, 9)}`,
  name: '',
  city: '',
  colorHex: color,
})

const buildFranchiseRows = (count = 6) =>
  Array.from({ length: count }, () => newFranchise())

const sanitizeShortCode = (value) =>
  (value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)

const initialState = () => ({
  name: '',
  shortCode: '',
  description: '',
  region: '',
  startDate: '',
  endDate: '',
  currency: 'INR',
  pursePerFranchise: '100000000',
  visibility: 'public',
  franchises: buildFranchiseRows(6),
})

function validate(form) {
  const errors = {}

  if (!form.name.trim()) {
    errors.name = 'Tournament name is required'
  } else if (form.name.trim().length < 3) {
    errors.name = 'Use at least 3 characters'
  } else if (form.name.trim().length > 120) {
    errors.name = 'Keep it under 120 characters'
  }

  if (!form.shortCode.trim()) {
    errors.shortCode = 'Short code is required'
  } else if (form.shortCode.trim().length < 2) {
    errors.shortCode = 'At least 2 characters'
  }

  if (form.startDate && form.endDate) {
    if (form.endDate < form.startDate) {
      errors.endDate = 'End date must be after the start date'
    }
  }

  const purse = Number(form.pursePerFranchise)
  if (!form.pursePerFranchise || Number.isNaN(purse) || purse <= 0) {
    errors.pursePerFranchise = 'Enter a positive purse'
  }

  const validFranchises = form.franchises.filter((f) => f.name.trim())
  if (validFranchises.length < 2) {
    errors.franchises = 'Add at least two franchise teams'
  } else {
    const seen = new Set()
    for (const f of validFranchises) {
      const key = f.name.trim().toLowerCase()
      if (seen.has(key)) {
        errors.franchises = 'Franchise names must be unique'
        break
      }
      seen.add(key)
    }
  }

  return errors
}

function CreateTournamentPage() {
  const { user, isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState(initialState)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validFranchiseCount = useMemo(
    () => form.franchises.filter((f) => f.name.trim()).length,
    [form.franchises],
  )

  const pursePreview = useMemo(() => {
    const value = Number(form.pursePerFranchise)
    if (Number.isNaN(value) || value <= 0) return null
    return formatPurse(value, form.currency, { compact: true })
  }, [form.pursePerFranchise, form.currency])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const updateField = (key) => (event) => {
    const value = event.target.value
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev))
    if (serverError) setServerError(null)
  }

  const updateShortCode = (event) => {
    const value = sanitizeShortCode(event.target.value)
    setForm((prev) => ({ ...prev, shortCode: value }))
    setErrors((prev) =>
      prev.shortCode ? { ...prev, shortCode: undefined } : prev,
    )
    if (serverError) setServerError(null)
  }

  const regenerateShortCode = () => {
    setForm((prev) => ({ ...prev, shortCode: generateShortCode(4) }))
    setErrors((prev) =>
      prev.shortCode ? { ...prev, shortCode: undefined } : prev,
    )
  }

  const updateFranchise = (id, key, value) => {
    setForm((prev) => ({
      ...prev,
      franchises: prev.franchises.map((f) =>
        f.id === id ? { ...f, [key]: value } : f,
      ),
    }))
    setErrors((prev) =>
      prev.franchises ? { ...prev, franchises: undefined } : prev,
    )
  }

  const removeFranchise = (id) => {
    setForm((prev) => {
      if (prev.franchises.length <= 2) return prev
      return {
        ...prev,
        franchises: prev.franchises.filter((f) => f.id !== id),
      }
    })
  }

  const addFranchise = () => {
    const color =
      SUGGESTED_FRANCHISE_COLORS[
        form.franchises.length % SUGGESTED_FRANCHISE_COLORS.length
      ]
    setForm((prev) => ({
      ...prev,
      franchises: [...prev.franchises, newFranchise(color)],
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const nextErrors = validate(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    setServerError(null)
    setIsSubmitting(true)

    try {
      const validFranchises = form.franchises
        .filter((f) => f.name.trim())
        .map((f) => ({
          name: f.name.trim(),
          city: f.city.trim(),
          colorHex: f.colorHex,
        }))

      const payload = {
        name: form.name.trim(),
        shortCode: form.shortCode.trim(),
        description: form.description.trim(),
        region: form.region.trim(),
        currency: form.currency,
        pursePerFranchise: Number(form.pursePerFranchise),
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        visibility: form.visibility,
        hostName: user.fullName,
        franchises: validFranchises,
      }

      const created = await createTournamentRequest(payload)
      if (!created?.id) {
        throw new Error('Server returned an unexpected response')
      }
      navigate(`/tournaments/${created.id}`, { replace: true })
    } catch (err) {
      setServerError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="create-main">
      <header className="create-header">
        <Link to="/tournaments" className="create-back">
          <ArrowLeft size={14} />
          All tournaments
        </Link>
        <p className="create-eyebrow">
          <Sparkles size={12} />
          Auctioneer · New Tournament
        </p>
        <h1 className="create-title">Spin up a new auction</h1>
        <p className="create-subtitle">
          Define the basics, list your franchises, and you'll land in the
          lobby ready to start the first room.
        </p>
      </header>

      <motion.form
        className="create-form"
        onSubmit={handleSubmit}
        noValidate
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {serverError ? (
          <div className="create-server-error" role="alert">
            {serverError}
          </div>
        ) : null}

        <section className="create-card">
          <header className="create-card-head">
            <h2>Basics</h2>
            <p>How bidders will recognize your tournament.</p>
          </header>

          <div className="create-grid create-grid--two">
            <Field
              label="Tournament name"
              required
              error={errors.name}
              input={
                <input
                  type="text"
                  value={form.name}
                  onChange={updateField('name')}
                  placeholder="Bengaluru Premier League"
                  autoComplete="off"
                />
              }
            />

            <Field
              label="Short code"
              hint="2–8 letters/numbers. Shown on cards and rooms."
              required
              error={errors.shortCode}
              input={
                <div className="create-shortcode">
                  <input
                    type="text"
                    value={form.shortCode}
                    onChange={updateShortCode}
                    placeholder="BPL"
                    maxLength={8}
                    spellCheck={false}
                    className="create-shortcode-input"
                  />
                  <button
                    type="button"
                    className="create-shortcode-gen"
                    onClick={regenerateShortCode}
                    aria-label="Generate a random short code"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              }
            />
          </div>

          <Field
            label="Description"
            hint="Optional. A short line bidders will see on the lobby page."
            input={
              <textarea
                value={form.description}
                onChange={updateField('description')}
                placeholder="Six franchises, one gavel, one trophy."
                rows={3}
              />
            }
          />

          <div className="create-grid create-grid--two">
            <Field
              label="Region"
              hint="Optional. Helps viewers discover local auctions."
              input={
                <input
                  type="text"
                  value={form.region}
                  onChange={updateField('region')}
                  placeholder="Bengaluru, India"
                />
              }
            />

            <Field
              label="Visibility"
              input={
                <VisibilityToggle
                  value={form.visibility}
                  onChange={updateField('visibility')}
                />
              }
            />
          </div>
        </section>

        <section className="create-card">
          <header className="create-card-head">
            <h2>Schedule & purse</h2>
            <p>When the auction runs and how much each franchise can spend.</p>
          </header>

          <div className="create-grid create-grid--two">
            <Field
              label="Start date"
              error={errors.startDate}
              input={
                <input
                  type="date"
                  value={form.startDate}
                  onChange={updateField('startDate')}
                />
              }
            />
            <Field
              label="End date"
              error={errors.endDate}
              input={
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || undefined}
                  onChange={updateField('endDate')}
                />
              }
            />
          </div>

          <div className="create-grid create-grid--two">
            <Field
              label="Currency"
              input={
                <CurrencyPicker
                  value={form.currency}
                  onChange={updateField('currency')}
                />
              }
            />
            <Field
              label="Purse per franchise"
              required
              error={errors.pursePerFranchise}
              hint={
                pursePreview
                  ? `Shown as ${pursePreview} on cards`
                  : 'Default: 100,000,000'
              }
              input={
                <input
                  type="number"
                  min="1"
                  step="1000000"
                  value={form.pursePerFranchise}
                  onChange={updateField('pursePerFranchise')}
                  placeholder="100000000"
                />
              }
            />
          </div>
        </section>

        <section className="create-card">
          <header className="create-card-head">
            <h2>
              <Users size={16} />
              Franchises
              <span className="create-counter">
                {validFranchiseCount} ready
              </span>
            </h2>
            <p>Add the teams bidding in this tournament.</p>
          </header>

          {errors.franchises ? (
            <div className="create-field-error">{errors.franchises}</div>
          ) : null}

          <ul className="create-franchise-list">
            {form.franchises.map((f, idx) => (
              <FranchiseRow
                key={f.id}
                index={idx}
                franchise={f}
                canRemove={form.franchises.length > 2}
                onChange={(key, value) => updateFranchise(f.id, key, value)}
                onRemove={() => removeFranchise(f.id)}
              />
            ))}
          </ul>

          <div className="create-franchise-actions">
            <button
              type="button"
              className="create-add-row"
              onClick={addFranchise}
            >
              <Plus size={14} />
              Add another franchise
            </button>
          </div>
        </section>

        <footer className="create-footer">
          <div className="create-footer-summary">
            <CheckCircle2
              size={16}
              className={
                Object.keys(errors).length === 0
                  ? 'create-check is-ok'
                  : 'create-check'
              }
            />
            <span>
              {validFranchiseCount} {validFranchiseCount === 1 ? 'team' : 'teams'}{' '}
              · {form.startDate ? 'dates set' : 'no dates'} ·{' '}
              {form.visibility === 'invite-only' ? 'invite-only' : 'public'}
            </span>
          </div>

          <div className="create-footer-actions">
            <Link to="/tournaments" className="create-cancel">
              Cancel
            </Link>
            <motion.button
              type="submit"
              className="cta-btn create-submit"
              disabled={isSubmitting}
              whileHover={isSubmitting ? undefined : { y: -1 }}
              whileTap={isSubmitting ? undefined : { y: 0, scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <span className="cta-btn-shine" aria-hidden="true" />
              <span className="cta-btn-content">
                {isSubmitting ? (
                  'Setting up…'
                ) : (
                  <>
                    Create tournament
                    <ArrowRight size={16} />
                  </>
                )}
              </span>
            </motion.button>
          </div>
        </footer>
      </motion.form>
    </main>
  )
}

function Field({ label, hint, error, required, input }) {
  return (
    <label className={clsx('create-field', { 'has-error': error })}>
      <span className="create-field-label">
        {label}
        {required ? <span className="create-required">·</span> : null}
      </span>
      {input}
      {hint && !error ? <span className="create-field-hint">{hint}</span> : null}
      {error ? <span className="create-field-error">{error}</span> : null}
    </label>
  )
}

function VisibilityToggle({ value, onChange }) {
  return (
    <div className="create-toggle" role="radiogroup" aria-label="Visibility">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'public'}
        className={clsx('create-toggle-btn', {
          active: value === 'public',
        })}
        onClick={() => onChange({ target: { value: 'public' } })}
      >
        <Globe size={14} />
        Public
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'invite-only'}
        className={clsx('create-toggle-btn', {
          active: value === 'invite-only',
        })}
        onClick={() => onChange({ target: { value: 'invite-only' } })}
      >
        <EyeOff size={14} />
        Invite-only
      </button>
    </div>
  )
}

function CurrencyPicker({ value, onChange }) {
  return (
    <div className="create-currency">
      <Wallet size={14} className="create-currency-icon" />
      <select
        value={value}
        onChange={onChange}
        className="create-currency-select"
      >
        {CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    </div>
  )
}

function FranchiseRow({ index, franchise, canRemove, onChange, onRemove }) {
  return (
    <li className="create-franchise">
      <span className="create-franchise-index" aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>

      <div className="create-franchise-fields">
        <input
          type="text"
          value={franchise.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder={`Franchise ${index + 1}`}
          className="create-franchise-name"
        />
        <input
          type="text"
          value={franchise.city}
          onChange={(e) => onChange('city', e.target.value)}
          placeholder="City (optional)"
          className="create-franchise-city"
        />
      </div>

      <div className="create-franchise-color">
        <span
          className="create-franchise-swatch"
          style={{ backgroundColor: franchise.colorHex }}
          aria-hidden="true"
        />
        <input
          type="color"
          value={franchise.colorHex}
          onChange={(e) => onChange('colorHex', e.target.value)}
          aria-label={`Color for franchise ${index + 1}`}
        />
      </div>

      <button
        type="button"
        className="create-franchise-remove"
        onClick={onRemove}
        disabled={!canRemove}
        aria-label={`Remove franchise ${index + 1}`}
        title={canRemove ? 'Remove' : 'Need at least 2'}
      >
        <Trash2 size={14} />
      </button>
    </li>
  )
}

export default CreateTournamentPage