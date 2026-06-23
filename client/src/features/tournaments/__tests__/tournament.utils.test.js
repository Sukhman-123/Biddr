import { describe, it, expect } from 'vitest'
import { formatPurse, formatDateRange } from '../tournament.utils'

describe('tournament.utils', () => {
  describe('formatPurse', () => {
    it('formats INR with default options', () => {
      const formatted = formatPurse(100000000, 'INR')
      expect(formatted).toContain('₹100,000,000')
    })

    it('handles zero and NaN gracefully', () => {
      expect(formatPurse(0, 'INR')).toBe('₹0')
      expect(formatPurse(NaN, 'USD')).toBe('—')
    })

    it('compacts large numbers when asked', () => {
      const formatted = formatPurse(2500000000, 'INR', { compact: true })
      expect(formatted).toMatch(/₹\s*2\.5[BM]/) // ~2.5B in INR
    })

    it('handles different currency codes', () => {
      expect(formatPurse(5000000, 'USD')).toContain('5,000,000')
      expect(formatPurse(3000000, 'GBP')).toContain('3,000,000')
    })
  })

  describe('formatDateRange', () => {

    it('handles missing dates gracefully', () => {
      expect(formatDateRange(null, null)).toBe('Dates TBA')
      expect(formatDateRange('2026-01-15', null)).toMatch(/Jan/)
    })

    it('formats a single-day range as day span', () => {
      const range = formatDateRange('2026-01-15', '2026-01-15')
      expect(range).toBe('15–15 Jan 2026')
    })

    it('formats same-month ranges as day span', () => {
      const range = formatDateRange('2026-01-10', '2026-01-20')
      expect(range).toBe('10–20 Jan 2026')
    })

    it('formats cross-month ranges fully', () => {
      const range = formatDateRange('2026-01-15', '2026-02-20')
      expect(range).toMatch(/Jan.*15.*Feb.*20/)
    })
  })
})
