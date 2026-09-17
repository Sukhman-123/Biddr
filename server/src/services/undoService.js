// =============================================================
// UndoService — in-memory per-tournament undo stack.
//
// Actions are pushed after a mutation succeeds. Undo restores the
// latest action in LIFO order and only consumes it after persistence
// succeeds. Only the tournament host can undo.
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
 * Pop the most recent action only if it is still the action the caller
 * previously inspected. This prevents a concurrent action from being
 * removed while an undo is being persisted.
 * Returns the action, or null if the stack changed or is empty.
 * @param {string} tournamentId
 * @param {Object} expectedAction
 */
function pop(tournamentId, expectedAction) {
  const stack = stacks.get(tournamentId)
  if (!stack || stack.length === 0) return null
  if (expectedAction && stack[stack.length - 1] !== expectedAction) return null
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
