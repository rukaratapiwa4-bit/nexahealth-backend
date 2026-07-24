/**
 * NexaHealth — routes/recallRoutes.js
 * Mount in server.js with: app.use('/api/recalls', recallRoutes);
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createRecall, getRecalls, getMyRecalls,
  confirmRecallReceipt, updateRecallStatus, remindPending,
} = require('../controllers/recallController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

router.post(
  '/',
  protect,
  requireRole('mcaz'),
  [
    body('medicineName').notEmpty().withMessage('medicineName is required.'),
    body('batchNumber').notEmpty().withMessage('batchNumber is required.'),
    body('reason').notEmpty().withMessage('reason is required.'),
  ],
  createRecall
);

router.get('/', protect, requireRole('mcaz', 'wholesaler'), getRecalls);
router.get('/mine', protect, requireRole('pharmacy'), getMyRecalls);

router.patch('/:id/confirm', protect, requireRole('pharmacy'), confirmRecallReceipt);
router.patch('/:id/status', protect, requireRole('mcaz'), updateRecallStatus);
router.post('/:id/remind', protect, requireRole('mcaz'), remindPending);

module.exports = router;
