const Lot = require('../models/Lot');
const Tournament = require('../models/Tournament');
const { assertCanSeeTournament, HttpError } = require('../middleware/canSeeTournament');

// =============================================================
// Auction-room controller.
//
// All write endpoints enforce TOTAL HOST CONTROL: the only caller
// that can mutate room state is the tournament owner. The server
// never auto-advances lots, never picks a winner, never decides
// when to close. See /Users/onehash/.claude/plans/spicy-greeting-hickey.md
// for the full invariant list.
//
// Broadcasts to the room use the shared `io` instance attached on
// `app` in server/src/index.js (and the shim):
//   req.app.get('io').to('tournament:<id>').emit('lot:activated', {...})
// =============================================================

const isHost = (tournament, user) =>
  user && tournament.ownerId.toString() === user._id.toString();

const broadcast = (req, tournamentId, event, payload) => {
  const io = req.app?.get?.('io');
  if (io) {
    io.to(`tournament:${tournamentId}`).emit(event, payload);
  }
};

// POST /api/tournaments/:id/lots/:lotId/activate
// Host-only. Sets the lot to `auctionStatus='active'` and broadcasts
// `lot:activated` to the room.
//
// Validation: lot must belong to the tournament and must be in
// `idle` (i.e. not already on the floor, not already hammered).
// `bidIncrement` is required to be set by the host before a lot
// can go on the floor — the server refuses to silently invent a
// value (total-host-control invariant #6).
const activateLot = async (req, res, next) => {
  try {
    const { id: tournamentId, lotId } = req.params;
    const tournament = await assertCanSeeTournament(tournamentId, req.user);
    if (!isHost(tournament, req.user)) {
      throw new HttpError(403, 'Only the auctioneer can activate lots');
    }

    const lot = await Lot.findOne({ _id: lotId, tournamentId: tournament._id });
    if (!lot) {
      throw new HttpError(404, 'Lot not found in this tournament');
    }
    if (lot.auctionStatus !== 'idle') {
      throw new HttpError(
        400,
        `Lot is not idle (current auctionStatus: ${lot.auctionStatus})`,
      );
    }
    if (lot.bidIncrement == null) {
      throw new HttpError(
        400,
        'Auctioneer must set bidIncrement on this lot before activating it',
      );
    }

    lot.auctionStatus = 'active';
    lot.currentBid = lot.basePrice;
    lot.currentBidAt = new Date();
    await lot.save();

    broadcast(req, tournament._id.toString(), 'lot:activated', {
      lot: lot.toJSON(),
      by: { id: req.user._id.toString(), fullName: req.user.fullName },
      at: new Date().toISOString(),
    });

    return res.status(200).json({ lot: lot.toJSON() });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

// POST /api/lots/:lotId/hammer
// Host-only. Sets status='sold' and auctionStatus='hammered'.
// Accepts optional `franchiseId` in the body — the auctioneer
// declares the winner. If absent, uses lot.currentBidderFranchiseId
// (the last high bidder from the live session, once v2 lands).
// If the auctioneer hammers without any current bidder, the lot
// moves to `status='sold'` with `soldToFranchiseId=null` — a
// "sold unallocated" state they can resolve off-platform.
const hammerLot = async (req, res, next) => {
  try {
    const { lotId } = req.params;
    const { franchiseId } = req.body || {};

    const lot = await Lot.findById(lotId);
    if (!lot) {
      throw new HttpError(404, 'Lot not found');
    }
    const tournament = await Tournament.findById(lot.tournamentId);
    if (!tournament) {
      throw new HttpError(404, 'Tournament not found');
    }
    if (!isHost(tournament, req.user)) {
      throw new HttpError(403, 'Only the auctioneer can hammer lots');
    }
    if (lot.auctionStatus !== 'active') {
      throw new HttpError(
        400,
        `Lot is not active (current auctionStatus: ${lot.auctionStatus})`,
      );
    }

    // Validate franchiseId if provided — it must exist on the tournament.
    let winnerFranchiseId = null;
    if (franchiseId) {
      const franchise = tournament.franchises.find(
        (f) => f._id.toString() === franchiseId,
      );
      if (!franchise) {
        throw new HttpError(400, 'franchiseId does not match any franchise on this tournament');
      }
      winnerFranchiseId = franchiseId;
    } else if (lot.currentBidderFranchiseId) {
      // Default to the last high bidder (v2 will set this from paddle raises).
      winnerFranchiseId = lot.currentBidderFranchiseId;
    }

    lot.status = 'sold';
    lot.auctionStatus = 'hammered';
    lot.soldToFranchiseId = winnerFranchiseId;
    lot.soldPrice = lot.currentBid > 0 ? lot.currentBid : lot.basePrice;
    await lot.save();

    broadcast(req, tournament._id.toString(), 'lot:hammered', {
      lot: lot.toJSON(),
      by: { id: req.user._id.toString(), fullName: req.user.fullName },
      at: new Date().toISOString(),
    });

    return res.status(200).json({ lot: lot.toJSON() });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

// POST /api/lots/:lotId/pass
// Host-only. Sets status='unsold' and auctionStatus='unsold'.
// Works on a lot in ANY auctionStatus (queued, idle, active) — the
// auctioneer can pass a queued lot directly without bringing it to
// the floor (e.g. decided not to sell the player at all).
const passLot = async (req, res, next) => {
  try {
    const { lotId } = req.params;

    const lot = await Lot.findById(lotId);
    if (!lot) {
      throw new HttpError(404, 'Lot not found');
    }
    const tournament = await Tournament.findById(lot.tournamentId);
    if (!tournament) {
      throw new HttpError(404, 'Tournament not found');
    }
    if (!isHost(tournament, req.user)) {
      throw new HttpError(403, 'Only the auctioneer can pass lots');
    }
    if (lot.auctionStatus === 'unsold' || lot.status === 'unsold') {
      throw new HttpError(400, 'Lot is already passed');
    }

    lot.status = 'unsold';
    lot.auctionStatus = 'unsold';
    await lot.save();

    broadcast(req, tournament._id.toString(), 'lot:passed', {
      lot: lot.toJSON(),
      by: { id: req.user._id.toString(), fullName: req.user.fullName },
      at: new Date().toISOString(),
    });

    return res.status(200).json({ lot: lot.toJSON() });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

// GET /api/tournaments/:id/room
// Viewer+ (any user that can see the tournament). Returns the room
// snapshot: { tournament, activeLot, recentBids }. v1 always
// returns an empty `recentBids` array; v2 will populate it from
// the Bid collection.
const getRoomSnapshot = async (req, res, next) => {
  try {
    const { id: tournamentId } = req.params;
    const tournament = await assertCanSeeTournament(tournamentId, req.user);

    // The "active lot" is the one in `auctionStatus='active'`. In v1
    // the host activates at most one lot at a time; the index on
    // (tournamentId, auctionStatus) makes this a fast lookup.
    const activeLot = await Lot.findOne({
      tournamentId: tournament._id,
      auctionStatus: 'active',
    });

    return res.status(200).json({
      tournament: tournament.toDetailJSON(),
      activeLot: activeLot ? activeLot.toJSON() : null,
      recentBids: [],
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

module.exports = {
  activateLot,
  hammerLot,
  passLot,
  getRoomSnapshot,
};