import { describe, it, expect } from 'vitest'
import {
  LOT_STYLES,
  LOT_STATUSES,
  styleTone,
  statusTone,
  validateLotInput,
  emptyLotDraft,
  groupLotsBySet,
  statusBreakdown,
  initialsFor,
} from '../lot.utils'

describe('styleTone / statusTone', () => {
  it('returns a tone for every known style', () => {
    for (const style of LOT_STYLES) {
      expect(styleTone(style).bg).toBeTruthy()
      expect(styleTone(style).fg).toBeTruthy()
    }
  })

  it('falls back gracefully for unknown styles', () => {
    expect(styleTone(undefined).bg).toBeTruthy()
    expect(styleTone('Goalkeeper').bg).toBeTruthy()
  })

  it('returns a tone for every known status', () => {
    for (const status of LOT_STATUSES) {
      expect(statusTone(status).bg).toBeTruthy()
    }
  })
})

describe('validateLotInput', () => {
  it('accepts a complete valid input', () => {
    const r = validateLotInput({
      name: 'Virat Kohli',
      style: 'Batsman',
      country: 'India',
      basePrice: 2000000,
      photoUrl: 'https://x.com/v.jpg',
      set: 'Marquee',
    })
    expect(r.ok).toBe(true)
    expect(r.data.name).toBe('Virat Kohli')
    expect(r.data.basePrice).toBe(2000000)
    expect(r.data.set).toBe('Marquee')
  })

  it('rejects empty name', () => {
    const r = validateLotInput({
      name: '   ',
      style: 'Batsman',
      country: 'India',
      basePrice: 1,
    })
    expect(r.ok).toBe(false)
    expect(r.field).toBe('name')
  })

  it('rejects invalid style', () => {
    const r = validateLotInput({
      name: 'X',
      style: 'Wicket-keeeper',
      country: 'India',
      basePrice: 1,
    })
    expect(r.ok).toBe(false)
    expect(r.field).toBe('style')
  })

  it('rejects empty country', () => {
    const r = validateLotInput({
      name: 'X',
      style: 'Batsman',
      country: '',
      basePrice: 1,
    })
    expect(r.ok).toBe(false)
    expect(r.field).toBe('country')
  })

  it('rejects missing basePrice', () => {
    const r = validateLotInput({
      name: 'X',
      style: 'Batsman',
      country: 'India',
      basePrice: '',
    })
    expect(r.ok).toBe(false)
    expect(r.field).toBe('basePrice')
  })

  it('rejects negative basePrice', () => {
    const r = validateLotInput({
      name: 'X',
      style: 'Batsman',
      country: 'India',
      basePrice: '-100',
    })
    expect(r.ok).toBe(false)
    expect(r.field).toBe('basePrice')
  })

  it('rejects photoUrl without scheme', () => {
    const r = validateLotInput({
      name: 'X',
      style: 'Batsman',
      country: 'India',
      basePrice: 1,
      photoUrl: 'x.com/y.jpg',
    })
    expect(r.ok).toBe(false)
    expect(r.field).toBe('photoUrl')
  })

  it('defaults set to "Squad" if blank', () => {
    const r = validateLotInput({
      name: 'X',
      style: 'Batsman',
      country: 'India',
      basePrice: 1,
      set: '   ',
    })
    expect(r.ok).toBe(true)
    expect(r.data.set).toBe('Squad')
  })

  it('trims whitespace from name and country', () => {
    const r = validateLotInput({
      name: '  Virat  ',
      style: 'Batsman',
      country: '  India  ',
      basePrice: 1,
    })
    expect(r.ok).toBe(true)
    expect(r.data.name).toBe('Virat')
    expect(r.data.country).toBe('India')
  })

  it('floors fractional basePrice', () => {
    const r = validateLotInput({
      name: 'X',
      style: 'Batsman',
      country: 'India',
      basePrice: '1500.99',
    })
    expect(r.ok).toBe(true)
    expect(r.data.basePrice).toBe(1500)
  })
})

describe('emptyLotDraft', () => {
  it('seeds a sane draft', () => {
    const d = emptyLotDraft()
    expect(d.name).toBe('')
    expect(d.style).toBe('Batsman')
    expect(d.country).toBe('Home')
    expect(d.set).toBe('Squad')
  })
})

describe('groupLotsBySet', () => {
  it('groups lots by their set label, preserving insertion order', () => {
    const lots = [
      { id: '1', set: 'Marquee', name: 'A' },
      { id: '2', set: 'Squad', name: 'B' },
      { id: '3', set: 'Marquee', name: 'C' },
    ]
    const groups = groupLotsBySet(lots)
    expect(groups).toHaveLength(2)
    expect(groups[0].set).toBe('Marquee')
    expect(groups[0].lots).toHaveLength(2)
    expect(groups[1].set).toBe('Squad')
  })
})

describe('statusBreakdown', () => {
  it('counts statuses', () => {
    const lots = [
      { status: 'queued' },
      { status: 'queued' },
      { status: 'sold' },
      { status: 'unsold' },
      { status: 'unknown' },
    ]
    expect(statusBreakdown(lots)).toEqual({
      queued: 2,
      sold: 1,
      unsold: 1,
    })
  })
})

describe('initialsFor', () => {
  it('returns first letters of the first two words', () => {
    expect(initialsFor('Virat Kohli')).toBe('VK')
    expect(initialsFor('  virat   kohli ')).toBe('VK')
  })

  it('handles one-word names', () => {
    expect(initialsFor('Sachin')).toBe('S')
  })

  it('handles empty input', () => {
    expect(initialsFor('')).toBe('?')
  })
})