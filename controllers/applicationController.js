/**
 * NexaHealth — controllers/applicationController.js
 *
 * Pharmacist applies to trade with a wholesaler. Wholesaler sees it in
 * their "Incoming Applications" inbox and approves/rejects. Approval
 * is the gate that unlocks the chat Conversation between them.
 */
const Application = require('../models/Application');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { logAction } = require('../utils/audit');

// ============================================
// PHARMACIST: SUBMIT APPLICATION TO A WHOLESALER
// POST /api/applications
// ============================================
exports.createApplication = async (req, res) => {
  try {
    const { wholesalerId, message } = req.body;

    if (!wholesalerId) {
      return res.status(400).json({ success: false, message: 'wholesalerId is required.' });
    }

    const wholesaler = await User.findOne({ _id: wholesalerId, userType: 'wholesaler' });
    if (!wholesaler) {
      return res.status(404).json({ success: false, message: 'Wholesaler not found.' });
    }

    const existing = await Application.findOne({
      pharmacy: req.user._id,
      wholesaler: wholesalerId,
    });

    if (existing) {
      if (existing.status === 'approved') {
        return res.status(409).json({ success: false, message: 'You are already connected with this wholesaler.' });
      }
      if (existing.status === 'pending') {
        return res.status(409).json({ success: false, message: 'You already have a pending application with this wholesaler.' });
      }
      // Was rejected before — allow re-applying by resetting it
      existing.status = 'pending';
      existing.message = message;
      existing.rejectionReason = undefined;
      existing.respondedAt = undefined;
      await existing.save();

      return res.status(200).json({ success: true, application: existing, message: 'Application re-submitted.' });
    }

    const application = await Application.create({
      pharmacy: req.user._id,
      wholesaler: wholesalerId,
      message,
    });

    await logAction({
      action: 'APPLICATION_SUBMITTED',
      performedBy: req.user,
      targetEntity: application._id,
      targetType: 'Application',
      newValue: { wholesalerId },
      req,
    });

    return res.status(201).json({ success: true, application });
  } catch (err) {
    console.error('Create application error:', err);
    return res.status(500).json({ success: false, message: 'Server error creating application.' });
  }
};

// ============================================
// WHOLESALER: VIEW INCOMING APPLICATIONS
// GET /api/applications/incoming
// ============================================
exports.getIncomingApplications = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const applications = await Application.find({
      wholesaler: req.user._id,
      ...(status !== 'all' && { status }),
    })
      .populate('pharmacy', 'fullName businessName city phone email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: applications.length, applications });
  } catch (err) {
    console.error('Get incoming applications error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// PHARMACIST: VIEW MY OWN APPLICATIONS
// GET /api/applications/mine
// ============================================
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ pharmacy: req.user._id })
      .populate('wholesaler', 'fullName businessName city phone')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: applications.length, applications });
  } catch (err) {
    console.error('Get my applications error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// WHOLESALER: APPROVE APPLICATION
// PATCH /api/applications/:id/approve
// ➜ Automatically creates the Conversation thread (chat unlock)
// ============================================
exports.approveApplication = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    if (!application.wholesaler.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    if (application.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Application already approved.' });
    }

    application.status = 'approved';
    application.respondedAt = new Date();
    await application.save();

    // Create (or find existing) Conversation thread — this is the chat unlock
    let conversation = await Conversation.findOne({
      pharmacy: application.pharmacy,
      wholesaler: application.wholesaler,
    });

    if (!conversation) {
      const firebasePath = `chats/${application.pharmacy}_${application.wholesaler}`;
      conversation = await Conversation.create({
        pharmacy: application.pharmacy,
        wholesaler: application.wholesaler,
        firebasePath,
      });
    }

    await logAction({
      action: 'APPLICATION_APPROVED',
      performedBy: req.user,
      targetEntity: application._id,
      targetType: 'Application',
      req,
    });

    return res.status(200).json({
      success: true,
      application,
      conversation,
      message: 'Application approved. Chat thread is now open.',
    });
  } catch (err) {
    console.error('Approve application error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// WHOLESALER: REJECT APPLICATION
// PATCH /api/applications/:id/reject
// ============================================
exports.rejectApplication = async (req, res) => {
  try {
    const { reason } = req.body;

    const application = await Application.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }
    if (!application.wholesaler.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    application.status = 'rejected';
    application.rejectionReason = reason;
    application.respondedAt = new Date();
    await application.save();

    await logAction({
      action: 'APPLICATION_REJECTED',
      performedBy: req.user,
      targetEntity: application._id,
      targetType: 'Application',
      reason,
      req,
    });

    return res.status(200).json({ success: true, application });
  } catch (err) {
    console.error('Reject application error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// GET SINGLE APPLICATION (either party can view their own)
// GET /api/applications/:id
// ============================================
exports.getApplicationById = async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('pharmacy', 'fullName businessName city phone email')
      .populate('wholesaler', 'fullName businessName city phone email');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const isParty =
      application.pharmacy._id.equals(req.user._id) || application.wholesaler._id.equals(req.user._id);
    if (!isParty && req.user.userType !== 'mcaz') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.status(200).json({ success: true, application });
  } catch (err) {
    console.error('Get application by id error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
