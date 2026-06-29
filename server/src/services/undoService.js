// =============================================================
// UndoService — in-memory per-tournament undo stack.
//
// Actions are pushed before mutation. Undo reverses them in LIFO
// order. Only the tournament host can undo.
//
// Actions stored:
//   BID_PLACED     → snapshot of lot before bid
//   LOT_HAMMERED   → snapshot of lot + franchise wallets before sale
//
// This runs in-process. For a multi-instance deployment, replace
// with a MongoDB collection or Redis.
// =============================================================

const stacks = new Map() // tournamentId → Action[]

/**
 * Push an undoable action onto the stack.
 * @param {string} tournamentId
 * @param {Object} action - { type, lotSnapshot, previousBid?, previousBidder? }
 */
function push(tournamentId, action) {
  if (!stacks.has(tournamentId)) {
    stacks.set(tournamentId, [])
  }
  const stack = stacks.get(tournamentId)
  stack.push({ ...action, createdAt: new Date() })

  // Cap stack at 20 actions per tournament
  if (stack.length > 20) {
    stack.shift()
  }
}

/**
 * Pop and return the most recent action without reversing it.
 * Returns null if the stack is empty.
 * @param {string} tournamentId
 */
function peek(tournamentId) {
  const stack = stacks.get(tournamentId)
  if (!stack || stack.length === 0) return null
  return stack[stack.length - 1]
}

/**
 * Pop and reverse the most recent action.
 * Returns the reversed action metadata, or null if nothing to undo.
 * @param {string} tournamentId
 */
function pop(tournamentId) {
  const stack = stacks.get(tournamentId)
  if (!stack || stack.length === 0) return null
  return stack.pop()
}

/**
 * Clear the undo stack for a tournament (e.g., when tournament completes).
 * @param {string} tournamentId
 */
function clear(tournamentId) {
  stacks.delete(tournamentId)
}

/**
 * Get stack depth for a tournament.
 * @param {string} tournamentId
 */
function depth(tournamentId) {
  const stack = stacks.get(tournamentId)
  return stack ? stack.length : 0
}

module.exports = { push, peek, pop, clear, depth }