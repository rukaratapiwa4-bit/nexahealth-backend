/**
 * NexaHealth — models/Complaint.js
 * Full complaint investigation workflow tracked by MCAZ.
 */
const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema(
  {
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // may be null if external/anonymous
    submitterName: { type: String, required: true }, // fallback display name
    aboutEntity: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    category: {
      type: String,
      enum: ['product_quality', 'counterfeit_suspicion', 'pricing_irregularity', 'licence_violation', 'supply_diversion', 'other'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
    },
    description: { type: String, required: true },

    assignedInspector: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },

    evidence: [{ type: String }], // Cloudinary URLs — photos, documents
    communicationLog: [
      {
        message: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],

    outcome: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', ComplaintSchema);
