/**
 * NexaHealth — routes/applicationRoutes.js
 * Mount in server.js with: app.use('/api/applications', applicationRoutes);
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  createApplication,
  getIncomingApplications,
  getMyApplications,
  approveApplication,
  rejectApplication,
  getApplicationById,
} = require('../controllers/applicationController');

const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

// ─────────────────────────────────────────────
// PHARMACIST: submit an application to a wholesaler
// ─────────────────────────────────────────────
router.post(
  '/',
  protect,
  requireRole('pharmacy'),
  [body('wholesalerId').notEmpty().withMessage('wholesalerId is required.')],
  createApplication
);

// ─────────────────────────────────────────────
// WHOLESALER: view incoming applications inbox
// ?status=pending (default) | approved | rejected | all
// ─────────────────────────────────────────────
router.get('/incoming', protect, requireRole('wholesaler'), getIncomingApplications);

// PHARMACIST: view my own submitted applications
router.get('/mine', protect, requireRole('pharmacy'), getMyApplications);

// Single application detail
router.get('/:id', protect, getApplicationById);

// ─────────────────────────────────────────────
// WHOLESALER: approve → unlocks chat Conversation automatically
// ─────────────────────────────────────────────
router.patch('/:id/approve', protect, requireRole('wholesaler'), approveApplication);

// WHOLESALER: reject
router.patch(
  '/:id/reject',
  protect,
  requireRole('wholesaler'),
  [body('reason').notEmpty().withMessage('reason is required.')],
  rejectApplication
);

module.exports = router;
