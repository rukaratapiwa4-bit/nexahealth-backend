/**
 * NexaHealth — models/Recall.js
 * MCAZ issues recalls against real products/batches. Every pharmacy
 * that has ordered that batch gets flagged automatically and notified.
 */
const mongoose = require('mongoose');

const RecallSchema = new mongoose.Schema(
  {
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // MCAZ user
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    medicineName: { type: String, required: true },
    batchNumber: { type: String, required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // wholesaler/manufacturer

    recallClass: {
      type: String,
      enum: ['class_1', 'class_2', 'class_3'], // I = immediate risk, III = unlikely risk
      default: 'class_2',
    },
    reason: { type: String, required: true },
    actionRequired: { type: String }, // instructions to pharmacies

    // Auto-populated: every pharmacy that ordered this batch
    affectedPharmacies: [
      {
        pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notifiedAt: { type: Date },
        confirmedAt: { type: Date },
        quantityHeld: { type: Number, default: 0 },
        quantityReturned: { type: Number, default: 0 },
        status: {
          type: String,
          enum: ['notified', 'confirmed', 'resolved'],
          default: 'notified',
        },
      },
    ],

    targetRecoveryUnits: { type: Number, default: 0 },
    recoveredUnits: { type: Number, default: 0 },
    destroyedUnits: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ['active', 'resolved', 'escalated'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Recall', RecallSchema);
