const Tournament = require('../models/Tournament');
const Invitation = require('../models/Invitation');
const User = require('../models/User');
const Lot = require('../models/Lot');
const { clear: clearUndoStack } = require('../services/undoService');

const VALID_STATUSES = ['upcoming', 'live', 'completed'];

const isOwner = (tournament, user) =>
  user && tournament.ownerId.toString() === user._id.toString();

const listTournaments = async (req, res, next) => {
  try {
    const filter = {};
    const userId = req.user?._id;

    if (req.query.status && VALID_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    if (req.query.visibility && req.query.visibility !== 'all') {
      filter.visibility = req.query.visibility;
    } else if (userId) {
      // Public + tournaments the user owns + tournaments the user was invited to.
      const invites = await Invitation.find({ email: req.user.email }).select(
        'tournamentId',
      );
      const invitedIds = invites.map((i) => i.tournamentId);
      filter.$or = [
        { visibility: 'public' },
        { visibility: 'invite-only', ownerId: userId },
        ...(invitedIds.length > 0
          ? [{ visibility: 'invite-only', _id: { $in: invitedIds } }]
          : []),
      ];
    } else {
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

    if (tournament.visibility === 'invite-only' && !isOwner(tournament, req.user)) {
      const invite = await Invitation.findOne({
        tournamentId: tournament._id,
        email: req.user.email,
      });
      if (!invite) {
        return res
          .status(403)
          .json({ message: 'This tournament is invite-only' });
      }
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
      cover,
      currency,
      pursePerFranchise,
      startDate,
      endDate,
      visibility,
      region,
      hostName,
      franchises,
      auctionMode,
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
      cover: cover && typeof cover === 'object'
        ? {
            gradientFrom: cover.gradientFrom || '#1d2436',
            gradientVia: cover.gradientVia || '#3a2a52',
            gradientTo: cover.gradientTo || '#0a0d16',
            accentHex: cover.accentHex || '#f5b94a',
          }
        : undefined,
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
      auctionMode: auctionMode === 'physical' ? 'physical' : 'remote',
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
              wallet: {
                initial: pursePerFranchise > 0 ? pursePerFranchise : 0,
                spent: 0,
              },
              squad: {
                playerIds: [],
                maxSize: typeof f.maxSquadSize === 'number' ? Math.min(f.maxSquadSize, 30) : 11,
              },
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

const updateTournament = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    if (tournament.ownerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: 'Only the host can edit this tournament' });
    }

    const allowed = [
      'name',
      'description',
      'region',
      'coverImage',
      'currency',
      'pursePerFranchise',
    ];
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        tournament[field] = req.body[field];
      }
    }

    if (req.body.visibility !== undefined) {
      tournament.visibility =
        req.body.visibility === 'invite-only' ? 'invite-only' : 'public';
    }

    if (req.body.auctionMode !== undefined) {
      tournament.auctionMode =
        req.body.auctionMode === 'physical' ? 'physical' : 'remote';
    }

    if (req.body.cover && typeof req.body.cover === 'object') {
      const cover = req.body.cover;
      if (cover.gradientFrom !== undefined)
        tournament.cover.gradientFrom = cover.gradientFrom;
      if (cover.gradientVia !== undefined)
        tournament.cover.gradientVia = cover.gradientVia;
      if (cover.gradientTo !== undefined)
        tournament.cover.gradientTo = cover.gradientTo;
      if (cover.accentHex !== undefined)
        tournament.cover.accentHex = cover.accentHex;
    }

    if (req.body.startDate !== undefined) {
      tournament.startDate = req.body.startDate
        ? new Date(req.body.startDate)
        : null;
    }
    if (req.body.endDate !== undefined) {
      tournament.endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    }

    // Settings object: partial update — only set keys that are provided
    if (req.body.settings && typeof req.body.settings === 'object') {
      const s = req.body.settings;
      if (typeof s.minBidIncrement === 'number') {
        tournament.settings.minBidIncrement = s.minBidIncrement;
      }
      if (typeof s.autoExtendSeconds === 'number') {
        tournament.settings.autoExtendSeconds = s.autoExtendSeconds;
      }
      if (typeof s.maxSquadSize === 'number') {
        tournament.settings.maxSquadSize = s.maxSquadSize;
      }
      if (typeof s.allowReAuction === 'boolean') {
        tournament.settings.allowReAuction = s.allowReAuction;
      }
    }

    if (Array.isArray(req.body.franchises)) {
      const existingById = new Map(
        (tournament.franchises || []).map((franchise) => [
          franchise._id.toString(),
          franchise,
        ]),
      )
      const incomingExistingIds = new Set(
        req.body.franchises
          .map((franchise) => franchise?.id || franchise?._id)
          .filter((idValue) => idValue && existingById.has(String(idValue)))
          .map((idValue) => String(idValue)),
      )
      const removedFranchiseIds = [...existingById.keys()].filter(
        (franchiseId) => !incomingExistingIds.has(franchiseId),
      )

      if (removedFranchiseIds.length > 0) {
        const assignedLot = await Lot.findOne({
          tournamentId: tournament._id,
          status: 'sold',
          soldToFranchiseId: { $in: removedFranchiseIds },
        }).lean()
        if (assignedLot) {
          return res.status(400).json({
            message: 'Move or unassign sold players before removing this team',
          });
        }
      }

      tournament.franchises = req.body.franchises
        .filter((franchise) => franchise && typeof franchise.name === 'string' && franchise.name.trim())
        .map((franchise) => {
          const existing =
            existingById.get(franchise.id) ||
            existingById.get(franchise._id) ||
            null

          const initialWallet = Number(
            franchise.wallet?.initial ?? existing?.wallet?.initial ?? tournament.pursePerFranchise ?? 0,
          )
          const spentWallet = Number(
            franchise.wallet?.spent ?? existing?.wallet?.spent ?? 0,
          )
          const maxSize = Number(
            franchise.squad?.maxSize ?? franchise.maxSquadSize ?? existing?.squad?.maxSize ?? 11,
          )

          return {
            _id: existing?._id,
            name: franchise.name.trim(),
            city: typeof franchise.city === 'string' ? franchise.city.trim() : '',
            colorHex:
              typeof franchise.colorHex === 'string' && franchise.colorHex.startsWith('#')
                ? franchise.colorHex
                : existing?.colorHex || '#f5b94a',
            wallet: {
              initial: Number.isFinite(initialWallet) && initialWallet >= 0
                ? Math.round(initialWallet)
                : existing?.wallet?.initial ?? 0,
              spent: Number.isFinite(spentWallet) && spentWallet >= 0
                ? Math.round(spentWallet)
                : existing?.wallet?.spent ?? 0,
            },
            squad: {
              playerIds: Array.isArray(franchise.squad?.playerIds)
                ? franchise.squad.playerIds
                : existing?.squad?.playerIds ?? [],
              maxSize: Number.isFinite(maxSize) && maxSize > 0
                ? Math.min(Math.round(maxSize), 30)
                : existing?.squad?.maxSize ?? 11,
            },
            members: Array.isArray(franchise.members)
              ? franchise.members
                  .filter((member) => member?.userId)
                  .map((member) => ({
                    userId: member.userId,
                    role: member.role === 'owner' ? 'owner' : 'member',
                    addedAt: member.addedAt ? new Date(member.addedAt) : new Date(),
                  }))
              : existing?.members ?? [],
          };
        });
    }

    if (
      tournament.startDate &&
      tournament.endDate &&
      tournament.endDate < tournament.startDate
    ) {
      return res
        .status(400)
        .json({ message: 'End date must be after the start date' });
    }

    await tournament.save();
    return res
      .status(200)
      .json({ tournament: tournament.toDetailJSON() });
  } catch (error) {
    if (error?.name === 'CastError') {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    if (error?.code === 11000) {
      return res
        .status(409)
        .json({ message: 'That short code is taken. Try another.' });
    }
    return next(error);
  }
};

