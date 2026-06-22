const Tournament = require('../models/Tournament');

const VALID_STATUSES = ['upcoming', 'live', 'completed'];

const listTournaments = async (req, res, next) => {
  try {
    const filter = {};
    const role = req.user?.role;
    const isAuctioneer = role === 'auctioneer';

    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (req.query.visibility && req.query.visibility !== 'all') {
      filter.visibility = req.query.visibility;
    } else if (!isAuctioneer) {
      filter.visibility = 'public';
    }

    const tournaments = await Tournament.find(filter)
      .sort({ status: 1, startDate: 1, createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      tournaments: tournaments.map((t) => t.toSummaryJSON()),
    });
  } catch (error) {
    return next(error);
  }
};

const getTournament = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }

    if (
      tournament.visibility === 'invite-only' &&
      req.user?.role !== 'auctioneer' &&
      tournament.ownerId.toString() !== req.user?._id?.toString()
    ) {
      return res
        .status(403)
        .json({ message: 'This tournament is invite-only' });
    }

    return res.status(200).json({ tournament: tournament.toDetailJSON() });
  } catch (error) {
    if (error?.name === 'CastError') {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    return next(error);
  }
};

const createTournament = async (req, res, next) => {
  try {
    if (req.user.role !== 'auctioneer') {
      return res
        .status(403)
        .json({ message: 'Only auctioneers can create tournaments' });
    }

    const {
      name,
      shortCode,
      description,
      coverImage,
      currency,
      pursePerFranchise,
      startDate,
      endDate,
      visibility,
      franchises,
    } = req.body || {};

    if (!name || !shortCode) {
      return res
        .status(400)
        .json({ message: 'Name and shortCode are required' });
    }

    const tournament = await Tournament.create({
      name: name.trim(),
      shortCode: shortCode.trim().toUpperCase(),
      description: typeof description === 'string' ? description.trim() : '',
      coverImage: typeof coverImage === 'string' ? coverImage.trim() : '',
      currency: typeof currency === 'string' ? currency.toUpperCase() : 'INR',
      pursePerFranchise:
        typeof pursePerFranchise === 'number' ? pursePerFranchise : 100000000,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: 'upcoming',
      visibility: visibility === 'invite-only' ? 'invite-only' : 'public',
      ownerId: req.user._id,
      franchises: Array.isArray(franchises)
        ? franchises
            .filter((f) => f && typeof f.name === 'string' && f.name.trim())
            .map((f) => ({
              name: f.name.trim(),
              city: typeof f.city === 'string' ? f.city.trim() : '',
              colorHex:
                typeof f.colorHex === 'string' && f.colorHex.startsWith('#')
                  ? f.colorHex
                  : '#f5b94a',
            }))
        : [],
    });

    return res.status(201).json({ tournament: tournament.toDetailJSON() });
  } catch (error) {
    return next(error);
  }
};

module.exports = { listTournaments, getTournament, createTournament };
