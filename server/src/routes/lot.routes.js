const express = require('express');
const { auth } = require('../middleware/auth');
const { updateLot, deleteLot } = require('../controllers/lot.controller');
const {
  hammerLot,
  passLot,
} = require('../controllers/auctionRoom.controller');

const router = express.Router();

router.use(auth);

router.patch('/:lotId', updateLot);
router.delete('/:lotId', deleteLot);

// Auction-room transitions. Host-only — the auctioneer is the only
// entity that can mutate room state. See the plan in
// /Users/onehash/.claude/plans/spicy-greeting-hickey.md.
router.post('/:lotId/hammer', hammerLot);
router.post('/:lotId/pass', passLot);

module.exports = router;