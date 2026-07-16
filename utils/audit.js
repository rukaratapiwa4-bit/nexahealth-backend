/**
 * NexaHealth — utils/audit.js
 * Single helper used by every controller to write to the audit trail.
 * Never write to AuditLog directly elsewhere — always go through this,
 * so the shape stays consistent across the whole app.
 */
const AuditLog = require('../models/AuditLog');

/**
 * @param {Object} opts
 * @param {String} opts.action           e.g. 'ENTITY_SUSPENDED', 'ORDER_CREATED', 'LOGIN'
 * @param {Object} opts.performedBy      the req.user object (must have _id, userType)
 * @param {String} [opts.targetEntity]   ObjectId of whatever was acted upon
 * @param {String} [opts.targetType]     'User' | 'Order' | 'Product' | 'Recall' etc.
 * @param {*}      [opts.previousValue]
 * @param {*}      [opts.newValue]
 * @param {String} [opts.reason]
 * @param {Object} [opts.req]            raw Express req, to pull IP + user agent
 * @param {Object} [opts.metadata]
 */
async function logAction({
  action,
  performedBy,
  targetEntity,
  targetType,
  previousValue,
  newValue,
  reason,
  req,
  metadata,
}) {
  try {
    await AuditLog.create({
      action,
      performedBy: performedBy?._id || performedBy,
      performedByRole: performedBy?.userType,
      targetEntity,
      targetType,
      ipAddress: req?.ip || req?.headers?.['x-forwarded-for'],
      userAgent: req?.headers?.['user-agent'],
      previousValue,
      newValue,
      reason,
      metadata,
    });
  } catch (err) {
    // Audit logging must never crash the main request — log and move on
    console.error('⚠️ Audit log write failed:', err.message);
  }
}

module.exports = { logAction };
