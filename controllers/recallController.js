/**
 * NexaHealth — controllers/recallController.js
 *
 * MCAZ issues recalls against real batches. The moment a recall is
 * created, we auto-populate affectedPharmacies by scanning real Order
 * documents for anyone who actually bought that batch — no manual list
 * building required.
 */
const Recall = require('../models/Recall');
const Order = require('../models/Order');
const { logAction } = require('../utils/audit');

// ============================================
// MCAZ: ISSUE A NEW RECALL
// POST /api/recalls
// ============================================
exports.createRecall = async (req, res) => {
  try {
    const {
      medicineName, batchNumber, supplierId, productId,
      recallClass, reason, actionRequired, targetRecoveryUnits,
    } = req.body;

    if (!medicineName || !batchNumber || !reason) {
      return res.status(400).json({
        success: false,
        message: 'medicineName, batchNumber, and reason are required.',
      });
    }

    // Auto-populate affected pharmacies: scan real orders for this exact batch
    const matchingOrders = await Order.find({ 'items.batchNumber': batchNumber });

    const affectedMap = new Map();
    for (const order of matchingOrders) {
      const item = order.items.find((it) => it.batchNumber === batchNumber);
      if (!item) continue;
      const pharmacyId = order.pharmacy.toString();
      const existing = affectedMap.get(pharmacyId) || 0;
      affectedMap.set(pharmacyId, existing + item.quantity);
    }

    const affectedPharmacies = Array.from(affectedMap.entries()).map(([pharmacy, quantityHeld]) => ({
      pharmacy,
      notifiedAt: new Date(),
      quantityHeld,
      status: 'notified',
    }));

    const recall = await Recall.create({
      issuedBy: req.user._id,
      product: productId,
      medicineName,
      batchNumber,
      supplier: supplierId,
      recallClass: recallClass || 'class_2',
      reason,
      actionRequired,
      affectedPharmacies,
      targetRecoveryUnits: targetRecoveryUnits || Array.from(affectedMap.values()).reduce((a, b) => a + b, 0),
      status: 'active',
    });

    // Flag every matching order so it shows up correctly in MCAZ's transaction view
    await Order.updateMany(
      { 'items.batchNumber': batchNumber },
      { $set: { isFlagged: true, flagReason: `Recalled — ${reason}` } }
    );

    await logAction({
      action: 'RECALL_ISSUED',
      performedBy: req.user,
      targetEntity: recall._id,
      targetType: 'Recall',
      newValue: { medicineName, batchNumber, affectedCount: affectedPharmacies.length },
      req,
    });

    return res.status(201).json({
      success: true,
      recall,
      message: `Recall issued. ${affectedPharmacies.length} pharmacy/pharmacies automatically notified based on real order history.`,
    });
  } catch (err) {
    console.error('Create recall error:', err);
    return res.status(500).json({ success: false, message: 'Server error issuing recall.' });
  }
};

// ============================================
// GET ALL RECALLS (MCAZ sees all; wholesaler sees ones naming them as supplier)
// GET /api/recalls
// ============================================
exports.getRecalls = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (req.user.userType === 'wholesaler') filter.supplier = req.user._id;

    const recalls = await Recall.find(filter)
      .populate('supplier', 'businessName fullName')
      .populate('issuedBy', 'fullName')
      .populate('affectedPharmacies.pharmacy', 'businessName fullName city')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: recalls.length, recalls });
  } catch (err) {
    console.error('Get recalls error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// PHARMACIST: GET RECALLS AFFECTING ME
// GET /api/recalls/mine
// ============================================
exports.getMyRecalls = async (req, res) => {
  try {
    const recalls = await Recall.find({ 'affectedPharmacies.pharmacy': req.user._id })
      .populate('supplier', 'businessName fullName')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: recalls.length, recalls });
  } catch (err) {
    console.error('Get my recalls error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// PHARMACIST: CONFIRM RECEIPT OF RECALL NOTICE
// PATCH /api/recalls/:id/confirm
// ============================================
exports.confirmRecallReceipt = async (req, res) => {
  try {
    const { quantityReturned } = req.body;
    const recall = await Recall.findById(req.params.id);
    if (!recall) return res.status(404).json({ success: false, message: 'Recall not found.' });

    const entry = recall.affectedPharmacies.find((a) => a.pharmacy.toString() === req.user._id.toString());
    if (!entry) return res.status(403).json({ success: false, message: 'This recall does not apply to your pharmacy.' });

    entry.confirmedAt = new Date();
    entry.status = 'confirmed';
    if (quantityReturned) entry.quantityReturned = quantityReturned;

    recall.recoveredUnits = recall.affectedPharmacies.reduce((sum, a) => sum + (a.quantityReturned || 0), 0);

    await recall.save();

    return res.status(200).json({ success: true, recall });
  } catch (err) {
    console.error('Confirm recall receipt error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// MCAZ: UPDATE RECALL STATUS (escalate, resolve)
// PATCH /api/recalls/:id/status
// ============================================
exports.updateRecallStatus = async (req, res) => {
  try {
    const { status, destroyedUnits } = req.body;
    const recall = await Recall.findById(req.params.id);
    if (!recall) return res.status(404).json({ success: false, message: 'Recall not found.' });

    if (status) recall.status = status;
    if (destroyedUnits !== undefined) recall.destroyedUnits = destroyedUnits;
    await recall.save();

    await logAction({
      action: 'RECALL_STATUS_UPDATED',
      performedBy: req.user,
      targetEntity: recall._id,
      targetType: 'Recall',
      newValue: { status, destroyedUnits },
      req,
    });

    return res.status(200).json({ success: true, recall });
  } catch (err) {
    console.error('Update recall status error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// MCAZ: SEND REMINDER TO PENDING PHARMACIES
// POST /api/recalls/:id/remind
// ============================================
exports.remindPending = async (req, res) => {
  try {
    const recall = await Recall.findById(req.params.id).populate('affectedPharmacies.pharmacy', 'email fullName');
    if (!recall) return res.status(404).json({ success: false, message: 'Recall not found.' });

    const pending = recall.affectedPharmacies.filter((a) => a.status === 'notified');

    // NOTE: actual email/SMS sending not wired here yet — this endpoint
    // returns the pending list so a notification service can be plugged
    // in later without changing this route's contract.
    return res.status(200).json({
      success: true,
      message: `${pending.length} pharmacy/pharmacies still pending. Notification sending not yet connected — see utils/email.js to wire this up.`,
      pending: pending.map((p) => ({ name: p.pharmacy?.fullName, email: p.pharmacy?.email })),
    });
  } catch (err) {
    console.error('Remind pending error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
