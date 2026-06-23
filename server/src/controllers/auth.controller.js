const User = require('../models/User');
const { ROLES } = require('../models/User');
const { signToken } = require('../middleware/auth');
const { verifyGoogleIdToken } = require('../services/googleAuth');

const PHONE_RE = /^[+]?[\d\s-]{7,20}$/;

const sanitizeEmail = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const sanitizePhone = (value) =>
  typeof value === 'string' ? value.trim() : value;

const buildPayload = (user, token) => ({
  user: user.toSafeJSON(),
  token,
});

const isValidRole = (role) => ROLES.includes(role);

const isEmailIdentifier = (value) =>
  typeof value === 'string' && value.includes('@');

const isValidPhone = (value) =>
  typeof value === 'string' && PHONE_RE.test(value.trim());

const findByIdentifier = async (identifier) => {
  if (!identifier || typeof identifier !== 'string') return null;
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  if (isEmailIdentifier(trimmed)) {
    return User.findOne({ email: sanitizeEmail(trimmed) }).select('+password');
  }
  return User.findOne({ phone: sanitizePhone(trimmed) }).select('+password');
};

const updateMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const { fullName, password, phone } = req.body || {};
    if (req.body?.role !== undefined) {
      if (!isValidRole(req.body.role)) {
        return res
          .status(400)
          .json({ message: 'Role must be either "viewer" or "auctioneer"' });
      }
      user.role = req.body.role;
    }
    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.trim().length < 2) {
        return res
          .status(400)
          .json({ message: 'Full name must be at least 2 characters' });
      }
      if (fullName.trim().length > 80) {
        return res
          .status(400)
          .json({ message: 'Full name must be 80 characters or fewer' });
      }
      user.fullName = fullName.trim();
    }
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 8) {
        return res
          .status(400)
          .json({ message: 'Password must be at least 8 characters' });
      }
      user.password = password;
    }
    if (phone !== undefined) {
      if (phone === null || phone === '') {
        // Allow clearing the phone only if Google-linked (sparse-unique-friendly).
        if (!user.googleSub) {
          return res
            .status(400)
            .json({ message: 'Phone number cannot be empty' });
        }
        user.phone = undefined;
      } else if (typeof phone !== 'string' || !isValidPhone(phone)) {
        return res
          .status(400)
          .json({ message: 'Please provide a valid phone number' });
      } else {
        user.phone = sanitizePhone(phone);
      }
    }
    await user.save();
    return res.json({ user: user.toSafeJSON() });
  } catch (error) {
    if (error && error.code === 11000) {
      return res
        .status(409)
        .json({ message: 'That phone number is already in use' });
    }
    return next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { fullName, email, password, phone, role } = req.body || {};

    if (!fullName || !email || !password || !phone) {
      return res.status(400).json({
        message: 'Full name, email, phone, and password are required',
      });
    }
    if (!isValidPhone(phone)) {
      return res
        .status(400)
        .json({ message: 'Please provide a valid phone number' });
    }

    const normalizedEmail = sanitizeEmail(email);
    const normalizedPhone = sanitizePhone(phone);

    const [existingEmail, existingPhone] = await Promise.all([
      User.findOne({ email: normalizedEmail }),
      User.findOne({ phone: normalizedPhone }),
    ]);
    if (existingEmail) {
      return res.status(409).json({
        message: 'An account with that email already exists',
      });
    }
    if (existingPhone) {
      return res.status(409).json({
        message: 'An account with that phone number already exists',
      });
    }

    // Role is optional on signup; auctioneers can self-elect.
    const desiredRole = isValidRole(role) ? role : 'viewer';

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      role: desiredRole,
    });

    const token = signToken(user._id);
    return res.status(201).json(buildPayload(user, token));
  } catch (error) {
    if (error && error.code === 11000) {
      const field = error.keyPattern?.email
        ? 'email'
        : error.keyPattern?.phone
          ? 'phone'
          : null;
      return res.status(409).json({
        message:
          field === 'email'
            ? 'An account with that email already exists'
            : field === 'phone'
              ? 'An account with that phone number already exists'
              : 'Account already exists',
      });
    }
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body || {};

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ message: 'Email or phone and password are required' });
    }

    const user = await findByIdentifier(identifier);
    if (!user) {
      return res
        .status(401)
        .json({ message: 'Invalid email/phone or password' });
    }

    const matches = await user.comparePassword(password);
    if (!matches) {
      return res
        .status(401)
        .json({ message: 'Invalid email/phone or password' });
    }

    const token = signToken(user._id);
    return res.status(200).json(buildPayload(user, token));
  } catch (error) {
    return next(error);
  }
};

const me = async (req, res, next) => {
  try {
    const fresh = await User.findById(req.user._id);
    if (!fresh) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ user: fresh.toSafeJSON() });
  } catch (error) {
    return next(error);
  }
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
            'Your Google email is not verified. Please try again with a verified Google account.',
        });
      }
      const desiredRole = isValidRole(role) ? role : 'viewer';
      // Google users may add a phone later via the profile editor.
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

module.exports = { register, login, me, logout, loginWithGoogle, updateMe };