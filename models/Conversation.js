/**
 * NexaHealth — models/Conversation.js
 * MongoDB stores the conversation metadata + participants.
 * Actual message text lives in Firebase Realtime Database for true
 * real-time delivery (see /config/firebase.js). This document is what
 * lets each dashboard know WHICH threads to subscribe to in Firebase.
 */
const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wholesaler: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Firebase RTDB path where the actual messages live, e.g. "chats/<conversationId>"
    firebasePath: { type: String, required: true },

    lastMessage: { type: String },
    lastMessageAt: { type: Date },
    lastMessageBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    unreadCountPharmacy: { type: Number, default: 0 },
    unreadCountWholesaler: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ConversationSchema.index({ pharmacy: 1, wholesaler: 1 }, { unique: true });

module.exports = mongoose.model('Conversation', ConversationSchema);
