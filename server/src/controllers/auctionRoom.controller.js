// Strip non-persisted / auto-managed fields from a lot snapshot so it
// can be safely re-applied with Object.assign + save without tripping
// Mongoose's optimistic-concurrency (__v) check.
const cleanLotSnapshot = (obj) => {
  const { _id, __v, createdAt, updatedAt, ...rest } = obj
  return rest
}

const Lot = require('../models/Lot');
const Tournament = require('../models/Tournament');
const { assertCanSeeTournament, HttpError } = require('../middleware/canSeeTournament');
const { canAffordBid, getMinBid } = require('../utils/wallet');
const { push, pop, peek, clear, depth } = require('../services/undoService');

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

    const previousLot = cleanLotSnapshot(lot.toObject())
    // Snapshot franchise wallets before the sale so we can restore them on undo.
    const previousWallets = tournament.franchises.map((f) => ({
      id: f._id.toString(),
      wallet: { ...f.wallet },
      squad: { ...f.squad },
    }))

    lot.status = 'sold';
    lot.auctionStatus = 'hammered';
    lot.soldToFranchiseId = winnerFranchiseId;
    lot.soldPrice = lot.currentBid > 0 ? lot.currentBid : lot.basePrice;

    // Update the winning franchise's wallet.
    if (winnerFranchiseId) {
      const franchise = tournament.franchises.find(
        (f) => f._id.toString() === winnerFranchiseId,
      )
      if (franchise) {
        franchise.wallet.spent = (franchise.wallet.spent || 0) + lot.soldPrice
        if (!franchise.squad) {
          franchise.squad = { playerIds: [], maxSize: 11 }
        }
        if (!Array.isArray(franchise.squad.playerIds)) {
          franchise.squad.playerIds = []
        }
        franchise.squad.playerIds.push(lot._id)
      }
    }

    // Save both documents
    await lot.save()
    await tournament.save()

    push(tournament._id.toString(), {
      type: 'LOT_HAMMERED',
      lotId: lot._id.toString(),
      previousLot,
      previousWallets,
    });

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

