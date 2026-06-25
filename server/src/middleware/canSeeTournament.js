const Tournament = require('../models/Tournament');
const Invitation = require('../models/Invitation');

// =============================================================
// Shared tournament-access check used by REST routes and socket
// room:join handlers. Returns the tournament if the user is
// allowed to see it, throws an HttpError otherwise.
//
// Access rules:
//   - Host (ownerId === user._id): always allowed.
//   - Public tournament: any authenticated user allowed.
//   - Invite-only tournament: only the host + users with an
//     accepted Invitation for that tournament.
//
// The function name is `assertCanSeeTournament` because it both
// checks AND throws — there's no silent false return path that
// callers might forget to check.
// =============================================================

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const assertCanSeeTournament = async (tournamentId, user) => {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw new HttpError(404, 'Tournament not found');
  }

  // Host always allowed.
  if (tournament.ownerId.toString() === user._id.toString()) {
    return tournament;
  }

  // Public tournaments: any authenticated user.
  if (tournament.visibility === 'public') {
    return tournament;
  }

  // Invite-only: must have an Invitation row for this user's email.
  const invite = await Invitation.findOne({
    tournamentId: tournament._id,
    email: user.email,
  });
  if (!invite) {
    throw new HttpError(403, 'This tournament is invite-only');
  }
  return tournament;
};

module.exports = { assertCanSeeTournament, HttpError };