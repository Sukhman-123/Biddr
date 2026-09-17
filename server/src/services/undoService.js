// MongoDB-backed per-tournament undo history. Pending actions form the
// active LIFO stack; undone and cleared records remain as an audit trail.

const UndoAction = require('../models/UndoAction');

const MAX_PENDING_ACTIONS = 20;

const normalizeIdentity = (identity, fallbackName = '') => ({
  userId: identity?._id || identity?.userId || identity?.id,
  fullName: identity?.fullName || fallbackName,
});

const toAction = (document) => {
  if (!document) return null;
  const value = document.toObject ? document.toObject() : document;
  return {
    id: value._id.toString(),
    type: value.type,
    lotId: value.lotId.toString(),
    ...value.payload,
    host: value.host,
    performedBy: value.performedBy,
    createdAt: value.createdAt,
  };
};

const pendingQuery = (tournamentId) => ({ tournamentId, status: 'pending' });
const latestFirst = { createdAt: -1, _id: -1 };

async function push(tournamentId, action, { host, actor }) {
  const { type, lotId, ...payload } = action;
  const created = await UndoAction.create({
    tournamentId,
    lotId,
    type,
    payload,
    host: normalizeIdentity(host, 'Tournament host'),
    performedBy: normalizeIdentity(actor),
  });

  // Preserve the previous stack limit while retaining overflow records for
  // auditing instead of deleting them.
  const overflow = await UndoAction.find(pendingQuery(tournamentId))
    .sort(latestFirst)
    .skip(MAX_PENDING_ACTIONS)
    .select('_id')
    .lean();
  if (overflow.length > 0) {
    await UndoAction.updateMany(
      { _id: { $in: overflow.map((item) => item._id) }, status: 'pending' },
      { $set: { status: 'cleared', clearedAt: new Date() } },
    );
  }

  return toAction(created);
}

async function peek(tournamentId) {
  const action = await UndoAction.findOne(pendingQuery(tournamentId)).sort(latestFirst);
  return toAction(action);
}

async function pop(tournamentId, expectedAction, undoneBy) {
  if (!expectedAction?.id) return null;

  const latest = await UndoAction.findOne(pendingQuery(tournamentId))
    .sort(latestFirst)
    .select('_id')
    .lean();
  if (!latest || latest._id.toString() !== expectedAction.id) return null;

  const action = await UndoAction.findOneAndUpdate(
    {
      _id: expectedAction.id,
      tournamentId,
      status: 'pending',
    },
    {
      $set: {
        status: 'undone',
        undoneBy: normalizeIdentity(undoneBy),
        undoneAt: new Date(),
      },
    },
    { new: true },
  );
  return toAction(action);
}

async function clear(tournamentId) {
  const result = await UndoAction.updateMany(
    pendingQuery(tournamentId),
    { $set: { status: 'cleared', clearedAt: new Date() } },
  );
  return result.modifiedCount;
}

async function depth(tournamentId) {
  return UndoAction.countDocuments(pendingQuery(tournamentId));
}

module.exports = { push, peek, pop, clear, depth };
