const mongoose = require('mongoose');

const identitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
  },
  { _id: false },
);

const undoActionSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      required: true,
      index: true,
    },
    lotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lot',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['BID_PLACED', 'LOT_HAMMERED', 'LOT_PASSED'],
      required: true,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    host: {
      type: identitySchema,
      required: true,
    },
    performedBy: {
      type: identitySchema,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'undone', 'cleared'],
      default: 'pending',
      required: true,
      index: true,
    },
    undoneBy: {
      type: identitySchema,
      default: null,
    },
    undoneAt: {
      type: Date,
      default: null,
    },
    clearedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

undoActionSchema.index({ tournamentId: 1, status: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('UndoAction', undoActionSchema);
