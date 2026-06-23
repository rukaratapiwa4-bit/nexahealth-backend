const nodemailer = require('nodemailer');

console.log('✅ nodemailer loaded:', typeof nodemailer);
console.log('✅ createTransport exists:', typeof nodemailer.createTransport);

// ===== BREVO SMTP TRANSPORTER =====
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,
    pass: process.env.BREVO_SMTP_PASSWORD,
  },
});

// ============================================
// SEND APPROVAL EMAIL (SIMPLIFIED)
// ============================================
const sendApprovalEmail = async (email, name) => {
  try {
    const info = await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: '✅ Account Approved!',
      html: `
        <h1>Congratulations ${name}! 🎉</h1>
        <p>Your NexaHealth account has been <strong>approved</strong>.</p>
        <p>You can now log in: <a href="https://nexahealth-backend.onrender.com">Login</a></p>
      `,
    });
    console.log(`✅ Approval email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Approval email failed:', error);
    return false;
  }
};

// ============================================
// SEND WELCOME EMAIL
// ============================================
const sendWelcomeEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Welcome to NexaHealth! 🎉',
      html: `<h1>Welcome ${name}!</h1><p>Your account is pending approval.</p>`,
    });
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Welcome email failed:', error);
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
      from: `"NexaHealth" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: '🔐 Password Reset Request',
      html: `<h1>Hello ${name},</h1><p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`,
    });
    console.log(`✅ Reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Reset email failed:', error);
    return false;
  }
};

// ============================================
// SEND REJECTION EMAIL
// ============================================
const sendRejectionEmail = async (email, name, reason) => {
  try {
    await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: '❌ Account Update',
      html: `<h1>Hello ${name},</h1><p>Your account was rejected. Reason: ${reason || 'Could not verify documents.'}</p>`,
    });
    console.log(`✅ Rejection email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Rejection email failed:', error);
    return false;
  }
};

// ============================================
// SEND DEACTIVATION EMAIL
// ============================================
const sendDeactivationEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: '🔒 Account Deactivated',
      html: `
        <h1>Hello ${name},</h1>
        <p>Your account has been <strong>deactivated</strong>.</p>
        <p>You can <strong>create a new account</strong> with accurate details.</p>
        <br>
        <a href="https://nexahealth-backend.onrender.com">Create New Account</a>
      `,
    });
    console.log(`✅ Deactivation email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Deactivation email failed:', error);
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