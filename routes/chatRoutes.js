/**
 * NexaHealth — routes/chatRoutes.js
 * Mount in server.js with: app.use('/api/chat', chatRoutes);
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  getConversations,
  getConversationById,
  sendMessage,
  getMessages,
  markAsRead,
} = require('../controllers/chatController');

const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

// Thread list — role-aware (pharmacy sees theirs, wholesaler sees theirs)
router.get('/conversations', protect, requireRole('pharmacy', 'wholesaler'), getConversations);

// Single conversation detail (includes firebasePath for client-side subscribe)
router.get('/conversations/:id', protect, requireRole('pharmacy', 'wholesaler'), getConversationById);

// Message history (fallback / initial load before client subscribes to Firebase)
router.get('/conversations/:id/messages', protect, requireRole('pharmacy', 'wholesaler'), getMessages);

// Send a message
router.post(
  '/conversations/:id/messages',
  protect,
  requireRole('pharmacy', 'wholesaler'),
  [body('text').notEmpty().withMessage('text is required.')],
  sendMessage
);

// Mark conversation as read (clears unread badge)
router.patch('/conversations/:id/read', protect, requireRole('pharmacy', 'wholesaler'), markAsRead);

module.exports = router;
