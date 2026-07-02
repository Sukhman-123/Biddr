const express = require('express');
const { auth } = require('../middleware/auth');
const {
  addMember,
  removeMember,
  updateMemberRole,
  getMembers,
} = require('../controllers/franchise.controller');

const router = express.Router();

router.use(auth);

// Mounted at /api/franchises → paths are /:tournamentId/:franchiseId/…
router.post('/:tournamentId/:franchiseId/members', addMember);
router.get('/:tournamentId/:franchiseId/members', getMembers);
router.put('/:tournamentId/:franchiseId/members/:userId', updateMemberRole);
router.delete('/:tournamentId/:franchiseId/members/:userId', removeMember);

module.exports = router;