// POST /api/lots/:lotId/place-bid
// Places a bid on behalf of a franchise.
//
// For REMOTE mode: any authenticated user in the tournament can bid.
// For PHYSICAL mode: only the host can call this (to enter bids manually).
//
// Validates:
//   - Lot is active (on the floor)
//   - Bid is at least basePrice on first bid, or currentBid + bidIncrement
//   - Franchise has sufficient wallet remaining
//   - Franchise has squad slot available
//
// On success: updates lot.currentBid, lot.currentBidderFranchiseId,
//             broadcasts 'bid:placed' to the room.
const placeBid = async (req, res, next) => {
  try {
    const { lotId } = req.params;
    const { franchiseId, amount } = req.body || {};

    if (!franchiseId || typeof amount !== 'number') {
      throw new HttpError(400, 'franchiseId and amount are required');
    }

    const lot = await Lot.findById(lotId);
    if (!lot) {
      throw new HttpError(404, 'Lot not found');
    }

    const tournament = await Tournament.findById(lot.tournamentId);
    if (!tournament) {
      throw new HttpError(404, 'Tournament not found');
    }

    // For physical mode, only the host can place bids (manual entry)
    if (tournament.auctionMode === 'physical' && !isHost(tournament, req.user)) {
      throw new HttpError(403, 'Only the auctioneer can enter bids in physical mode');
    }

    // For remote mode, any authenticated user can bid
    if (tournament.auctionMode === 'remote') {
      await assertCanSeeTournament(tournament._id.toString(), req.user);
    }

    if (lot.auctionStatus !== 'active') {
      throw new HttpError(400, `Lot is not active (auctionStatus: ${lot.auctionStatus})`);
    }

    if (amount < 0) {
      throw new HttpError(400, 'Bid amount cannot be negative');
    }

    // Validate minimum bid
    const minBid = getMinBid(lot, lot.basePrice, tournament.settings?.minBidIncrement);
    if (amount < minBid) {
      throw new HttpError(400, `Minimum bid is ${minBid.toLocaleString('en-IN')}`);
    }

    // Validate franchise exists
    const franchise = tournament.franchises.find(
      (f) => f._id.toString() === franchiseId,
    );
    if (!franchise) {
      throw new HttpError(400, 'Franchise not found in this tournament');
    }

    // Validate user is the franchise owner
    // In physical mode, the auctioneer (host) can place bids for any franchise
    // In remote mode, only the franchise owner can raise the paddle
    if (tournament.auctionMode !== 'physical' && !franchise.isOwner(req.user._id)) {
      throw new HttpError(403, 'Only the franchise owner can raise the paddle for this team');
    }

    // Check wallet and squad
    const check = canAffordBid(franchise, amount, tournament.settings?.minBidIncrement);
    if (!check.canBid) {
      throw new HttpError(400, check.reason);
    }

    // Optimistic-concurrency guard: reject if the lot has since been
    // outbid by another franchise (stale client state). This covers the
    // race where two owners bid simultaneously — the second request to
    // reach the server loses and gets a clear 409 to retry from.
    if (lot.currentBid > 0 && amount <= lot.currentBid) {
      throw new HttpError(
        409,
        `This lot has already received a higher bid of ${lot.currentBid.toLocaleString('en-IN')}. Please bid higher.`,
      );
    }

    // Place the bid
    const previousBid = cleanLotSnapshot(lot.toObject())
    lot.currentBid = amount;
    lot.currentBidderFranchiseId = franchiseId;
    lot.currentBidByUserId = req.user._id;
    lot.currentBidAt = new Date();
    // Persist bid history so reconnecting clients see the ladder
    if (!Array.isArray(lot.bidHistory)) lot.bidHistory = []
    lot.bidHistory.push({
      amount,
      franchiseId,
      franchiseName: franchise.name,
      userId: req.user._id,
      userFullName: req.user.fullName,
      at: lot.currentBidAt,
    })
    await lot.save();

    push(tournament._id.toString(), {
      type: 'BID_PLACED',
      lotId: lot._id.toString(),
      previousBid,
    });

    broadcast(req, tournament._id.toString(), 'bid:placed', {
      lot: lot.toJSON(),
      franchise: { id: franchise._id.toString(), name: franchise.name },
      amount,
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

// POST /api/lots/:lotId/pause
// Host-only. Pauses an active auction (timer stops, bids blocked).
// Does NOT change the lot status, only auctionStatus='paused'.
const pauseLot = async (req, res, next) => {
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
      throw new HttpError(403, 'Only the auctioneer can pause auctions');
    }

    if (lot.auctionStatus !== 'active') {
      throw new HttpError(
        400,
        `Lot is not active (current auctionStatus: ${lot.auctionStatus})`,
      );
    }

    lot.auctionStatus = 'paused';
    await lot.save();

    broadcast(req, tournament._id.toString(), 'auction:paused', {
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

// POST /api/lots/:lotId/resume
// Host-only. Resumes a paused auction (timer continues, bids allowed again).
const resumeLot = async (req, res, next) => {
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
      throw new HttpError(403, 'Only the auctioneer can resume auctions');
    }

    if (lot.auctionStatus !== 'paused') {
      throw new HttpError(
        400,
        `Lot is not paused (current auctionStatus: ${lot.auctionStatus})`,
      );
    }

    lot.auctionStatus = 'active';
    lot.currentBidAt = new Date(); // Reset timer
    await lot.save();

    broadcast(req, tournament._id.toString(), 'auction:resumed', {
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

    const previousLot = cleanLotSnapshot(lot.toObject())

    lot.status = 'unsold';
    lot.auctionStatus = 'unsold';
    await lot.save();

    push(tournament._id.toString(), {
      type: 'LOT_PASSED',
      lotId: lot._id.toString(),
      previousLot,
    });

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

    // The "current room lot" is whichever lot is still on the floor.
    // That includes both actively bidding lots and paused lots, so a
    // host refresh or reconnect can still resume a paused auction.
    const activeLot = await Lot.findOne({
      tournamentId: tournament._id,
      auctionStatus: { $in: ['active', 'paused'] },
    });

    return res.status(200).json({
      tournament: tournament.toDetailJSON(),
      activeLot: activeLot ? activeLot.toJSON() : null,
      recentBids: activeLot?.bidHistory ?? [],
      undoAvailable: depth(tournament._id.toString()) > 0,
      lastUndoLotId: peek(tournament._id.toString())?.lotId ?? null,
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

// POST /api/lots/:lotId/undo
// Host-only. Reverses the last action (bid placement, hammer, etc).
const undoLastAction = async (req, res, next) => {
  try {
    const { lotId } = req.params;
    const lot = await Lot.findById(lotId);
    if (!lot) throw new HttpError(404, 'Lot not found');
    const tournament = await Tournament.findById(lot.tournamentId);
    if (!tournament) throw new HttpError(404, 'Tournament not found');
    if (!isHost(tournament, req.user)) throw new HttpError(403, 'Only the auctioneer can undo actions');

    const action = pop(tournament._id.toString());
    if (!action) throw new HttpError(400, 'No actions to undo');

    let revertedLot = null;
    switch (action.type) {
      case 'BID_PLACED':
        Object.assign(lot, action.previousBid);
        await lot.save();
        revertedLot = lot;
        break;
      case 'LOT_PASSED':
        Object.assign(lot, action.previousLot);
        await lot.save();
        revertedLot = lot;
        break;
      case 'LOT_HAMMERED':
        Object.assign(lot, action.previousLot);
        await lot.save();
        action.previousWallets.forEach((ws) => {
          const f = tournament.franchises.find((fr) => fr._id.toString() === ws.id);
          if (f) { f.wallet = ws.wallet; f.squad = ws.squad; }
        });
        await tournament.save();
        revertedLot = lot;
        break;
      default:
        throw new HttpError(400, `Cannot undo: ${action.type}`);
    }

    const tournamentId = tournament._id.toString()

    broadcast(req, tournamentId, 'lot:undone', {
      action: { ...action, reverted: true },
      tournamentId,
      lot: revertedLot ? revertedLot.toJSON() : null,
      undoAvailable: depth(tournamentId) > 0,
      at: new Date().toISOString(),
    });

    return res.status(200).json({
      action: { ...action, reverted: true },
      lot: revertedLot ? revertedLot.toJSON() : null,
      undoAvailable: depth(tournamentId) > 0,
    });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

// POST /api/lots/:lotId/deactivate
// Host-only. Sends the lot back to idle/queued without marking
// it sold or unsold. Used by the "Skip / Re-queue" button.
const deactivateLot = async (req, res, next) => {
  try {
    const { lotId } = req.params;
    const lot = await Lot.findById(lotId);
    if (!lot) throw new HttpError(404, 'Lot not found');
    const tournament = await Tournament.findById(lot.tournamentId);
    if (!tournament) throw new HttpError(404, 'Tournament not found');
    if (!isHost(tournament, req.user)) throw new HttpError(403, 'Only the auctioneer can skip lots');

    if (lot.auctionStatus === 'idle') {
      throw new HttpError(400, 'Lot is already idle');
    }

    lot.auctionStatus = 'idle';
    lot.currentBid = 0;
    lot.currentBidderFranchiseId = null;
    lot.currentBidByUserId = null;
    lot.currentBidAt = null;
    lot.status = 'queued';
    await lot.save();

    // Skip/deactivate is non-revertible, so clear any queued undo state.
    clear(tournament._id.toString());

    broadcast(req, tournament._id.toString(), 'lot:deactivated', {
      lot: lot.toJSON(),
      by: { id: req.user._id.toString(), fullName: req.user.fullName },
      at: new Date().toISOString(),
    });

    return res.status(200).json({ lot: lot.toJSON() });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
    return next(error);
  }
};

module.exports = {
  activateLot,
  hammerLot,
  passLot,
  placeBid,
  pauseLot,
  resumeLot,
  undoLastAction,
  deactivateLot,
  getRoomSnapshot,
};
