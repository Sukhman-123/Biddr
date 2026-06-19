const jwt = require('jsonwebtoken');
const User = require('../models/User');

const TOKEN_EXPIRES_IN = '7d';

const signToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is missing from server/config.env');
  }
  return jwt.sign({ sub: userId.toString() }, secret, {
    expiresIn: TOKEN_EXPIRES_IN,
  });
};

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'Account no longer exists' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { auth, signToken, TOKEN_EXPIRES_IN };
