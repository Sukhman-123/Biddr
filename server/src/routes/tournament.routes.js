const express = require('express');
const {
  listTournaments,
  getTournament,
  createTournament,
  updateTournament,
  listInvites,
  createInvite,
  revokeInvite,
} = require('../controllers/tournament.controller');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', listTournaments);
router.get('/:id', getTournament);
router.post('/', createTournament);
router.patch('/:id', updateTournament);
router.get('/:id/invites', listInvites);
router.post('/:id/invites', createInvite);
router.delete('/:id/invites/:inviteId', revokeInvite);

module.exports = router;