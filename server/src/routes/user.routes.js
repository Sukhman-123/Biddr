const express = require('express');
const { auth: requireAuth } = require('../middleware/auth');
const { getUserStats } = require('../controllers/user.controller');

const router = express.Router();

router.get('/me/stats', requireAuth, getUserStats);

module.exports = router;
