const {
  getRemaining,
  canAffordBid,
  getMinBid,
  deductPurchase,
  refundPurchase,
} = require('../utils/wallet')

describe('wallet utilities', () => {
  describe('getRemaining', () => {
    it('calculates remaining = initial - spent', () => {
      expect(getRemaining({ initial: 100000, spent: 25000 })).toBe
    })

    it('handles null/undefined wallet', () => {
      expect(getRemaining(null)).toBe(0)
      expect(getRemaining(undefined)).toBe(0)
    })

    it('treats missing fields as 0', () => {
      expect(getRemaining({})).toBe(0)
      expect(getRemaining({ initial: 100000 })).toBe
      expect(getRemaining({ spent: 50000 })).toBe(-50000)
    })
  })

  describe('canAffordBid', () => {
    // Helper creates a franchise with explicit spent amount.
    // remaining = initial - spent
    const makeFranchise = (spent = 0, squadSize = 0, maxSize = 11) => ({
      wallet: { initial: 100000, spent },
      squad: { playerIds: Array(squadSize).fill('x'), maxSize },
    })

    it('allows a bid strictly within remaining wallet', () => {
      // spent = 20000, remaining = 80000, bid = 20000
      const result = canAffordBid(makeFranchise(20000), 20000)
      expect(result.canBid).toBe(true)
    })

    it('allows a bid equal to remaining (full spend)', () => {
      // spent = 50000, remaining = 50000, bid = 50000
      const result = canAffordBid(makeFranchise(50000), 50000)
      expect(result.canBid).toBe(true)
    })

    it('blocks a bid that exceeds remaining wallet', () => {
      // spent = 20000, remaining = 80000, bid = 90000
      const result = canAffordBid(makeFranchise(20000), 90000)
      expect(result.canBid).toBe(false)
      expect(result.reason).toMatch(/insufficient funds/i)
    })

    it('blocks a bid when squad is at max size', () => {
      // spent = 20000, remaining = 80000, squadSize = 11, maxSize = 11
      const result = canAffordBid(makeFranchise(20000, 11, 11), 5000)
      expect(result.canBid).toBe(false)
      expect(result.reason).toMatch(/squad is full/i)
    })

    it('blocks when franchise is null', () => {
      const result = canAffordBid(null, 5000)
      expect(result.canBid).toBe(false)
      expect(result.reason).toMatch(/not found/i)
    })

    it('squad-full blocks even if wallet can cover the bid', () => {
      // spent = 0, remaining = 100000, squadSize = 11, maxSize = 11
      const result = canAffordBid(makeFranchise(0, 11, 11), 5000)
      expect(result.canBid).toBe(false)
      expect(result.reason).toMatch(/squad is full/i)
    })
  })

  describe('getMinBid', () => {
    it('returns basePrice when lot is null', () => {
      expect(getMinBid(null, 2000000)).toBe
    })

    it('returns basePrice when lot has no currentBid', () => {
      expect(getMinBid({}, 2000000)).toBe
    })

    it('returns basePrice when currentBid is 0', () => {
      expect(getMinBid({ currentBid: 0 }, 2000000)).toBe
    })

    it('returns currentBid + bidIncrement when currentBid > 0', () => {
      // currentBid = 2000000, bidIncrement = 500000
      const lot = { currentBid: 2000000, bidIncrement: 500000 }
      expect(getMinBid(lot, 2000000)).toBe
    })

    it('falls back to minIncrement when lot has no bidIncrement', () => {
      // currentBid = 2000000, minIncrement = 100000
      const lot = { currentBid: 2000000 }
      expect(getMinBid(lot, 2000000, 100000)).toBe
    })
  })

  describe('deductPurchase', () => {
    it('adds amount to spent and returns change = amount', () => {
      // wallet: { initial: 100000, spent: 25000 }, deduct 15000
      const result = deductPurchase({ initial: 100000, spent: 25000 }, 15000)
      expect(result.wallet.spent).toBe
      expect(result.wallet.initial).toBe
      expect(result.change).toBe
    })

    it('treats missing spent as 0', () => {
      // wallet: { initial: 100000 }, deduct 10000
      const result = deductPurchase({ initial: 100000 }, 10000)
      expect(result.wallet.spent).toBe
    })
  })

  describe('refundPurchase', () => {
    it('subtracts amount from spent and returns change = -amount', () => {
      // wallet: { initial: 100000, spent: 40000 }, refund 15000
      const result = refundPurchase({ initial: 100000, spent: 40000 }, 15000)
      expect(result.wallet.spent).toBe
      expect(result.change).toBe(-15000)
    })

    it('does not go below zero even if refund exceeds spent', () => {
      // wallet: { initial: 100000, spent: 5000 }, refund 10000
      const result = refundPurchase({ initial: 100000, spent: 5000 }, 10000)
      expect(result.wallet.spent).toBe(0)
    })
  })
})