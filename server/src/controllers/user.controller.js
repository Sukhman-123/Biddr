const mongoose = require('mongoose');
const Tournament = require('../models/Tournament');
const User = require('../models/User');

const ACHIEVEMENT_DEFS = [
  {
    id: 'first_tournament',
    label: 'First Tournament',
    description: 'Created your first auction',
    icon: 'trophy',
  },
  {
    id: 'public_host',
    label: 'Public Host',
    description: 'Hosted a public tournament',
    icon: 'globe',
  },
  {
    id: 'invite_only_host',
    label: 'Private Cup',
    description: 'Hosted an invite-only tournament',
    icon: 'lock',
  },
  {
    id: 'multi_currency',
    label: 'World Series',
    description: 'Tournaments across multiple currencies',
    icon: 'coins',
  },
  {
    id: 'long_run',
    label: 'Long Run',
    description: 'Tournament spanning a month or more',
    icon: 'calendar',
  },
  {
    id: 'multi_franchise',
    label: 'Six-Team Showdown',
    description: 'Hosted a tournament with 6+ franchises',
    icon: 'teams',
  },
  {
    id: 'veteran',
    label: 'Veteran',
    description: 'Created 3 or more tournaments',
    icon: 'medal',
  },
  {
    id: 'newcomer',
    label: 'Fresh on the Floor',
    description: 'Joined in the last 7 days',
    icon: 'sparkles',
  },
];

const computeAchievements = (user, ownedTournaments) => {
  const earned = new Set();
  if (ownedTournaments.length >= 1) earned.add('first_tournament');
  if (ownedTournaments.some((t) => t.visibility === 'public')) earned.add('public_host');
  if (ownedTournaments.some((t) => t.visibility === 'invite-only')) earned.add('invite_only_host');
  const currencies = new Set(ownedTournaments.map((t) => t.currency));
  if (currencies.size >= 2) earned.add('multi_currency');
  if (
    ownedTournaments.some(
      (t) => t.startDate && t.endDate && t.endDate - t.startDate >= 30 * 24 * 60 * 60 * 1000,
    )
  ) {
    earned.add('long_run');
  }
  if (ownedTournaments.some((t) => Array.isArray(t.franchises) && t.franchises.length >= 6)) {
    earned.add('multi_franchise');
  }
  if (ownedTournaments.length >= 3) earned.add('veteran');
  if (
    user.createdAt &&
    Date.now() - new Date(user.createdAt).valueOf() <= 7 * 24 * 60 * 60 * 1000
  ) {
    earned.add('newcomer');
  }
  return ACHIEVEMENT_DEFS.map((def) => ({ ...def, earned: earned.has(def.id) }));
};

const buildActivity = (ownedTournaments) => {
  const events = ownedTournaments
    .map((t) => ({
      id: t._id.toString(),
      kind: 'tournament_created',
      title: `Created ${t.name}`,
      subtitle: `${t.shortCode} · ${t.visibility === 'invite-only' ? 'Invite-only' : 'Public'}`,
      at: t.createdAt,
    }))
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8);
  return events;
};

const getUserStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const ownedTournaments = await Tournament.find({ ownerId: userId }).sort({
      createdAt: -1,
    });

    const counts = {
      hosted: ownedTournaments.length,
      live: ownedTournaments.filter((t) => t.status === 'live').length,
      upcoming: ownedTournaments.filter((t) => t.status === 'upcoming').length,
      completed: ownedTournaments.filter((t) => t.status === 'completed').length,
      inviteOnly: ownedTournaments.filter((t) => t.visibility === 'invite-only').length,
    };

    const totalFranchises = ownedTournaments.reduce(
      (sum, t) => sum + (Array.isArray(t.franchises) ? t.franchises.length : 0),
      0,
    );

    const totalPurse = ownedTournaments.reduce(
      (sum, t) =>
        sum + (Array.isArray(t.franchises) ? t.franchises.length * t.pursePerFranchise : 0),
      0,
    );

    const daysActive = Math.max(
      1,
      Math.floor(
        (Date.now() - new Date(user.createdAt).valueOf()) / (24 * 60 * 60 * 1000),
      ) + 1,
    );

    return res.json({
      stats: {
        ...counts,
        totalFranchises,
        totalPurse,
        daysActive,
      },
      achievements: computeAchievements(user, ownedTournaments),
      activity: buildActivity(ownedTournaments),
      hostedTournaments: ownedTournaments.slice(0, 6).map((t) => t.toSummaryJSON()),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getUserStats };
