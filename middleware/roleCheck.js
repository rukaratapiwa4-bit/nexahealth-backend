/**
 * NexaHealth — middleware/roleCheck.js
 * Enforces that only the correct userType can hit a given route.
 * Use AFTER your existing `protect` middleware (which sets req.user).
 *
 * Usage:
 *   router.post('/orders', protect, requireRole('pharmacy'), createOrder);
 *   router.get('/admin/x', protect, requireRole('mcaz'), someHandler);
 *   router.get('/shared', protect, requireRole('pharmacy','wholesaler'), handler);
 */

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires role: ${allowedRoles.join(' or ')}.`,
      });
    }
    next();
  };
}

module.exports = { requireRole };
