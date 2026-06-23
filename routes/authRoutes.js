const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, mcazOnly } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} = require('../utils/validator');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getPendingUsers,
  getAllUsers,
  approveUser,
  rejectUser,
  deactivateUser,
  getMe,
} = require('../controllers/authController');

const upload = multer({ dest: 'public/uploads/' });

// ===== PUBLIC ROUTES =====
router.post('/register', upload.fields([{ name: 'mcazLicense' }, { name: 'idDocument' }]), registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.put('/reset-password/:token', resetPasswordValidation, resetPassword);

// ===== PROTECTED ROUTES =====
router.get('/me', protect, getMe);

// ===== ADMIN ROUTES (MCAZ only) =====
router.get('/admin/pending-users', protect, mcazOnly, getPendingUsers);
router.get('/admin/all-users', protect, mcazOnly, getAllUsers);
router.patch('/admin/approve/:userId', protect, mcazOnly, approveUser);
router.patch('/admin/reject/:userId', protect, mcazOnly, rejectUser);
router.patch('/admin/deactivate/:userId', protect, mcazOnly, deactivateUser);

module.exports = router;