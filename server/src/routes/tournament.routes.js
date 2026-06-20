const express = require('express');
const {
  listTournaments,
  getTournament,
  createTournament,
} = require('../controllers/tournament.controller');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/', listTournaments);
router.get('/:id', getTournament);
router.post('/', createTournament);

module.exports = router;