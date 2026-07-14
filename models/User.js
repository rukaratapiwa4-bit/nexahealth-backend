const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    userType: {
      type: String,
      enum: ['pharmacy', 'wholesaler', 'mcaz', 'logistics'],
      required: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    country: { type: String, default: 'Zimbabwe' },
    city: { type: String, required: true },
    address: { type: String, required: true },
    mcazLicense: { type: String },
    idDocument: { type: String },
    isApproved: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    termsAccepted: { type: Boolean, required: true },
    privacyAccepted: { type: Boolean, required: true },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateResetToken = function () {
  const crypto = require('crypto');
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  // ← 3 minutes (changed from 10 minutes)
  this.resetPasswordExpires = Date.now() + 3 * 60 * 1000;
  return rawToken;
};

module.exports = mongoose.model('User', UserSchema);
