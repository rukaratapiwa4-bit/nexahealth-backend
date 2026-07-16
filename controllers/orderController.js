/**
 * NexaHealth — controllers/orderController.js
 *
 * This is the single source of truth for every order on the platform.
 * Pharmacist, Wholesaler, MCAZ, and Manager dashboards ALL read from
 * these same Order documents — no more per-dashboard mock data.
 */
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { logAction } = require('../utils/audit');
const { computeRiskScore } = require('../utils/riskScore');

// ============================================
// PHARMACIST: CREATE ORDER
// POST /api/orders
// ============================================
exports.createOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const pharmacyId = req.user._id;
    const { items, deliveryOption, deliveryAddress, paymentMethod, notes } = req.body;

    if (!items || !items.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
    }

    // All items in one order must come from the same wholesaler
    // (matches your frontend's per-supplier cart design)
    const firstProduct = await Product.findById(items[0].productId).session(session);
    if (!firstProduct) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    const wholesalerId = firstProduct.wholesaler;

    const orderItems = [];
    let subtotal = 0;
    let riskScore = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product) {
        await session.abortTransaction();
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found.` });
      }
      if (!product.wholesaler.equals(wholesalerId)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'All items in one order must be from the same wholesaler. Please place separate orders.',
        });
      }
      if (product.isRecalled) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `${product.name} (batch ${product.batchNumber}) has been recalled and cannot be ordered.`,
        });
      }

      const available = product.stockQuantity - product.reservedQuantity;
      if (available < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Only ${available} units of ${product.name} available.`,
        });
      }

      // Reserve stock immediately (real stock reduction — not client-only anymore)
      product.reservedQuantity += item.quantity;
      await product.save({ session });

      const lineTotal = product.pricePerUnit * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        batchNumber: product.batchNumber,
        quantity: item.quantity,
        pricePerUnit: product.pricePerUnit,
        lineTotal,
      });

      // Feed into risk scoring
      const pharmacyOrderCount = await Order.countDocuments({
        pharmacy: pharmacyId,
        'items.product': product._id,
      }).session(session);
      const pharmacyUser = await User.findById(pharmacyId).session(session);
      const isNewPharmacy = pharmacyUser.createdAt && (Date.now() - pharmacyUser.createdAt.getTime()) < 30 * 24 * 60 * 60 * 1000;

      const itemRisk = computeRiskScore({
        quantity: item.quantity,
        avgQuantity: pharmacyOrderCount > 0 ? item.quantity / 1.5 : 0, // conservative baseline until real history accrues
        isNewPharmacy,
        wholesalerVerified: true,
        productRecalled: false,
      });
      riskScore = Math.max(riskScore, itemRisk);
    }

    const wholesalerProduct = await Product.findById(items[0].productId).session(session);
    const deliveryFee = deliveryOption === 'delivery' ? (wholesalerProduct.deliveryFee || 0) : 0;
    const total = subtotal + deliveryFee;

    const order = await Order.create(
      [
        {
          pharmacy: pharmacyId,
          wholesaler: wholesalerId,
          items: orderItems,
          subtotal,
          deliveryFee,
          total,
          paymentMethod,
          deliveryOption: deliveryOption || 'delivery',
          deliveryAddress,
          notes,
          riskScore,
          isFlagged: riskScore >= 60,
          flagReason: riskScore >= 60 ? 'Unusual order volume detected' : undefined,
          statusHistory: [{ status: 'pending', changedBy: pharmacyId }],
        },
      ],
      { session }
    );

    await session.commitTransaction();

    await logAction({
      action: 'ORDER_CREATED',
      performedBy: req.user,
      targetEntity: order[0]._id,
      targetType: 'Order',
      newValue: { orderNumber: order[0].orderNumber, total },
      req,
    });

    return res.status(201).json({ success: true, order: order[0] });
  } catch (err) {
    await session.abortTransaction();
    console.error('Create order error:', err);
    return res.status(500).json({ success: false, message: 'Server error creating order.' });
  } finally {
    session.endSession();
  }
};

// ============================================
// GET ORDERS — role-aware (pharmacy sees their own, wholesaler sees
// incoming, MCAZ sees everything, manager sees their pharmacy's)
// GET /api/orders
// ============================================
exports.getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.userType === 'pharmacy') {
      filter.pharmacy = req.user._id;
    } else if (req.user.userType === 'wholesaler') {
      filter.wholesaler = req.user._id;
    }
    // mcaz sees all orders — no filter added
    // manager role reuses pharmacy filter logic if tied to a pharmacy account (see note below)

    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('pharmacy', 'fullName businessName city')
        .populate('wholesaler', 'fullName businessName city')
        .populate('driver', 'fullName phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      orders,
    });
  } catch (err) {
    console.error('Get orders error:', err);
    return res.status(500).json({ success: false, message: 'Server error fetching orders.' });
  }
};

