const Lot = require('../models/Lot');
const { assertCanSeeTournament, HttpError } = require('../middleware/canSeeTournament');
const { buildAuctionRecap } = require('../services/auctionRecap');

const getAuctionRecap = async (req, res, next) => {
  try {
    const tournament = await assertCanSeeTournament(req.params.id, req.user);
    if (tournament.status !== 'completed') {
      throw new HttpError(409, 'The auction recap is available after the auction ends');
    }

    const lots = await Lot.find({ tournamentId: tournament._id })
      .sort({ set: 1, name: 1 })
      .lean();

    return res.status(200).json({
      recap: buildAuctionRecap(tournament, lots, req.user),
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    if (error?.name === 'CastError') {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    return next(error);
  }
};

module.exports = { getAuctionRecap };
