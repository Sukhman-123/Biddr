const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['auctioneer', 'viewer'];

const PHONE_RE = /^[\+]?[\d\s\-]{7,20}$/;

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [80, 'Full name must be 80 characters or fewer'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    phone: {
      type: String,
      required: [
        function phoneRequired() {
          // Google sign-ins can fill this in later via the profile editor.
          return !this.googleSub;
        },
        'Phone number is required',
      ],
      trim: true,
      unique: true,
      sparse: true,
      match: [PHONE_RE, 'Please provide a valid phone number'],
    },
    password: {
      type: String,
      // Password is required for local sign-up, but optional when the
      // user comes in via Google OAuth (we just need googleSub). The
      // controller layer should set this to a hashed random string
      // for Google users so comparePassword() still works if the user
      // later links a local password via the profile editor.
      required: function passwordRequired() {
        return !this.googleSub;
      },
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ROLES,
        message: 'Role must be auctioneer or viewer',
      },
      default: 'viewer',
    },
    googleSub: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.index(
  { googleSub: 1 },
  { unique: true, partialFilterExpression: { googleSub: { $type: 'string' } } },
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  // Google-only users never set a password; treat any local login
  // attempt as a mismatch instead of crashing on bcrypt.
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    phone: this.phone ?? null,
    role: this.role,
    authProvider: this.googleSub ? 'google' : 'local',
    createdAt: this.createdAt,
  };
};

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.ROLES = ROLES;