// =============================================================
// startAuction — flip an upcoming tournament to "live".
//
// Host-only. The start date must have arrived (we don't allow
// starting early). Idempotent: if the tournament is already live
// the call returns the tournament unchanged with 200.
//
// Why a dedicated endpoint rather than PATCH /tournaments/:id?
//   1. Makes the transition explicit and easy to reason about.
//   2. Lets us enforce the start-date gate here without polluting
//      the generic PATCH (which validates edits to name/region/etc).
//   3. Matches the "auctioneer starts the auction" mental model —
//      one click → one transition.
// =============================================================
const startAuction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    if (tournament.ownerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: 'Only the host can start the auction' });
    }

    // Idempotent: if it's already live, just return it.
    if (tournament.status === 'live') {
      return res.status(200).json({ tournament: tournament.toDetailJSON() });
    }
    if (tournament.status === 'completed') {
      return res
        .status(400)
        .json({ message: 'A completed auction cannot be restarted' });
    }

    // Enforce the start date gate. The host must wait until the
    // configured startDate. If startDate is missing we accept that
    // as "host didn't set a date — let them go whenever"; but we
    // surface a warning in that case.
    if (tournament.startDate && new Date() < new Date(tournament.startDate)) {
      return res.status(400).json({
        message: 'The auction start date has not arrived yet',
        startDate: tournament.startDate,
      });
    }

    tournament.status = 'live';
    await tournament.save();

    return res.status(200).json({ tournament: tournament.toDetailJSON() });
  } catch (error) {
    if (error?.name === 'CastError') {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    return next(error);
  }
};

