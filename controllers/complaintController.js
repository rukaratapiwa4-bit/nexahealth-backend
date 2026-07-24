/**
 * NexaHealth — controllers/complaintController.js
 * Full complaint investigation workflow: submitted → assigned → investigating → resolved/closed.
 */
const Complaint = require('../models/Complaint');
const { logAction } = require('../utils/audit');

// ============================================
// SUBMIT A COMPLAINT (any authenticated user, or MCAZ logging one on behalf of someone)
// POST /api/complaints
// ============================================
exports.createComplaint = async (req, res) => {
  try {
    const { submitterName, aboutEntity, category, priority, description } = req.body;

    if (!aboutEntity || !category || !description) {
      return res.status(400).json({ success: false, message: 'aboutEntity, category, and description are required.' });
    }

    const complaint = await Complaint.create({
      submittedBy: req.user._id,
      submitterName: submitterName || req.user.fullName,
      aboutEntity,
      category,
      priority: priority || 'medium',
      description,
      status: 'open',
    });

    await logAction({
      action: 'COMPLAINT_SUBMITTED',
      performedBy: req.user,
      targetEntity: complaint._id,
      targetType: 'Complaint',
      newValue: { category, aboutEntity },
      req,
    });

    return res.status(201).json({ success: true, complaint });
  } catch (err) {
    console.error('Create complaint error:', err);
    return res.status(500).json({ success: false, message: 'Server error submitting complaint.' });
  }
};

// ============================================
// MCAZ: GET ALL COMPLAINTS
// GET /api/complaints
// ============================================
exports.getComplaints = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const complaints = await Complaint.find(filter)
      .populate('submittedBy', 'fullName businessName')
      .populate('aboutEntity', 'businessName fullName')
      .populate('assignedInspector', 'fullName')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (err) {
    console.error('Get complaints error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// GET SINGLE COMPLAINT
// GET /api/complaints/:id
// ============================================
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('submittedBy', 'fullName businessName')
      .populate('aboutEntity', 'businessName fullName')
      .populate('assignedInspector', 'fullName')
      .populate('communicationLog.by', 'fullName');

    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    return res.status(200).json({ success: true, complaint });
  } catch (err) {
    console.error('Get complaint by id error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// MCAZ: ASSIGN INSPECTOR
// PATCH /api/complaints/:id/assign
// ============================================
exports.assignInspector = async (req, res) => {
  try {
    const { inspectorId } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    complaint.assignedInspector = inspectorId;
    complaint.status = 'investigating';
    await complaint.save();

    await logAction({
      action: 'COMPLAINT_ASSIGNED',
      performedBy: req.user,
      targetEntity: complaint._id,
      targetType: 'Complaint',
      newValue: { inspectorId },
      req,
    });

    return res.status(200).json({ success: true, complaint });
  } catch (err) {
    console.error('Assign inspector error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// MCAZ: ADD COMMUNICATION LOG ENTRY
// POST /api/complaints/:id/log
// ============================================
exports.addCommunicationLog = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'message is required.' });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    complaint.communicationLog.push({ message, by: req.user._id, at: new Date() });
    await complaint.save();

    return res.status(200).json({ success: true, complaint });
  } catch (err) {
    console.error('Add communication log error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// MCAZ: RESOLVE / CLOSE COMPLAINT
// PATCH /api/complaints/:id/resolve
// ============================================
exports.resolveComplaint = async (req, res) => {
  try {
    const { outcome, status } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found.' });

    complaint.status = status || 'resolved';
    complaint.outcome = outcome;
    complaint.resolvedAt = new Date();
    await complaint.save();

    await logAction({
      action: 'COMPLAINT_RESOLVED',
      performedBy: req.user,
      targetEntity: complaint._id,
      targetType: 'Complaint',
      newValue: { outcome, status: complaint.status },
      req,
    });

    return res.status(200).json({ success: true, complaint });
  } catch (err) {
    console.error('Resolve complaint error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
