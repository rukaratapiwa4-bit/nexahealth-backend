/**
 * NexaHealth — routes/inspectionRoutes.js
 * Mount in server.js with: app.use('/api/inspections', inspectionRoutes);
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  scheduleInspection, getInspections, getInspectionById,
  completeInspection, updateInspectionStatus,
} = require('../controllers/inspectionController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

router.post(
  '/',
  protect,
  requireRole('mcaz'),
  [
    body('entityId').notEmpty().withMessage('entityId is required.'),
    body('scheduledDate').notEmpty().withMessage('scheduledDate is required.'),
  ],
  scheduleInspection
);

router.get('/', protect, getInspections);
router.get('/:id', protect, getInspectionById);

router.patch('/:id/complete', protect, requireRole('mcaz'), completeInspection);
router.patch(
  '/:id/status',
  protect,
  requireRole('mcaz'),
  [body('status').notEmpty().withMessage('status is required.')],
  updateInspectionStatus
);

module.exports = router;
