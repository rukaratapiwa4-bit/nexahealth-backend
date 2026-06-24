const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ============================================
// SEND APPROVAL EMAIL
// ============================================
const sendApprovalEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '✅ Account Approved!',
      html: `
        <h1>Congratulations ${name}! 🎉</h1>
        <p>Your NexaHealth account has been approved.</p>
        <a href="https://nexahealth-backend.onrender.com">Log in now</a>
      `,
    });
    console.log(`✅ Approval email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Approval email failed:', error.message);
    return false;
  }
};

// ============================================
// SEND WELCOME EMAIL
// ============================================
const sendWelcomeEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to NexaHealth! 🎉',
      html: `<h1>Welcome ${name}!</h1><p>Your account is pending approval.</p>`,
    });
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Welcome email failed:', error.message);
    return false;
  }
};

// ============================================
// SEND RESET EMAIL
// ============================================
const sendResetEmail = async (email, name, resetToken) => {
  try {
    const resetUrl = `https://nexahealth-backend.onrender.com/reset-password/${resetToken}`;
    await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Password Reset Request',
      html: `
        <h1>Hello ${name},</h1>
        <p>Click <a href="${resetUrl}">here</a> to reset your password.</p>
        <p>This link expires in 10 minutes.</p>
      `,
    });
    console.log(`✅ Reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Reset email failed:', error.message);
    return false;
  }
};

// ============================================
// SEND REJECTION EMAIL
// ============================================
const sendRejectionEmail = async (email, name, reason) => {
  try {
    await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '❌ Account Update',
      html: `<h1>Hello ${name},</h1><p>Your account was rejected. Reason: ${reason || 'Could not verify documents.'}</p>`,
    });
    console.log(`✅ Rejection email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Rejection email failed:', error.message);
    return false;
  }
};

// ============================================
// SEND DEACTIVATION EMAIL
// ============================================
const sendDeactivationEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔒 Account Deactivated',
      html: `
        <h1>Hello ${name},</h1>
        <p>Your account has been deactivated.</p>
        <p>You can create a new account with accurate details.</p>
        <a href="https://nexahealth-backend.onrender.com">Create New Account</a>
      `,
    });
    console.log(`✅ Deactivation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Deactivation email failed:', error.message);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendResetEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  sendDeactivationEmail,
};