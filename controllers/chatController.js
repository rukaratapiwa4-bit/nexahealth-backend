/**
 * NexaHealth — controllers/chatController.js
 *
 * Real messages are stored in Firebase Realtime Database for instant
 * delivery. MongoDB's Conversation model only tracks metadata (who's
 * talking, last message preview, unread counts) so dashboards can list
 * threads without needing a Firebase read for every summary view.
 *
 * IMPORTANT: your frontend should ALSO connect to Firebase directly
 * (client SDK) to listen for new messages in real time — these REST
 * endpoints are for: fetching history on page load, and as a fallback
 * send-path if a client can't reach Firebase directly.
 */
const { getDatabase } = require('../config/firebase');
const Conversation = require('../models/Conversation');

// ============================================
// GET MY CONVERSATIONS (thread list)
// GET /api/chat/conversations
// ============================================
exports.getConversations = async (req, res) => {
  try {
    const filter =
      req.user.userType === 'pharmacy'
        ? { pharmacy: req.user._id }
        : { wholesaler: req.user._id };

    const conversations = await Conversation.find(filter)
      .populate('pharmacy', 'fullName businessName')
      .populate('wholesaler', 'fullName businessName')
      .sort({ lastMessageAt: -1 });

    return res.status(200).json({ success: true, count: conversations.length, conversations });
  } catch (err) {
    console.error('Get conversations error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// GET SINGLE CONVERSATION + its Firebase path
// GET /api/chat/conversations/:id
// (frontend uses the returned firebasePath to subscribe directly to Firebase)
// ============================================
exports.getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('pharmacy', 'fullName businessName phone')
      .populate('wholesaler', 'fullName businessName phone');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isParty =
      conversation.pharmacy._id.equals(req.user._id) || conversation.wholesaler._id.equals(req.user._id);
    if (!isParty) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.status(200).json({ success: true, conversation });
  } catch (err) {
    console.error('Get conversation by id error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// SEND MESSAGE (writes to Firebase + updates Mongo metadata)
// POST /api/chat/conversations/:id/messages
// ============================================
exports.sendMessage = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isPharmacy = conversation.pharmacy.equals(req.user._id);
    const isWholesaler = conversation.wholesaler.equals(req.user._id);
    if (!isPharmacy && !isWholesaler) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const db = getDatabase();
    const messageData = {
      senderId: req.user._id.toString(),
      senderRole: req.user.userType,
      senderName: req.user.fullName,
      text: text.trim(),
      timestamp: Date.now(),
    };

    if (db) {
      // Real-time write — any client subscribed to this path gets it instantly
      await db.ref(`${conversation.firebasePath}/messages`).push(messageData);
    } else {
      console.warn('⚠️ Firebase not configured — message only saved to Mongo metadata, not delivered in real time.');
    }

    // Update conversation metadata for thread-list previews
    conversation.lastMessage = text.trim();
    conversation.lastMessageAt = new Date();
    conversation.lastMessageBy = req.user._id;
    if (isPharmacy) conversation.unreadCountWholesaler += 1;
    if (isWholesaler) conversation.unreadCountPharmacy += 1;
    await conversation.save();

    return res.status(201).json({ success: true, message: messageData });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ success: false, message: 'Server error sending message.' });
  }
};

// ============================================
// GET MESSAGE HISTORY (fallback / initial load)
// GET /api/chat/conversations/:id/messages
// ============================================
exports.getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isParty =
      conversation.pharmacy.equals(req.user._id) || conversation.wholesaler.equals(req.user._id);
    if (!isParty) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const db = getDatabase();
    if (!db) {
      return res.status(200).json({ success: true, messages: [], warning: 'Firebase not configured.' });
    }

    const snapshot = await db.ref(`${conversation.firebasePath}/messages`).orderByChild('timestamp').once('value');
    const messages = [];
    snapshot.forEach((child) => {
      messages.push({ id: child.key, ...child.val() });
    });

    return res.status(200).json({ success: true, count: messages.length, messages });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// MARK CONVERSATION AS READ
// PATCH /api/chat/conversations/:id/read
// ============================================
exports.markAsRead = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    if (conversation.pharmacy.equals(req.user._id)) {
      conversation.unreadCountPharmacy = 0;
    } else if (conversation.wholesaler.equals(req.user._id)) {
      conversation.unreadCountWholesaler = 0;
    } else {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await conversation.save();
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Mark as read error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
