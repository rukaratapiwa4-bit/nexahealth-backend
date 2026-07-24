/**
 * NexaHealth — controllers/inspectionController.js
 * MCAZ inspection scheduling, digital forms, scoring, corrective actions.
 */
const Inspection = require('../models/Inspection');
const { logAction } = require('../utils/audit');

// ============================================
// MCAZ: SCHEDULE AN INSPECTION
// POST /api/inspections
// ============================================
exports.scheduleInspection = async (req, res) => {
  try {
    const { entityId, inspectorId, type, scheduledDate } = req.body;

    if (!entityId || !scheduledDate) {
      return res.status(400).json({ success: false, message: 'entityId and scheduledDate are required.' });
    }

    const inspection = await Inspection.create({
      entity: entityId,
      inspector: inspectorId || req.user._id,
      type: type || 'routine',
      scheduledDate,
      status: 'scheduled',
    });

    await logAction({
      action: 'INSPECTION_SCHEDULED',
      performedBy: req.user,
      targetEntity: inspection._id,
      targetType: 'Inspection',
      newValue: { entityId, scheduledDate, type },
      req,
    });

    return res.status(201).json({ success: true, inspection });
  } catch (err) {
    console.error('Schedule inspection error:', err);
    return res.status(500).json({ success: false, message: 'Server error scheduling inspection.' });
  }
};

// ============================================
// GET ALL INSPECTIONS (MCAZ sees all; entity sees their own)
// GET /api/inspections
// ============================================
exports.getInspections = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (['pharmacy', 'wholesaler'].includes(req.user.userType)) filter.entity = req.user._id;

    const inspections = await Inspection.find(filter)
      .populate('entity', 'businessName fullName')
      .populate('inspector', 'fullName')
      .sort({ scheduledDate: -1 });

    return res.status(200).json({ success: true, count: inspections.length, inspections });
  } catch (err) {
    console.error('Get inspections error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// GET SINGLE INSPECTION
// GET /api/inspections/:id
// ============================================
exports.getInspectionById = async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id)
      .populate('entity', 'businessName fullName city')
      .populate('inspector', 'fullName');

    if (!inspection) return res.status(404).json({ success: false, message: 'Inspection not found.' });

    return res.status(200).json({ success: true, inspection });
  } catch (err) {
    console.error('Get inspection by id error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// MCAZ: SUBMIT COMPLETED INSPECTION (digital form)
// PATCH /api/inspections/:id/complete
// ============================================
exports.completeInspection = async (req, res) => {
  try {
    const {
      score, findings, violations, correctiveActions,
      correctiveDeadline, photoEvidence, gpsLocation, digitalSignature,
    } = req.body;

    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) return res.status(404).json({ success: false, message: 'Inspection not found.' });

    inspection.status = 'completed';
    inspection.completedDate = new Date();
    if (score !== undefined) inspection.score = score;
    if (findings) inspection.findings = findings;
    if (violations !== undefined) inspection.violations = violations;
    if (correctiveActions) inspection.correctiveActions = correctiveActions;
    if (correctiveDeadline) inspection.correctiveDeadline = correctiveDeadline;
    if (photoEvidence) inspection.photoEvidence = photoEvidence;
    if (gpsLocation) inspection.gpsLocation = gpsLocation;
    if (digitalSignature) inspection.digitalSignature = digitalSignature;

    await inspection.save();

    await logAction({
      action: 'INSPECTION_COMPLETED',
      performedBy: req.user,
      targetEntity: inspection._id,
      targetType: 'Inspection',
      newValue: { score, violations },
      req,
    });

    return res.status(200).json({ success: true, inspection });
  } catch (err) {
    console.error('Complete inspection error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// MCAZ: MARK OVERDUE / CANCEL
// PATCH /api/inspections/:id/status
// ============================================
exports.updateInspectionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const inspection = await Inspection.findById(req.params.id);
    if (!inspection) return res.status(404).json({ success: false, message: 'Inspection not found.' });

    inspection.status = status;
    await inspection.save();

    return res.status(200).json({ success: true, inspection });
  } catch (err) {
    console.error('Update inspection status error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
