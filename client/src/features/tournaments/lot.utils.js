export const LOT_STYLES = [
  'Batsman',
  'Bowler',
  'All-rounder',
  'Wicket-keeper',
]

export const LOT_STATUSES = ['queued', 'sold', 'unsold']

const STYLE_TONES = {
  'Batsman': { bg: 'rgba(59, 130, 246, 0.16)', fg: '#bfdbfe' },
  'Bowler': { bg: 'rgba(239, 68, 68, 0.16)', fg: '#fecaca' },
  'All-rounder': { bg: 'rgba(168, 85, 247, 0.18)', fg: '#e9d5ff' },
  'Wicket-keeper': { bg: 'rgba(245, 185, 74, 0.18)', fg: '#fde6a8' },
}

const STATUS_TONES = {
  queued: { bg: 'rgba(148, 163, 184, 0.18)', fg: '#cbd5e1' },
  sold: { bg: 'rgba(34, 197, 94, 0.18)', fg: '#bbf7d0' },
  unsold: { bg: 'rgba(244, 114, 182, 0.16)', fg: '#fbcfe8' },
}

export function styleTone(style) {
  return STYLE_TONES[style] || { bg: 'rgba(148, 163, 184, 0.16)', fg: '#cbd5e1' }
}

export function statusTone(status) {
  return (
    STATUS_TONES[status] || { bg: 'rgba(148, 163, 184, 0.16)', fg: '#cbd5e1' }
  )
}

const PHOTO_RE = /^https?:\/\//i

export function validateLotInput(input) {
  const name = (input.name || '').trim()
  if (!name) return { ok: false, field: 'name', message: 'Name is required' }
  if (name.length > 120)
    return { ok: false, field: 'name', message: 'Name is too long' }

  const style = (input.style || '').trim()
  if (!LOT_STYLES.includes(style)) {
    return {
      ok: false,
      field: 'style',
      message: `Style must be one of: ${LOT_STYLES.join(', ')}`,
    }
  }

  const country = (input.country || '').trim()
  if (!country)
    return { ok: false, field: 'country', message: 'Country is required' }
  if (country.length > 80)
    return { ok: false, field: 'country', message: 'Country is too long' }

  const rawPrice = String(input.basePrice ?? '').trim()
  if (rawPrice === '')
    return {
      ok: false,
      field: 'basePrice',
      message: 'Base price is required',
    }
  const n = Number(rawPrice)
  if (!Number.isFinite(n) || n < 0)
    return {
      ok: false,
      field: 'basePrice',
      message: 'Base price must be a non-negative number',
    }

  const photoUrl = (input.photoUrl || '').trim()
  if (photoUrl && !PHOTO_RE.test(photoUrl)) {
    return {
      ok: false,
      field: 'photoUrl',
      message: 'Photo URL must start with http:// or https://',
    }
  }
  if (photoUrl.length > 600)
    return {
      ok: false,
      field: 'photoUrl',
      message: 'Photo URL is too long',
    }

  const set = (input.set || '').trim() || 'Squad'

  return {
    ok: true,
    data: {
      name,
      style,
      country,
      basePrice: Math.floor(n),
      photoUrl,
      set,
    },
  }
}

export function emptyLotDraft() {
  return {
    name: '',
    style: 'Batsman',
    country: 'Home',
    basePrice: '',
    photoUrl: '',
    set: 'Squad',
  }
}

export function groupLotsBySet(lots) {
  const out = []
  const seen = new Map()
  for (const lot of lots) {
    const key = lot.set || 'Squad'
    if (!seen.has(key)) {
      seen.set(key, { set: key, lots: [] })
      out.push(seen.get(key))
    }
    seen.get(key).lots.push(lot)
  }
  return out
}

export function statusBreakdown(lots) {
  const counts = { queued: 0, sold: 0, unsold: 0 }
  for (const lot of lots) {
    if (counts[lot.status] !== undefined) counts[lot.status] += 1
  }
  return counts
}

export function initialsFor(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?'
}
