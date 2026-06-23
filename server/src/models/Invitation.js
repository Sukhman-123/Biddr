const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament is required'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    invitedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Inviter is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted'],
        message: 'Status must be pending or accepted',
      },
      default: 'pending',
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

invitationSchema.index(
  { tournamentId: 1, email: 1 },
  { unique: true },
);

module.exports = mongoose.model('Invitation', invitationSchema);
