const express = require('express');
const {
  register,
  login,
  me,
  logout,
  loginWithGoogle,
  updateMe,
} = require('../controllers/auth.controller');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', loginWithGoogle);
router.get('/me', auth, me);
router.patch('/me', auth, updateMe);
router.post('/logout', auth, logout);

module.exports = router;
