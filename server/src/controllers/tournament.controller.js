const Tournament = require('../models/Tournament');

const VALID_STATUSES = ['upcoming', 'live', 'completed'];

const listTournaments = async (req, res, next) => {
  try {
    const filter = {};
    const userId = req.user?._id;

    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (req.query.visibility && req.query.visibility !== 'all') {
      filter.visibility = req.query.visibility;
    } else {
      // Show public tournaments plus any private tournament the user owns.
      filter.$or = [
        { visibility: 'public' },
        ...(userId ? [{ visibility: 'invite-only', ownerId: userId }] : []),
      ];
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

const DEFAULT_SHORT_CODE_LEN = 4
const SHORT_CODE_MAX_ATTEMPTS = 6

const generateShortCode = (len = DEFAULT_SHORT_CODE_LEN) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let out = ''
  for (let i = 0; i < len; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

const ensureUniqueShortCode = async (base) => {
  const upper = base.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
  if (!upper) return null

  for (let i = 0; i < SHORT_CODE_MAX_ATTEMPTS; i += 1) {
    const candidate = i === 0 ? upper : `${upper}${generateShortCode(2)}`
    const taken = await Tournament.findOne({ shortCode: candidate }).lean()
    if (!taken) return candidate
  }
  return null
}

const createTournament = async (req, res, next) => {
  try {
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
      region,
      hostName,
      franchises,
    } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return res
        .status(400)
        .json({ message: 'Tournament name must be at least 3 characters' });
    }
    if (!shortCode || typeof shortCode !== 'string') {
      return res
        .status(400)
        .json({ message: 'A tournament short code is required' });
    }

    const normalizedCode = await ensureUniqueShortCode(shortCode)
    if (!normalizedCode) {
      return res
        .status(409)
        .json({ message: 'That short code is taken. Try another.' });
    }

    let parsedStart = null
    let parsedEnd = null
    if (startDate) {
      parsedStart = new Date(startDate)
      if (Number.isNaN(parsedStart.valueOf())) {
        return res.status(400).json({ message: 'startDate is invalid' })
      }
    }
    if (endDate) {
      parsedEnd = new Date(endDate)
      if (Number.isNaN(parsedEnd.valueOf())) {
        return res.status(400).json({ message: 'endDate is invalid' })
      }
    }
    if (parsedStart && parsedEnd && parsedStart > parsedEnd) {
      return res
        .status(400)
        .json({ message: 'endDate must be after startDate' })
    }

    const purseNumber =
      typeof pursePerFranchise === 'number'
        ? pursePerFranchise
        : Number(pursePerFranchise)

    const tournament = await Tournament.create({
      name: name.trim(),
      shortCode: normalizedCode,
      description: typeof description === 'string' ? description.trim() : '',
      coverImage: typeof coverImage === 'string' ? coverImage.trim() : '',
      currency:
        typeof currency === 'string' && currency.trim()
          ? currency.trim().toUpperCase()
          : 'INR',
      pursePerFranchise:
        Number.isFinite(purseNumber) && purseNumber > 0
          ? Math.round(purseNumber)
          : 100000000,
      startDate: parsedStart,
      endDate: parsedEnd,
      status: 'upcoming',
      visibility: visibility === 'invite-only' ? 'invite-only' : 'public',
      hostName:
        typeof hostName === 'string' && hostName.trim()
          ? hostName.trim()
          : req.user.fullName || '',
      region: typeof region === 'string' ? region.trim() : '',
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
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: 'That short code is taken. Try another.' });
    }
    return next(error);
  }
};

module.exports = { listTournaments, getTournament, createTournament };