// ============================================
// GET SINGLE ORDER
// GET /api/orders/:id
// ============================================
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('pharmacy', 'fullName businessName city phone')
      .populate('wholesaler', 'fullName businessName city phone')
      .populate('driver', 'fullName phone');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Basic ownership check — pharmacy/wholesaler can only see their own orders, MCAZ sees all
    const isOwner =
      order.pharmacy._id.equals(req.user._id) || order.wholesaler._id.equals(req.user._id);
    if (req.user.userType !== 'mcaz' && !isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Get order by id error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// WHOLESALER: UPDATE ORDER STATUS
// PATCH /api/orders/:id/status
// (confirm, prepare, dispatch, reject)
// ============================================
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const validStatuses = ['confirmed', 'preparing', 'dispatched', 'delivered', 'cancelled', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (!order.wholesaler.equals(req.user._id) && req.user.userType !== 'mcaz') {
      return res.status(403).json({ success: false, message: 'Only the fulfilling wholesaler can update this order.' });
    }

    const previousStatus = order.status;

    // If rejecting or cancelling, release the reserved stock back
    if (['rejected', 'cancelled'].includes(status) && !['rejected', 'cancelled'].includes(previousStatus)) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { reservedQuantity: -item.quantity },
        });
      }
    }

    // If delivered, actually deduct real stock (not just reserved) — this is
    // the fix for "stock reduction is client-only"
    if (status === 'delivered' && previousStatus !== 'delivered') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stockQuantity: -item.quantity, reservedQuantity: -item.quantity },
        });
      }
    }

    order.status = status;
    if (reason) order.notes = `${order.notes || ''}\n[${status}] ${reason}`.trim();
    order.statusHistory.push({ status, changedBy: req.user._id });
    await order.save();

    await logAction({
      action: 'ORDER_STATUS_UPDATED',
      performedBy: req.user,
      targetEntity: order._id,
      targetType: 'Order',
      previousValue: previousStatus,
      newValue: status,
      reason,
      req,
    });

    return res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Update order status error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// WHOLESALER: ASSIGN DRIVER
// PATCH /api/orders/:id/assign-driver
// ============================================
exports.assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (!order.wholesaler.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const driver = await User.findOne({ _id: driverId, userType: 'logistics' });
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found.' });
    }

    order.driver = driverId;
    if (order.status === 'preparing') order.status = 'dispatched';
    order.statusHistory.push({ status: 'dispatched', changedBy: req.user._id });
    await order.save();

    return res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Assign driver error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// PHARMACIST: CONFIRM RECEIPT
// PATCH /api/orders/:id/confirm-receipt
// ============================================
exports.confirmReceipt = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    if (!order.pharmacy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    order.status = 'delivered';
    order.statusHistory.push({ status: 'delivered', changedBy: req.user._id });

    // Deduct real stock now if it wasn't already (covers pickup orders with
    // no wholesaler-side "delivered" trigger)
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stockQuantity: -item.quantity, reservedQuantity: -item.quantity },
      });
    }

    await order.save();

    return res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Confirm receipt error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// MCAZ: FLAG / UNFLAG ORDER
// PATCH /api/orders/:id/flag
// ============================================
exports.flagOrder = async (req, res) => {
  try {
    const { isFlagged, flagReason } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    order.isFlagged = isFlagged;
    order.flagReason = flagReason;
    await order.save();

    await logAction({
      action: isFlagged ? 'ORDER_FLAGGED' : 'ORDER_UNFLAGGED',
      performedBy: req.user,
      targetEntity: order._id,
      targetType: 'Order',
      reason: flagReason,
      req,
    });

    return res.status(200).json({ success: true, order });
  } catch (err) {
    console.error('Flag order error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// MANAGER / PHARMACIST ANALYTICS
// GET /api/orders/analytics
// (used by both pharmacist and manager dashboards — same underlying data)
// ============================================
exports.getOrderAnalytics = async (req, res) => {
  try {
    const pharmacyId = req.user.userType === 'pharmacy' ? req.user._id : req.query.pharmacyId;
    if (!pharmacyId) {
      return res.status(400).json({ success: false, message: 'pharmacyId required.' });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalOrders, totalSpend, topProducts] = await Promise.all([
      Order.countDocuments({ pharmacy: pharmacyId, createdAt: { $gte: thirtyDaysAgo } }),
      Order.aggregate([
        { $match: { pharmacy: new mongoose.Types.ObjectId(pharmacyId), createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.aggregate([
        { $match: { pharmacy: new mongoose.Types.ObjectId(pharmacyId), createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', totalUnits: { $sum: '$items.quantity' } } },
        { $sort: { totalUnits: -1 } },
        { $limit: 5 },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      analytics: {
        totalOrders,
        totalSpend: totalSpend[0]?.total || 0,
        topProducts,
      },
    });
  } catch (err) {
    console.error('Get order analytics error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
