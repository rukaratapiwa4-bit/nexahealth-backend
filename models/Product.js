/**
 * NexaHealth — models/Product.js
 * Master medicine/product catalogue. Every wholesaler lists their own
 * stock entries against these (or their own), pharmacists search across all.
 */
const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema(
  {
    wholesaler: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    category: { type: String, required: true }, // e.g. Antibiotics, Analgesics, ORS
    packSize: { type: String }, // e.g. "100 tablets", "500ml"
    batchNumber: { type: String, required: true },
    expiryDate: { type: Date, required: true },
    manufacturer: { type: String },

    pricePerUnit: { type: Number, required: true },
    promoPrice: { type: Number }, // if on promotion
    isPromo: { type: Boolean, default: false },

    stockQuantity: { type: Number, required: true, default: 0 },
    reservedQuantity: { type: Number, default: 0 }, // held for pending orders
    lowStockThreshold: { type: Number, default: 20 },

    deliveryOption: {
      type: String,
      enum: ['free', 'paid', 'pickup_only'],
      default: 'paid',
    },
    deliveryFee: { type: Number, default: 0 },

    images: [{ type: String }], // Cloudinary URLs

    isActive: { type: Boolean, default: true },
    isRecalled: { type: Boolean, default: false },
    recallReason: { type: String },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text', genericName: 'text', category: 'text' });

// Virtual: is this product currently available to order
ProductSchema.virtual('availableQuantity').get(function () {
  return Math.max(0, this.stockQuantity - this.reservedQuantity);
});

module.exports = mongoose.model('Product', ProductSchema);
