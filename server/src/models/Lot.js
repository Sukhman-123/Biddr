const mongoose = require('mongoose');

const LOT_STYLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'];
const LOT_STATUSES = ['queued', 'sold', 'unsold'];
// Auction-room lifecycle for a lot. Mutated ONLY by host actions
// (activate / hammer / pass). The server never auto-transitions.
const LOT_AUCTION_STATUSES = ['idle', 'active', 'paused', 'hammered', 'unsold'];

const lotSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: [true, 'Tournament is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Player name is required'],
      trim: true,
      maxlength: [120, 'Player name must be 120 characters or fewer'],
    },
    style: {
      type: String,
      required: [true, 'Cricketing style is required'],
      enum: {
        values: LOT_STYLES,
        message: `Style must be one of: ${LOT_STYLES.join(', ')}`,
      },
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [80, 'Country must be 80 characters or fewer'],
      default: 'Home',
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'Base price cannot be negative'],
    },
    photoUrl: {
      type: String,
      trim: true,
      maxlength: [600, 'Photo URL must be 600 characters or fewer'],
      default: '',
    },
    set: {
      type: String,
      trim: true,
      maxlength: [60, 'Set label must be 60 characters or fewer'],
      default: 'Squad',
    },
    status: {
      type: String,
      enum: {
        values: LOT_STATUSES,
        message: `Status must be one of: ${LOT_STATUSES.join(', ')}`,
      },
      default: 'queued',
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },

    // ============================================================
    // Auction-room state. Mutated ONLY by host actions via the
    // auctionRoom controller. The server never auto-advances these
    // fields — see /Users/onehash/.claude/plans/spicy-greeting-hickey.md
    // for the total-host-control invariants.
    // ============================================================
    auctionStatus: {
      type: String,
      enum: {
        values: LOT_AUCTION_STATUSES,
        message: `auctionStatus must be one of: ${LOT_AUCTION_STATUSES.join(', ')}`,
      },
      default: 'idle',
      index: true,
    },
    currentBid: {
      type: Number,
      default: 0,
      min: [0, 'currentBid cannot be negative'],
    },
    currentBidderFranchiseId: {
      type: String,
      default: null,
    },
    currentBidByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    currentBidAt: {
      type: Date,
      default: null,
    },
    // Host-editable. No default — if missing, the host must set it
    // before this lot can be activated. v1 doesn't read this field,
    // but the no-default rule enforces "host decides everything".
    bidIncrement: {
      type: Number,
      min: [0, 'bidIncrement cannot be negative'],
      default: null,
    },
    // The franchise that won the lot when it was hammered. Stays
    // null until the host explicitly assigns one (or until v2 lets
    // the host hammer the high bidder as default).
    soldToFranchiseId: {
      type: String,
      default: null,
    },
    // Final price recorded on hammer. Stays at basePrice until the
    // host hammers a bid.
    soldPrice: {
      type: Number,
      default: null,
      min: [0, 'soldPrice cannot be negative'],
    },
    // Bid history for this lot. Appended on each bid:placed event.
    // Used by the room snapshot so reconnecting clients see the full
    // bid ladder without needing a separate Bid collection.
    bidHistory: {
      type: [
        {
          amount: { type: Number, required: true },
          franchiseId: { type: String, required: true },
          franchiseName: { type: String, required: true },
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          userFullName: { type: String },
          at: { type: Date, required: true },
        },
      ],
      default: () => [],
    },
  },
  { timestamps: true },
);

lotSchema.index({ tournamentId: 1, status: 1 });
lotSchema.index({ tournamentId: 1, set: 1 });
// Fast lookup of "is there an active lot in this tournament right now?"
lotSchema.index({ tournamentId: 1, auctionStatus: 1 });
// Hard safety net for physical/host-controlled auctions: only one lot can
// be on the floor for a tournament, whether actively bidding or paused.
lotSchema.index(
  { tournamentId: 1 },
  {
    unique: true,
    partialFilterExpression: { auctionStatus: { $in: ['active', 'paused'] } },
    name: 'one_floor_lot_per_tournament',
  },
);

lotSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject({ versionKey: false });
  return {
    id: obj._id.toString(),
    tournamentId: obj.tournamentId.toString(),
    name: obj.name,
    style: obj.style,
    country: obj.country,
    basePrice: obj.basePrice,
    photoUrl: obj.photoUrl,
    set: obj.set,
    status: obj.status,
    auctionStatus: obj.auctionStatus,
    currentBid: obj.currentBid,
    currentBidderFranchiseId: obj.currentBidderFranchiseId,
    currentBidByUserId: obj.currentBidByUserId?.toString?.() ?? obj.currentBidByUserId ?? null,
    currentBidAt: obj.currentBidAt,
    bidIncrement: obj.bidIncrement,
    soldToFranchiseId: obj.soldToFranchiseId,
    soldPrice: obj.soldPrice,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

module.exports = mongoose.model('Lot', lotSchema);
module.exports.LOT_STYLES = LOT_STYLES;
module.exports.LOT_STATUSES = LOT_STATUSES;
module.exports.LOT_AUCTION_STATUSES = LOT_AUCTION_STATUSES;
