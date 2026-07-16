/**
 * NexaHealth — models/Application.js
 * Pharmacist applies to a wholesaler to become a trading partner.
 * Wholesaler sees it in their "Incoming Applications" inbox and can
 * approve/reject. Approval unlocks the chat thread between them.
 */
const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema(
  {
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wholesaler: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    message: { type: String }, // optional note from pharmacist
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String },

    respondedAt: { type: Date },
  },
  { timestamps: true }
);

// A pharmacy can only have ONE active application per wholesaler
ApplicationSchema.index({ pharmacy: 1, wholesaler: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);