// =============================================================
// endAuction — flip a live tournament to "completed".
//
// Host-only. Idempotent: if already completed, returns 200 with
// the current state. Cannot be called on an upcoming tournament
// (use startAuction first).
// =============================================================
const endAuction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    if (tournament.ownerId.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: 'Only the host can end the auction' });
    }

    // Idempotent: if it's already completed, just return it.
    if (tournament.status === 'completed') {
      return res.status(200).json({ tournament: tournament.toDetailJSON() });
    }
    if (tournament.status === 'upcoming') {
      return res
        .status(400)
        .json({ message: 'Start the auction before ending it' });
    }

    const lotStillOnFloor = await Lot.findOne({
      tournamentId: tournament._id,
      auctionStatus: { $in: ['active', 'paused'] },
    }).select('_id');
    if (lotStillOnFloor) {
      return res.status(400).json({
        message: 'Resolve the current lot before ending the auction',
      });
    }

    tournament.status = 'completed';
    await tournament.save();
    clearUndoStack(tournament._id.toString());

    return res.status(200).json({ tournament: tournament.toDetailJSON() });
  } catch (error) {
    if (error?.name === 'CastError') {
      return res.status(404).json({ message: 'Tournament not found' });
    }
    return next(error);
  }
};

const ensureHost = async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) {
    res.status(404).json({ message: 'Tournament not found' });
    return null;
  }
  if (!isOwner(tournament, req.user)) {
    res.status(403).json({ message: 'Only the host can manage invites' });
    return null;
  }
  return tournament;
};

const listInvites = async (req, res, next) => {
  try {
    const tournament = await ensureHost(req, res);
    if (!tournament) return;
    const invites = await Invitation.find({ tournamentId: tournament._id }).sort({
      createdAt: -1,
    });
    return res.json({
      invites: invites.map((i) => i.toJSON ? i.toJSON() : i),
    });
  } catch (error) {
    return next(error);
  }
};

const sanitizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const createInvite = async (req, res, next) => {
  try {
    const tournament = await ensureHost(req, res);
    if (!tournament) return;

    if (tournament.visibility !== 'invite-only') {
      return res
        .status(400)
        .json({ message: 'Invites are only for invite-only tournaments' });
    }

    const email = sanitizeEmail(req.body?.email);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    // Block self-invites
    const owner = await User.findById(tournament.ownerId);
    if (owner && owner.email === email) {
      return res
        .status(400)
        .json({ message: "You can't invite the host" });
    }

    const existing = await Invitation.findOne({
      tournamentId: tournament._id,
      email,
    });
    if (existing) {
      return res
        .status(200)
        .json({ invite: existing, alreadyInvited: true });
    }

    const invite = await Invitation.create({
      tournamentId: tournament._id,
      email,
      invitedById: tournament.ownerId,
    });
    return res.status(201).json({ invite });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(200).json({ message: 'Already invited' });
    }
    return next(error);
  }
};

const revokeInvite = async (req, res, next) => {
  try {
    const tournament = await ensureHost(req, res);
    if (!tournament) return;
    const { inviteId } = req.params;
    const deleted = await Invitation.findOneAndDelete({
      _id: inviteId,
      tournamentId: tournament._id,
    });
    if (!deleted) {
      return res.status(404).json({ message: 'Invite not found' });
    }
    return res.status(200).json({ revoked: true });
  } catch (error) {
    if (error?.name === 'CastError') {
      return res.status(404).json({ message: 'Invite not found' });
    }
    return next(error);
  }
};

module.exports = {
  listTournaments,
  getTournament,
  createTournament,
  updateTournament,
  startAuction,
  endAuction,
  listInvites,
  createInvite,
  revokeInvite,
};
