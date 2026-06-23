const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const {
  sendWelcomeEmail,
  sendResetEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendDeactivationEmail,
} = require('../utils/email');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const checkValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  return null;
};

// ============================================
// REGISTER – with reactivation
// ============================================
exports.register = async (req, res) => {
  const invalid = checkValidation(req, res);
  if (invalid) return;

  try {
    const {
      userType, fullName, email, phone, businessName,
      password, country, city, address, termsAccepted, privacyAccepted,
    } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });

    if (existingUser) {
      if (!existingUser.isActive) {
        existingUser.isActive = true;
        existingUser.isApproved = false;
        existingUser.fullName = fullName.trim();
        existingUser.phone = phone.trim();
        existingUser.businessName = businessName.trim();
        existingUser.country = (country || '').trim();
        existingUser.city = city.trim();
        existingUser.address = address.trim();
        existingUser.termsAccepted = termsAccepted === 'true' || termsAccepted === true;
        existingUser.privacyAccepted = privacyAccepted === 'true' || privacyAccepted === true;
        existingUser.userType = userType;
        if (req.files?.mcazLicense) existingUser.mcazLicense = req.files.mcazLicense[0].path;
        if (req.files?.idDocument) existingUser.idDocument = req.files.idDocument[0].path;
        await existingUser.save();

        sendWelcomeEmail(existingUser.email, existingUser.fullName).catch((err) =>
          console.error('Welcome email error:', err.message)
        );

        return res.status(201).json({
          success: true,
          message: 'Account reactivated! Your account is pending approval.',
        });
      }
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const mcazLicense = req.files?.mcazLicense ? req.files.mcazLicense[0].path : null;
    const idDocument  = req.files?.idDocument  ? req.files.idDocument[0].path  : null;

    const user = await User.create({
      userType,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      businessName: businessName.trim(),
      password,
      country: (country || '').trim(),
      city: city.trim(),
      address: address.trim(),
      mcazLicense,
      idDocument,
      termsAccepted: termsAccepted === 'true' || termsAccepted === true,
      privacyAccepted: privacyAccepted === 'true' || privacyAccepted === true,
      isApproved: false,
      isActive: true,
    });

    sendWelcomeEmail(user.email, user.fullName).catch((err) =>
      console.error('Welcome email error:', err.message)
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Your account is pending approval.',
    });
  } catch (err) {
    console.error('Register error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email already exists.' });
    }
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ============================================
// LOGIN
// ============================================
exports.login = async (req, res) => {
  const invalid = checkValidation(req, res);
  if (invalid) return;

  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated. Please contact support.' });
    }

    if (!user.isApproved) {
      return res.status(403).json({
        success: false,
        pending: true,
        message: 'Account pending approval. You will be notified via email once approved.',
      });
    }

    const token = signToken(user._id);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        userType: user.userType,
        businessName: user.businessName,
        isApproved: user.isApproved,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ============================================
// FORGOT PASSWORD
// ============================================
exports.forgotPassword = async (req, res) => {
  const invalid = checkValidation(req, res);
  if (invalid) return;

  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a reset link has been sent.',
      });
    }

    const rawToken = user.generateResetToken();
    await user.save({ validateBeforeSave: false });

    sendResetEmail(user.email, user.fullName, rawToken).catch((err) =>
      console.error('Reset email error:', err.message)
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email. It expires in 10 minutes.',
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ============================================
// RESET PASSWORD
// ============================================
exports.resetPassword = async (req, res) => {
  const invalid = checkValidation(req, res);
  if (invalid) return;

  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is invalid or has expired. Please request a new one.',
      });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset successful! You can now log in.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ============================================
// ADMIN: GET PENDING USERS
// ============================================
exports.getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({ isApproved: false, isActive: true })
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    console.error('Get pending users error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// ADMIN: GET ALL USERS
// ============================================
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, count: users.length, users });
  } catch (err) {
    console.error('Get all users error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// ADMIN: APPROVE USER – FIXED WITH EXTRA LOGS
// ============================================
exports.approveUser = async (req, res) => {
  const invalid = checkValidation(req, res);
  if (invalid) return;

  try {
    const userId = req.params.userId;
    console.log(`🔍 Approving user with ID: ${userId}`);

    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ User with ID ${userId} not found.`);
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    console.log(`👤 User found: ${user.fullName} (${user.email})`);

    if (user.isApproved) {
      return res.status(400).json({ success: false, message: 'User is already approved.' });
    }

    user.isApproved = true;
    user.isActive = true;
    await user.save();

    // ===== SEND APPROVAL EMAIL TO THE USER'S EMAIL =====
    console.log(`📧 Sending approval email to: ${user.email}`);
    sendApprovalEmail(user.email, user.fullName)
      .then(() => console.log(`✅ Approval email sent successfully to ${user.email}`))
      .catch(err => console.error('❌ Approval email error:', err.message));

    return res.status(200).json({
      success: true,
      message: `${user.fullName}'s account has been approved and they have been notified.`,
    });
  } catch (err) {
    console.error('Approve user error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// ADMIN: REJECT USER
// ============================================
exports.rejectUser = async (req, res) => {
  const invalid = checkValidation(req, res);
  if (invalid) return;

  try {
    const { reason } = req.body;

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.isActive = false;
    user.rejectionReason = reason;
    await user.save();

    sendRejectionEmail(user.email, user.fullName, reason)
      .catch(err => console.error('Rejection email error:', err.message));

    return res.status(200).json({
      success: true,
      message: `${user.fullName}'s account has been rejected and they have been notified.`,
    });
  } catch (err) {
    console.error('Reject user error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// ADMIN: DEACTIVATE USER
// ============================================
exports.deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'User is already deactivated.',
      });
    }

    user.isActive = false;
    user.isApproved = false;
    await user.save();

    console.log(`📧 Sending deactivation email to: ${user.email}`);
    sendDeactivationEmail(user.email, user.fullName)
      .catch(err => console.error('Deactivation email error:', err.message));

    res.status(200).json({
      success: true,
      message: `User ${user.fullName} has been deactivated. They can now re-register.`,
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// ============================================
// GET CURRENT USER (me)
// ============================================
exports.getMe = async (req, res) => {
  try {
    return res.status(200).json({ success: true, user: req.user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};