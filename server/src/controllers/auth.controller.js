const User = require('../models/User');
const { ROLES } = require('../models/User');
const { signToken } = require('../middleware/auth');
const { verifyGoogleIdToken } = require('../services/googleAuth');

const sanitizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const buildPayload = (user, token) => ({
  user: user.toSafeJSON(),
  token,
});

const isValidRole = (role) => ROLES.includes(role);

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

const loginWithGoogle = async (req, res, next) => {
  try {
    const { idToken, role } = req.body || {};

    if (!idToken) {
      return res.status(400).json({ message: 'Google idToken is required' });
    }

    let payload;
    try {
      payload = await verifyGoogleIdToken(idToken);
    } catch (error) {
      return res
        .status(401)
        .json({ message: 'Google sign-in failed. Please try again.' });
    }

    const { sub, email, email_verified, name } = payload;
    const normalizedEmail = sanitizeEmail(email);

    let user = await User.findOne({ googleSub: sub });

    if (!user && normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
      if (user && !user.googleSub) {
        if (!email_verified) {
          return res.status(403).json({
            message:
              'This Google email is not verified. Please verify with Google before linking.',
          });
        }
        user.googleSub = sub;
        if (!user.fullName && name) user.fullName = name;
        await user.save();
      }
    }

    if (!user) {
      if (!email_verified) {
        return res.status(403).json({
          message:
            'Your Google email is not verified. Please verify with Google before signing in.',
        });
      }
      const desiredRole = isValidRole(role) ? role : 'owner';
      user = await User.create({
        fullName: name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: desiredRole,
        googleSub: sub,
      });
    }

    const token = signToken(user._id);
    return res.status(200).json(buildPayload(user, token));
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, me, logout, loginWithGoogle };
