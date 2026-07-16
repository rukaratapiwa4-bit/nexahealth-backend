/**
 * NexaHealth — routes/orderRoutes.js
 * Mount this in server.js with: app.use('/api/orders', orderRoutes);
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  assignDriver,
  confirmReceipt,
  flagOrder,
  getOrderAnalytics,
} = require('../controllers/orderController');

const { protect } = require('../middleware/auth');       // your existing JWT middleware
const { requireRole } = require('../middleware/roleCheck'); // new — from this batch

// ─────────────────────────────────────────────
// PHARMACIST: create a new order
// ─────────────────────────────────────────────
router.post(
  '/',
  protect,
  requireRole('pharmacy'),
  [
    body('items').isArray({ min: 1 }).withMessage('Order must contain at least one item.'),
    body('items.*.productId').notEmpty().withMessage('productId required for each item.'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('quantity must be a positive number.'),
    body('deliveryOption').optional().isIn(['delivery', 'pickup']),
    body('paymentMethod').optional().isIn(['ecocash','onemoney','telecash','zipit','mukuru','bank','card','pay_on_delivery']),
  ],
  createOrder
);

// ─────────────────────────────────────────────
// Shared: list orders (role-aware — see controller)
// pharmacy, wholesaler, mcaz can all call this
// ─────────────────────────────────────────────
router.get('/', protect, getOrders);

// Analytics — used by BOTH pharmacist and manager dashboards
router.get('/analytics', protect, requireRole('pharmacy', 'manager', 'mcaz'), getOrderAnalytics);

// Single order detail
router.get('/:id', protect, getOrderById);

// ─────────────────────────────────────────────
// WHOLESALER: update order status (confirm/prepare/dispatch/reject)
// ─────────────────────────────────────────────
router.patch(
  '/:id/status',
  protect,
  requireRole('wholesaler', 'mcaz'),
  [body('status').notEmpty().withMessage('status is required.')],
  updateOrderStatus
);

// WHOLESALER: assign a driver to a dispatched order
router.patch(
  '/:id/assign-driver',
  protect,
  requireRole('wholesaler'),
  [body('driverId').notEmpty().withMessage('driverId is required.')],
  assignDriver
);

// ─────────────────────────────────────────────
// PHARMACIST: confirm they received the delivery
// ─────────────────────────────────────────────
router.patch('/:id/confirm-receipt', protect, requireRole('pharmacy'), confirmReceipt);

// ─────────────────────────────────────────────
// MCAZ: flag/unflag a transaction for investigation
// ─────────────────────────────────────────────
router.patch(
  '/:id/flag',
  protect,
  requireRole('mcaz'),
  [body('isFlagged').isBoolean().withMessage('isFlagged must be true or false.')],
  flagOrder
);

module.exports = router;
