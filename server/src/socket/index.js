const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Invitation = require('../models/Invitation');

// =============================================================
// Socket.IO layer for the Biddr auction room.
//
// Responsibilities:
//   1. Authenticate every connecting socket via the JWT that the
//      client already passes in `socket.handshake.auth.token`.
//   2. Attach the authenticated user to `socket.data.user` so
//      handlers can use it without re-querying.
//   3. Implement a room:join / room:leave protocol so each client
//      subscribes to the tournament-level broadcast channel it
//      cares about (one per tournament in v1).
//
// In v1 the server ONLY relays host actions. There are no paddle
// raises, no bid validation, no auto-anything. Host actions arrive
// via REST endpoints in controllers/auctionRoom.controller.js and
// those endpoints call `io.to('tournament:<id>').emit(...)` to
// broadcast to everyone in the room.
//
// The host IS the only entity that mutates room state — see
// /Users/onehash/.claude/plans/spicy-greeting-hickey.md.
// =============================================================

// io can be null when this file is required from a test that only
// exercises the auth middleware. The middleware functions are
// exported separately for that reason (see `attachSocketAuth`).
let ioRef = null;

const SOCKET_NAMESPACE = '/';

const attachSocketAuth = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('unauthorized'));
    }
    if (!process.env.JWT_SECRET) {
      // Without a secret we cannot verify anything; fail closed.
      return next(new Error('unauthorized'));
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub).select(
        '_id fullName email',
      );
      if (!user) return next(new Error('unauthorized'));
      socket.data.user = user;
      return next();
    } catch (err) {
      return next(new Error('unauthorized'));
    }
  });
};

// Returns the Tournament if the user is allowed to subscribe to it.
// Throws an Error with `data: { status }` so the room:join ack
// can pass the HTTP-style status code back to the client.
const assertCanSubscribe = async (tournamentId, user) => {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    const err = new Error('Tournament not found');
    err.data = { status: 404 };
    throw err;
  }
  if (tournament.ownerId.toString() === user._id.toString()) {
    return tournament;
  }
  if (tournament.visibility === 'public') {
    return tournament;
  }
  const invite = await Invitation.findOne({
    tournamentId: tournament._id,
    email: user.email,
  });
  if (!invite) {
    const err = new Error('This tournament is invite-only');
    err.data = { status: 403 };
    throw err;
  }
  return tournament;
};

const registerSocketHandlers = (io) => {
  ioRef = io;
  attachSocketAuth(io);

  io.on('connection', (socket) => {
    const user = socket.data.user;

    socket.emit('auction:connected', {
      message: 'Connected to Biddr live auction server',
      socketId: socket.id,
      userId: user._id.toString(),
    });

    // room:join — subscribe to a tournament's broadcast channel.
    // The server enforces the same access rule as REST: owner or
    // (public OR invited). Anyone else gets an error ack.
    socket.on('room:join', async ({ tournamentId } = {}, ack) => {
      try {
        if (!tournamentId || typeof tournamentId !== 'string') {
          throw Object.assign(new Error('tournamentId is required'), {
            data: { status: 400 },
          });
        }
        await assertCanSubscribe(tournamentId, user);
        const roomName = `tournament:${tournamentId}`;
        await socket.join(roomName);
        if (typeof ack === 'function') ack({ ok: true, room: roomName });
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ ok: false, status: err.data?.status ?? 500, message: err.message });
        }
      }
    });

    // room:leave — unsubscribe. Optional; sockets also auto-leave on
    // disconnect, so this is mostly for explicit "switch room" UX.
    socket.on('room:leave', ({ tournamentId } = {}, ack) => {
      try {
        if (!tournamentId || typeof tournamentId !== 'string') {
          throw Object.assign(new Error('tournamentId is required'), {
            data: { status: 400 },
          });
        }
        socket.leave(`tournament:${tournamentId}`);
        if (typeof ack === 'function') ack({ ok: true });
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ ok: false, status: err.data?.status ?? 500, message: err.message });
        }
      }
    });

    socket.on('disconnect', () => {
      // No-op: socket.io auto-removes the socket from all rooms.
    });
  });
};

module.exports = registerSocketHandlers;
module.exports.attachSocketAuth = attachSocketAuth;
module.exports.assertCanSubscribe = assertCanSubscribe;
