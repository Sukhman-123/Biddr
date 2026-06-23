const mongoose = require('mongoose');

const LOT_STYLES = ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'];
const LOT_STATUSES = ['queued', 'sold', 'unsold'];

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
  },
  { timestamps: true },
);

lotSchema.index({ tournamentId: 1, status: 1 });
lotSchema.index({ tournamentId: 1, set: 1 });

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
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

module.exports = mongoose.model('Lot', lotSchema);
module.exports.LOT_STYLES = LOT_STYLES;
module.exports.LOT_STATUSES = LOT_STATUSES;
