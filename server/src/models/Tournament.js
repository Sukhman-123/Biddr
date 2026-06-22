const mongoose = require('mongoose');

const TOURNAMENT_STATUSES = ['upcoming', 'live', 'completed'];
const TOURNAMENT_VISIBILITIES = ['public', 'invite-only'];

const coverSchema = new mongoose.Schema(
  {
    gradientFrom: {
      type: String,
      default: '#1d2436',
      match: [/^#([0-9a-fA-F]{3}){1,2}$/, 'gradientFrom must be a hex color'],
    },
    gradientVia: {
      type: String,
      default: '',
    },
    gradientTo: {
      type: String,
      default: '#0a0d16',
      match: [/^#([0-9a-fA-F]{3}){1,2}$/, 'gradientTo must be a hex color'],
    },
    accentHex: {
      type: String,
      default: '#f5b94a',
    },
    liveRoomCount: {
      type: Number,
      min: [0, 'liveRoomCount cannot be negative'],
      default: 0,
    },
  },
  { _id: false },
);

const franchiseSlotSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Franchise name is required'],
      trim: true,
      maxlength: [80, 'Franchise name must be 80 characters or fewer'],
    },
    city: {
      type: String,
      trim: true,
      maxlength: [80, 'City must be 80 characters or fewer'],
      default: '',
    },
    colorHex: {
      type: String,
      trim: true,
      match: [/^#([0-9a-fA-F]{3}){1,2}$/, 'colorHex must be a hex color'],
      default: '#f5b94a',
    },
  },
  { _id: true },
);

const tournamentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
      maxlength: [120, 'Tournament name must be 120 characters or fewer'],
    },
    shortCode: {
      type: String,
      required: [true, 'Short code is required'],
      trim: true,
      uppercase: true,
      maxlength: [16, 'Short code must be 16 characters or fewer'],
      unique: true,
      match: [/^[A-Z0-9-]+$/, 'Short code may only contain A-Z, 0-9, and dashes'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [600, 'Description must be 600 characters or fewer'],
      default: '',
    },
    coverImage: {
      type: String,
      trim: true,
      default: '',
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      minlength: [3, 'Currency must be a 3-letter code'],
      maxlength: [3, 'Currency must be a 3-letter code'],
      default: 'INR',
    },
    pursePerFranchise: {
      type: Number,
      min: [0, 'Purse cannot be negative'],
      default: 100000000,
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: TOURNAMENT_STATUSES,
        message: 'Status must be upcoming, live, or completed',
      },
      default: 'upcoming',
    },
    visibility: {
      type: String,
      enum: {
        values: TOURNAMENT_VISIBILITIES,
        message: 'Visibility must be public or invite-only',
      },
      default: 'public',
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Tournament must have an auctioneer'],
    },
    hostName: {
      type: String,
      trim: true,
      maxlength: [80, 'Host name must be 80 characters or fewer'],
      default: '',
    },
    region: {
      type: String,
      trim: true,
      maxlength: [80, 'Region must be 80 characters or fewer'],
      default: '',
    },
    cover: {
      type: coverSchema,
      default: () => ({}),
    },
    franchises: {
      type: [franchiseSlotSchema],
      default: [],
    },
  },
  { timestamps: true },
);

tournamentSchema.index({ status: 1, startDate: 1 });
tournamentSchema.index({ visibility: 1 });
tournamentSchema.index({ ownerId: 1 });

tournamentSchema.virtual('franchiseCount').get(function getFranchiseCount() {
  return this.franchises?.length ?? 0;
});

tournamentSchema.methods.toSummaryJSON = function toSummaryJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    shortCode: this.shortCode,
    description: this.description,
    coverImage: this.coverImage,
    currency: this.currency,
    pursePerFranchise: this.pursePerFranchise,
    startDate: this.startDate,
    endDate: this.endDate,
    status: this.status,
    visibility: this.visibility,
    hostName: this.hostName || '',
    region: this.region || '',
    cover: {
      gradientFrom: this.cover?.gradientFrom ?? '#1d2436',
      gradientVia: this.cover?.gradientVia ?? '',
      gradientTo: this.cover?.gradientTo ?? '#0a0d16',
      accentHex: this.cover?.accentHex ?? '#f5b94a',
      liveRoomCount: this.cover?.liveRoomCount ?? 0,
    },
    franchiseCount: this.franchises?.length ?? 0,
    createdAt: this.createdAt,
  };
};

tournamentSchema.methods.toDetailJSON = function toDetailJSON() {
  return {
    ...this.toSummaryJSON(),
    ownerId: this.ownerId?.toString?.() ?? this.ownerId,
    franchises: (this.franchises || []).map((f) => ({
      id: f._id.toString(),
      name: f.name,
      city: f.city,
      colorHex: f.colorHex,
    })),
  };
};

const Tournament = mongoose.model('Tournament', tournamentSchema);

module.exports = Tournament;
module.exports.TOURNAMENT_STATUSES = TOURNAMENT_STATUSES;
module.exports.TOURNAMENT_VISIBILITIES = TOURNAMENT_VISIBILITIES;