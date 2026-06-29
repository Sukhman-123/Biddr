// =============================================================
// Wallet utilities for franchise budget management.
//
// All wallet mutations flow through these functions so the
// business rules are centralized and easy to test.
// =============================================================

/**
 * Calculate remaining wallet balance for a franchise.
 * @param {Object} wallet - { initial, spent }
 * @returns {number} remaining balance
 */
function getRemaining(wallet) {
  return (wallet?.initial ?? 0) - (wallet?.spent ?? 0)
}

/**
 * Check if a franchise can afford a bid.
 * @param {Object} franchise - Franchise document or plain object
 * @param {number} bidAmount - The proposed bid amount
 * @param {number} minIncrement - Minimum bid increment (from tournament settings)
 * @returns {{ canBid: boolean, reason?: string }}
 */
function canAffordBid(franchise, bidAmount, minIncrement = 0) {
  if (!franchise) {
    return { canBid: false, reason: 'Franchise not found' }
  }

  const remaining = getRemaining(franchise.wallet)
  const squadSize = franchise.squad?.playerIds?.length ?? 0
  const maxSquadSize = franchise.squad?.maxSize ?? 11

  // Check budget
  if (bidAmount > remaining) {
    return {
      canBid: false,
      reason: `Insufficient funds. ${formatPurse(remaining)} remaining but bid is ${formatPurse(bidAmount)}.`,
    }
  }

  // Check squad limit
  if (squadSize >= maxSquadSize) {
    return {
      canBid: false,
      reason: `Squad is full (${squadSize}/${maxSquadSize}). No more players can be added.`,
    }
  }

  // Check if bid meets minimum increment requirement
  // Only enforce when minIncrement is explicitly set and positive
  if (minIncrement && minIncrement > 0 && bidAmount < minIncrement) {
    return {
      canBid: false,
      reason: `Bid must be at least ${formatPurse(minIncrement)}.`,
    }
  }

  return { canBid: true }
}

/**
 * Get minimum valid bid for a lot.
 * @param {Object} lot - Current lot with currentBid and bidIncrement
 * @param {number} basePrice - Lot base price
 * @param {number} minIncrement - Tournament minimum increment
 * @returns {number} Minimum valid bid amount
 */
function getMinBid(lot, basePrice, minIncrement = 0) {
  if (!lot) return basePrice

  const currentBid = lot.currentBid ?? 0
  if (currentBid === 0) return basePrice

  const inc = lot.bidIncrement ?? minIncrement ?? 1000
  return currentBid + inc
}

/**
 * Calculate new wallet state after a purchase.
 * @param {Object} wallet - { initial, spent }
 * @param {number} amount - Purchase amount
 * @returns {{ wallet: Object, change: number }} Updated wallet snapshot
 */
function deductPurchase(wallet, amount) {
  const currentSpent = wallet?.spent ?? 0
  return {
    wallet: {
      initial: wallet?.initial ?? 0,
      spent: currentSpent + amount,
    },
    change: amount,
  }
}

/**
 * Refund a purchase (e.g., on undo or re-auction).
 * @param {Object} wallet - { initial, spent }
 * @param {number} amount - Refund amount
 * @returns {{ wallet: Object, change: number }} Updated wallet snapshot
 */
function refundPurchase(wallet, amount) {
  const currentSpent = wallet?.spent ?? 0
  return {
    wallet: {
      initial: wallet?.initial ?? 0,
      spent: Math.max(0, currentSpent - amount),
    },
    change: -amount,
  }
}

/**
 * Format a number as a currency string (INR).
 * @param {number} amount
 * @returns {string}
 */
function formatPurse(amount) {
  if (amount == null || isNaN(amount)) return '₹0'
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

module.exports = {
  getRemaining,
  canAffordBid,
  getMinBid,
  deductPurchase,
  refundPurchase,
  formatPurse,
}