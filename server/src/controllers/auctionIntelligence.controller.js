const Lot = require('../models/Lot');
const Tournament = require('../models/Tournament');
const { HttpError } = require('../middleware/canSeeTournament');
const { calculateAuctionIntelligence } = require('../services/auctionIntelligence');

const getAuctionIntelligence = async (req, res, next) => {
  try {
    const { lotId } = req.params;
    const { franchiseId } = req.query;
    if (!franchiseId) {
      throw new HttpError(400, 'franchiseId is required');
    }

    const lot = await Lot.findById(lotId);
    if (!lot) throw new HttpError(404, 'Lot not found');
    if (!['active', 'paused'].includes(lot.auctionStatus)) {
      throw new HttpError(409, 'Auction intelligence is available while a lot is on the floor');
    }

    const tournament = await Tournament.findById(lot.tournamentId);
    if (!tournament) throw new HttpError(404, 'Tournament not found');
    const franchise = tournament.franchises.id(franchiseId);
    if (!franchise) throw new HttpError(404, 'Franchise not found in this tournament');

    const isHost = tournament.ownerId.toString() === req.user._id.toString();
    const isFranchiseOwner = franchise.isOwner(req.user._id);
    if (!isHost && (!isFranchiseOwner || tournament.auctionMode === 'physical')) {
      throw new HttpError(403, 'Auction intelligence is private to the host and franchise owner');
    }

    const lots = await Lot.find({ tournamentId: tournament._id }).lean();
    const intelligence = calculateAuctionIntelligence({
      tournament,
      lot: lot.toObject(),
      lots,
      franchise,
    });

    return res.status(200).json({ intelligence });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error?.name === 'CastError') {
      return res.status(404).json({ message: 'Auction data not found' });
    }
    return next(error);
  }
};

module.exports = { getAuctionIntelligence };
