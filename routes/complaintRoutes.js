/**
 * NexaHealth — routes/complaintRoutes.js
 * Mount in server.js with: app.use('/api/complaints', complaintRoutes);
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createComplaint, getComplaints, getComplaintById,
  assignInspector, addCommunicationLog, resolveComplaint,
} = require('../controllers/complaintController');
const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

router.post(
  '/',
  protect,
  [
    body('aboutEntity').notEmpty().withMessage('aboutEntity is required.'),
    body('category').notEmpty().withMessage('category is required.'),
    body('description').notEmpty().withMessage('description is required.'),
  ],
  createComplaint
);

router.get('/', protect, requireRole('mcaz'), getComplaints);
router.get('/:id', protect, requireRole('mcaz'), getComplaintById);

router.patch(
  '/:id/assign',
  protect,
  requireRole('mcaz'),
  [body('inspectorId').notEmpty().withMessage('inspectorId is required.')],
  assignInspector
);
router.post(
  '/:id/log',
  protect,
  requireRole('mcaz'),
  [body('message').notEmpty().withMessage('message is required.')],
  addCommunicationLog
);
router.patch('/:id/resolve', protect, requireRole('mcaz'), resolveComplaint);

module.exports = router;
