const express = require('express');
const { submitContact } = require('../controllers/contact.controller');

const router = express.Router();

// POST /api/contact — public endpoint, no auth required
router.post('/', submitContact);

module.exports = router;
