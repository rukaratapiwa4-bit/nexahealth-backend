/**
 * NexaHealth — models/AuditLog.js
 * Immutable audit trail. Every sensitive action (suspend, recall, approve,
 * reject, login) writes here. Nothing should ever be untraceable.
 * This collection is APPEND-ONLY — never update or delete documents from it.
 */
const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true }, // e.g. "ENTITY_SUSPENDED", "RECALL_ISSUED", "LOGIN"
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    performedByRole: { type: String },
    targetEntity: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who/what was acted upon
    targetType: { type: String }, // e.g. "User", "Order", "Product", "Recall"

    ipAddress: { type: String },
    userAgent: { type: String },

    previousValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String },

    metadata: { type: mongoose.Schema.Types.Mixed }, // anything extra, flexible
  },
  { timestamps: true } // createdAt = the immutable timestamp of the action
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ performedBy: 1 });
AuditLogSchema.index({ targetEntity: 1 });

// Guard against accidental updates — this collection is append-only
AuditLogSchema.pre('findOneAndUpdate', function (next) {
  next(new Error('AuditLog documents cannot be modified once created.'));
});
AuditLogSchema.pre('updateOne', function (next) {
  next(new Error('AuditLog documents cannot be modified once created.'));
});
AuditLogSchema.pre('deleteOne', function (next) {
  next(new Error('AuditLog documents cannot be deleted.'));
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
