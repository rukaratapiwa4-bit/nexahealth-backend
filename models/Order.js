/**
 * NexaHealth — models/Order.js
 * The core transaction record. Every dashboard (pharmacist, wholesaler,
 * MCAZ, manager, driver) reads from THIS single collection — no more
 * separate mocks per dashboard.
 */
const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, // snapshot at time of order
    batchNumber: { type: String, required: true },
    quantity: { type: Number, required: true },
    pricePerUnit: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true }, // e.g. NXH-2026-000482
    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wholesaler: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    items: [OrderItemSchema],
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },

    paymentMethod: {
      type: String,
      enum: ['ecocash', 'onemoney', 'telecash', 'zipit', 'mukuru', 'bank', 'card', 'pay_on_delivery'],
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded'],
      default: 'unpaid',
    },
    paymentReference: { type: String }, // gateway transaction ID once wired

    deliveryOption: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
    deliveryAddress: { type: String },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // assigned once dispatched

    status: {
      type: String,
      enum: [
        'pending',       // just placed, awaiting wholesaler confirmation
        'confirmed',     // wholesaler accepted
        'preparing',     // being packed
        'dispatched',    // driver has it, en route
        'delivered',     // arrived
        'cancelled',
        'rejected',
      ],
      default: 'pending',
      index: true,
    },

    // Regulatory visibility — MCAZ reads straight off this flag/array,
    // no separate mock needed
    riskScore: { type: Number, default: 0 }, // 0-100, computed on save
    isFlagged: { type: Boolean, default: false },
    flagReason: { type: String },

    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    notes: { type: String },
  },
  { timestamps: true }
);

OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ pharmacy: 1, status: 1 });
OrderSchema.index({ wholesaler: 1, status: 1 });

// Auto-generate order number before saving if not set
OrderSchema.pre('validate', async function (next) {
  if (!this.orderNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `NXH-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
