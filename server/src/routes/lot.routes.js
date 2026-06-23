const express = require('express');
const { auth } = require('../middleware/auth');
const { updateLot, deleteLot } = require('../controllers/lot.controller');

const router = express.Router();

router.use(auth);

router.patch('/:lotId', updateLot);
router.delete('/:lotId', deleteLot);

module.exports = router;