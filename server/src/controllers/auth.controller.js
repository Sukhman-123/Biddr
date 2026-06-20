const User = require('../models/User');
const Tournament = require('../models/Tournament');
const { ROLES } = require('../models/User');
const { signToken } = require('../middleware/auth');
const { verifyGoogleIdToken } = require('../services/googleAuth');

const sanitizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const buildPayload = (user, token) => ({
  user: user.toSafeJSON(),
  token,
});

const isValidRole = (role) => ROLES.includes(role);

const resolveTournamentMembership = async ({
  role,
  tournamentId,
  franchiseId,
}) => {
  if (role === 'auctioneer') return null;

  const mongoose = require('mongoose');
  if (!tournamentId || !mongoose.isValidObjectId(tournamentId)) {
    return { error: 'A tournament is required for owners and spectators' };
  }

  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) return { error: 'Tournament not found' };

  if (tournament.visibility === 'invite-only') {
    return { error: 'This tournament is invite-only' };
  }

  let franchise = null;
  if (role === 'owner') {
    if (!franchiseId || !mongoose.isValidObjectId(franchiseId)) {
      return { error: 'Pick a franchise to claim' };
    }
    franchise = tournament.franchises.id(franchiseId);
    if (!franchise) {
      return { error: 'That franchise is not part of this tournament' };
    }
    if (franchise.ownerUserId) {
      return { error: 'That franchise is already claimed' };
    }
  }

  return { tournament, franchise };
};

const register = async (req, res, next) => {
  try {
    const {
      fullName,
      franchise,
      email,
      password,
      role,
      tournamentId,
      franchiseId,
    } = req.body || {};

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: 'Full name, email, and password are required',
      });
    }

    if (!isValidRole(role)) {
      return res.status(400).json({
        message: 'Role must be auctioneer, owner, or spectator',
      });
    }

    const normalizedEmail = sanitizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        message: 'An account with that email already exists',
      });
    }

    let resolved = null;
    if (role !== 'auctioneer') {
      const result = await resolveTournamentMembership({
        role,
        tournamentId,
        franchiseId,
      });
      if (result.error) {
        return res.status(400).json({ message: result.error });
      }
      resolved = result;
    }

    const membership = resolved
      ? {
          tournamentId: resolved.tournament._id,
          franchiseId: resolved.franchise ? resolved.franchise._id : null,
          franchiseName: resolved.franchise ? resolved.franchise.name : '',
          role,
          status: 'active',
        }
      : null;

    const user = await User.create({
      fullName: fullName.trim(),
      franchise:
        typeof franchise === 'string' && franchise.trim()
          ? franchise.trim()
          : resolved?.franchise?.name ?? '',
      email: normalizedEmail,
      password,
      role,
      tournamentMemberships: membership ? [membership] : [],
    });

    if (resolved?.franchise) {
      resolved.franchise.ownerUserId = user._id;
      await resolved.tournament.save();
    }

    const token = signToken(user._id);
    return res.status(201).json(buildPayload(user, token));
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: sanitizeEmail(email) }).select(
      '+password',
    );
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const matches = await user.comparePassword(password);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    return res.status(200).json(buildPayload(user, token));
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const fresh = await User.findById(req.user._id);
    if (!fresh) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ user: fresh.toSafeJSON() });
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res) => {
  res.status(200).json({ message: 'Signed out' });
};

const loginWithGoogle = async (req, res, next) => {
  try {
    const { idToken, role } = req.body || {};

    if (!idToken) {
      return res.status(400).json({ message: 'Google idToken is required' });
    }

    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch (error) {
      return res
        .status(401)
        .json({ message: 'Google sign-in failed. Please try again.' });
    }

    const { sub, email, email_verified, name } = payload;
    const normalizedEmail = sanitizeEmail(email);

    let user = await User.findOne({ googleSub: sub });

    if (!user && normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
      if (user && !user.googleSub) {
        if (!email_verified) {
          return res.status(403).json({
            message:
              'This Google email is not verified. Please verify with Google before linking.',
          });
        }
        user.googleSub = sub;
        if (!user.fullName && name) user.fullName = name;
        await user.save();
      }
    }

    if (!user) {
      if (!email_verified) {
        return res.status(403).json({
          message:
            'Your Google email is not verified. Please verify with Google before signing in.',
        });
      }
      const desiredRole = isValidRole(role) ? role : 'owner';
      user = await User.create({
        fullName: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: desiredRole,
        googleSub: sub,
      });
    }

    const token = signToken(user._id);
    return res.status(200).json(buildPayload(user, token));
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, me, logout, loginWithGoogle };
