/**
 * NexaHealth — models/Inspection.js
 * MCAZ inspection scheduling, digital forms, scoring, corrective actions.
 */
const mongoose = require('mongoose');

const InspectionSchema = new mongoose.Schema(
  {
    entity: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    inspector: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    type: {
      type: String,
      enum: ['routine', 'targeted', 'follow_up', 'unannounced'],
      default: 'routine',
    },
    scheduledDate: { type: Date, required: true },
    completedDate: { type: Date },

    status: {
      type: String,
      enum: ['scheduled', 'completed', 'overdue', 'cancelled'],
      default: 'scheduled',
      index: true,
    },

    score: { type: Number, min: 0, max: 100 },
    findings: { type: String },
    violations: { type: Number, default: 0 },
    correctiveActions: { type: String },
    correctiveDeadline: { type: Date },

    photoEvidence: [{ type: String }], // Cloudinary URLs
    gpsLocation: {
      lat: Number,
      lng: Number,
    },
    digitalSignature: { type: String }, // base64 signature image or signed confirmation
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inspection', InspectionSchema);
