const mongoose = require('mongoose');

const BID_STATUSES = ['live', 'won', 'lost', 'retracted'];

// Append-only history of every paddle raise in an auction room.
//
// v1 does not write to this collection — it's defined now so v2
// (real-time bid placement) doesn't need a schema migration. See
// /Users/onehash/.claude/plans/spicy-greeting-hickey.md for context.
//
// Lifecycle:
//   live       — paddle is on the floor, lot is active
//   won        — paddle was the high bid when the host hammered
//   lost       — outbid by a later paddle (or lot was passed)
//   retracted  — host removed this paddle from the floor (v2)
const bidSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament is required'],
      index: true,
    },
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lot',
      required: [true, 'Lot is required'],
      index: true,
    },
    // Franchise is a subdoc on the Tournament, so its _id is a string
    // (Mongoose ObjectId with `_id: true` on the subdoc), not a real
    // ObjectId. Stored as String to match the model.
    franchiseId: {
      type: String,
      required: [true, 'Franchise is required'],
      trim: true,
    },
    // The user who clicked "Raise paddle" on behalf of the franchise.
    // A franchise can have multiple reps; this records who actually
    // raised it.
    raisedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Raiser is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Bid amount is required'],
      min: [0, 'Bid amount cannot be negative'],
    },
    status: {
      type: String,
      enum: {
        values: BID_STATUSES,
        message: `Status must be one of: ${BID_STATUSES.join(', ')}`,
      },
      default: 'live',
      index: true,
    },
    raisedAt: {
      type: Date,
      default: () => new Date(),
      index: true,
    },
  },
  { timestamps: true },
);

// Bid feed for a single lot, newest first.
bidSchema.index({ tournamentId: 1, lotId: 1, raisedAt: -1 });

// Per-franchise rollups (e.g. "total spent" for a franchise).
bidSchema.index({ tournamentId: 1, franchiseId: 1 });

bidSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ versionKey: false });
  return {
    id: obj._id.toString(),
    tournamentId: obj.tournamentId.toString(),
    lotId: obj.lotId.toString(),
    franchiseId: obj.franchiseId,
    raisedByUserId: obj.raisedByUserId.toString(),
    amount: obj.amount,
    status: obj.status,
    raisedAt: obj.raisedAt,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

const Bid = mongoose.model('Bid', bidSchema);

module.exports = Bid;
module.exports.BID_STATUSES = BID_STATUSES;