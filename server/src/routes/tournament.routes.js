const express = require('express');
const multer = require('multer');
const {
  listTournaments,
  getTournament,
  createTournament,
  updateTournament,
  startAuction,
  endAuction,
  listInvites,
  createInvite,
  revokeInvite,
} = require('../controllers/tournament.controller');
const {
  listLots,
  createLot,
  bulkUploadLots,
  updateLot,
  deleteLot,
  streamCsvTemplate,
  streamXlsxTemplate,
} = require('../controllers/lot.controller');
const {
  activateLot,
  getRoomSnapshot,
} = require('../controllers/auctionRoom.controller');
const { auth } = require('../middleware/auth');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok =
      /^text\/csv$|^application\/vnd\.ms-excel$|^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/.test(
        file.mimetype,
      ) || /\.(csv|xlsx|xls)$/i.test(file.originalname || '');
    if (!ok) {
      const err = new Error('Only CSV or XLSX files are accepted');
      err.status = 400;
      return cb(err);
    }
    return cb(null, true);
  },
});

router.use(auth);

router.get('/', listTournaments);
router.get('/:id', getTournament);
router.post('/', createTournament);
router.patch('/:id', updateTournament);
router.post('/:id/start', startAuction);
router.post('/:id/end', endAuction);
router.get('/:id/invites', listInvites);
router.post('/:id/invites', createInvite);
router.delete('/:id/invites/:inviteId', revokeInvite);

// Auction pool / lots
router.get('/:id/lots', listLots);
router.post('/:id/lots', createLot);
router.post('/:id/lots/bulk', upload.single('file'), bulkUploadLots);
router.get('/:id/lots/template.csv', streamCsvTemplate);
router.get('/:id/lots/template.xlsx', streamXlsxTemplate);

// Auction room — host-driven lot lifecycle. The host (auctioneer) is
// the only one who can activate / hammer / pass; see
// /Users/onehash/.claude/plans/spicy-greeting-hickey.md.
router.get('/:id/room', getRoomSnapshot);
router.post('/:id/lots/:lotId/activate', activateLot);

module.exports = router;
