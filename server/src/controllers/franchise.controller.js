const Tournament = require('../models/Tournament');
const User = require('../models/User');
const { HttpError } = require('../middleware/canSeeTournament');

/**
 * Add a member to a franchise.
 * POST /api/tournaments/:tournamentId/franchises/:franchiseId/members
 */
const addMember = async (req, res, next) => {
  try {
    const { tournamentId, franchiseId } = req.params;
    const { userId, role = 'member' } = req.body;

    if (!userId) {
      throw new HttpError(400, 'userId is required');
    }

    if (!['owner', 'member'].includes(role)) {
      throw new HttpError(400, 'Role must be "owner" or "member"');
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new HttpError(404, 'Tournament not found');
    }

    // Only tournament host can add franchise owners
    if (role === 'owner' && tournament.ownerId.toString() !== req.user._id.toString()) {
      throw new HttpError(403, 'Only the tournament host can assign franchise owners');
    }

    const franchise = tournament.franchises.find(
      (f) => f._id.toString() === franchiseId,
    );
    if (!franchise) {
      throw new HttpError(404, 'Franchise not found');
    }

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }

    // Check if already a member
    const existingMember = franchise.members?.find(
      (m) => m.userId.toString() === userId,
    );
    if (existingMember) {
      throw new HttpError(400, 'User is already a member of this franchise');
    }

    // If setting as owner, remove existing owner first
    if (role === 'owner') {
      franchise.members = (franchise.members || []).filter(
        (m) => m.role !== 'owner',
      );
    }

    // Add the member
    if (!franchise.members) {
      franchise.members = [];
    }
    franchise.members.push({
      userId,
      role,
      addedAt: new Date(),
    });

    await tournament.save();

    return res.status(201).json({
      message: `${user.fullName} added as ${role} of ${franchise.name}`,
      franchise: {
        id: franchise._id.toString(),
        name: franchise.name,
        members: franchise.members.map((m) => ({
          userId: m.userId.toString(),
          role: m.role,
          addedAt: m.addedAt,
        })),
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

/**
 * Remove a member from a franchise.
 * DELETE /api/tournaments/:tournamentId/franchises/:franchiseId/members/:userId
 */
const removeMember = async (req, res, next) => {
  try {
    const { tournamentId, franchiseId, userId } = req.params;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new HttpError(404, 'Tournament not found');
    }

    const franchise = tournament.franchises.find(
      (f) => f._id.toString() === franchiseId,
    );
    if (!franchise) {
      throw new HttpError(404, 'Franchise not found');
    }

    const memberIndex = (franchise.members || []).findIndex(
      (m) => m.userId.toString() === userId,
    );
    if (memberIndex === -1) {
      throw new HttpError(404, 'User is not a member of this franchise');
    }

    const member = franchise.members[memberIndex];

    // Only tournament host or the member themselves can remove
    const isTournamentHost = tournament.ownerId.toString() === req.user._id.toString();
    const isRemovingSelf = member.userId.toString() === req.user._id.toString();

    if (!isTournamentHost && !isRemovingSelf) {
      throw new HttpError(403, 'Only the tournament host or the member can remove them');
    }

    // Cannot remove the last owner
    if (member.role === 'owner') {
      const ownerCount = (franchise.members || []).filter(
        (m) => m.role === 'owner',
      ).length;
      if (ownerCount <= 1) {
        throw new HttpError(400, 'Cannot remove the last owner of a franchise');
      }
    }

    franchise.members.splice(memberIndex, 1);
    await tournament.save();

    return res.status(200).json({
      message: 'Member removed successfully',
      franchise: {
        id: franchise._id.toString(),
        name: franchise.name,
        members: franchise.members.map((m) => ({
          userId: m.userId.toString(),
          role: m.role,
          addedAt: m.addedAt,
        })),
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

/**
 * Update a member's role in a franchise.
 * PUT /api/tournaments/:tournamentId/franchises/:franchiseId/members/:userId
 */
const updateMemberRole = async (req, res, next) => {
  try {
    const { tournamentId, franchiseId, userId } = req.params;
    const { role } = req.body;

    if (!role || !['owner', 'member'].includes(role)) {
      throw new HttpError(400, 'Role must be "owner" or "member"');
    }

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new HttpError(404, 'Tournament not found');
    }

    // Only tournament host can change roles
    if (tournament.ownerId.toString() !== req.user._id.toString()) {
      throw new HttpError(403, 'Only the tournament host can change member roles');
    }

    const franchise = tournament.franchises.find(
      (f) => f._id.toString() === franchiseId,
    );
    if (!franchise) {
      throw new HttpError(404, 'Franchise not found');
    }

    const member = (franchise.members || []).find(
      (m) => m.userId.toString() === userId,
    );
    if (!member) {
      throw new HttpError(404, 'User is not a member of this franchise');
    }

    // If promoting to owner, demote existing owners first
    if (role === 'owner' && member.role !== 'owner') {
      (franchise.members || []).forEach((m) => {
        if (m.role === 'owner') {
          m.role = 'member';
        }
      });
    }

    member.role = role;
    await tournament.save();

    return res.status(200).json({
      message: `Member role updated to ${role}`,
      franchise: {
        id: franchise._id.toString(),
        name: franchise.name,
        members: franchise.members.map((m) => ({
          userId: m.userId.toString(),
          role: m.role,
          addedAt: m.addedAt,
        })),
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

/**
 * Get franchise members.
 * GET /api/tournaments/:tournamentId/franchises/:franchiseId/members
 */
const getMembers = async (req, res, next) => {
  try {
    const { tournamentId, franchiseId } = req.params;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      throw new HttpError(404, 'Tournament not found');
    }

    const franchise = tournament.franchises.find(
      (f) => f._id.toString() === franchiseId,
    );
    if (!franchise) {
      throw new HttpError(404, 'Franchise not found');
    }

    // Populate user details
    const memberIds = (franchise.members || []).map((m) => m.userId);
    const users = await User.find({ _id: { $in: memberIds } }).select(
      'fullName email',
    );
    const userMap = {};
    users.forEach((u) => {
      userMap[u._id.toString()] = u;
    });

    const membersWithDetails = (franchise.members || []).map((m) => {
      const user = userMap[m.userId.toString()];
      return {
        userId: m.userId.toString(),
        fullName: user?.fullName || 'Unknown',
        email: user?.email || '',
        role: m.role,
        addedAt: m.addedAt,
      };
    });

    return res.status(200).json({ members: membersWithDetails });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ message: error.message });
    }
    return next(error);
  }
};

module.exports = {
  addMember,
  removeMember,
  updateMemberRole,
  getMembers,
};
