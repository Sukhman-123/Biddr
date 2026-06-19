const User = require('../models/User');
const { signToken } = require('../middleware/auth');

const sanitizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const buildPayload = (user, token) => ({
  user: user.toSafeJSON(),
  token,
});

const register = async (req, res, next) => {
  try {
    const { fullName, franchise, email, password, role } = req.body || {};

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: 'Full name, email, and password are required',
      });
    }

    const normalizedEmail = sanitizeEmail(email);
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({
        message: 'An account with that email already exists',
      });
    }

    const user = await User.create({
      fullName: fullName.trim(),
      franchise: typeof franchise === 'string' ? franchise.trim() : '',
      email: normalizedEmail,
      password,
      role,
    });

    const token = signToken(user._id);
    return res.status(201).json(buildPayload(user, token));
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: sanitizeEmail(email) }).select(
      '+password',
    );
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const matches = await user.comparePassword(password);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = signToken(user._id);
    return res.status(200).json(buildPayload(user, token));
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res) => {
  res.status(200).json({ user: req.user.toSafeJSON() });
};

const logout = async (req, res) => {
  res.status(200).json({ message: 'Signed out' });
};

module.exports = { register, login, me, logout };
