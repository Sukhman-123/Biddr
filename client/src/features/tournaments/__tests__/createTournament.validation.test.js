import { describe, it, expect } from 'vitest'
import {
  validateCreateTournament,
  buildInitialFranchiseState,
} from '../createTournament.validation'

const validFranchise = (name) => ({ id: 'x', name, city: '', colorHex: '#fff' })

describe('validateCreateTournament', () => {
  const makeValidForm = (overrides = {}) => ({
    name: 'Bengaluru Premier League',
    shortCode: 'BPL',
    startDate: '',
    endDate: '',
    pursePerFranchise: '100000000',
    visibility: 'public',
    franchises: [validFranchise('A'), validFranchise('B')],
    ...overrides,
  })

  it('accepts a fully valid form', () => {
    const errors = validateCreateTournament(makeValidForm())
    expect(errors).toEqual({})
  })

  it('rejects empty name', () => {
    const errors = validateCreateTournament(makeValidForm({ name: '  ' }))
    expect(errors.name).toBeDefined()
  })

  it('rejects name shorter than 3 chars', () => {
    const errors = validateCreateTournament(makeValidForm({ name: 'AB' }))
    expect(errors.name).toMatch(/3 characters/)
  })

  it('rejects name longer than 120 chars', () => {
    const errors = validateCreateTournament(
      makeValidForm({ name: 'A'.repeat(121) }),
    )
    expect(errors.name).toMatch(/120 characters/)
  })

  it('rejects empty short code', () => {
    const errors = validateCreateTournament(makeValidForm({ shortCode: '' }))
    expect(errors.shortCode).toBeDefined()
  })

  it('rejects short code shorter than 2 chars', () => {
    const errors = validateCreateTournament(makeValidForm({ shortCode: 'A' }))
    expect(errors.shortCode).toMatch(/2 characters/)
  })

  it('rejects endDate before startDate', () => {
    const errors = validateCreateTournament(
      makeValidForm({ startDate: '2026-06-20', endDate: '2026-06-10' }),
    )
    expect(errors.endDate).toMatch(/after the start date/)
  })

  it('rejects non-positive purse', () => {
    expect(
      validateCreateTournament(makeValidForm({ pursePerFranchise: '0' })),
    ).toHaveProperty('pursePerFranchise')
    expect(
      validateCreateTournament(makeValidForm({ pursePerFranchise: '-5' })),
    ).toHaveProperty('pursePerFranchise')
    expect(
      validateCreateTournament(makeValidForm({ pursePerFranchise: 'abc' })),
    ).toHaveProperty('pursePerFranchise')
  })

  it('rejects fewer than 2 named franchises', () => {
    const errors = validateCreateTournament(
      makeValidForm({ franchises: [validFranchise('A')] }),
    )
    expect(errors.franchises).toMatch(/at least two/)
  })

  it('rejects duplicate franchise names (case-insensitive)', () => {
    const errors = validateCreateTournament(
      makeValidForm({
        franchises: [validFranchise('Blasters'), validFranchise('blasters')],
      }),
    )
    expect(errors.franchises).toMatch(/unique/)
  })

  it('ignores empty franchise rows in uniqueness check', () => {
    const errors = validateCreateTournament(
      makeValidForm({
        franchises: [
          validFranchise('A'),
          validFranchise('B'),
          { id: 'x', name: '', city: '', colorHex: '#fff' },
        ],
      }),
    )
    expect(errors.franchises).toBeUndefined()
  })
})

describe('buildInitialFranchiseState', () => {
  it('builds the requested number of rows', () => {
    const rows = buildInitialFranchiseState(8)
    expect(rows).toHaveLength(8)
  })

  it('every row has a unique id', () => {
    const rows = buildInitialFranchiseState(20)
    const ids = new Set(rows.map((r) => r.id))
    expect(ids.size).toBe(20)
  })

  it('every row starts with an empty name', () => {
    const rows = buildInitialFranchiseState(5)
    for (const row of rows) {
      expect(row.name).toBe('')
      expect(row.city).toBe('')
    }
  })
})
