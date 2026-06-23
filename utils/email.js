const nodemailer = require('nodemailer');

// ===== BREVO SMTP TRANSPORTER =====
const transporter = nodemailer.createTransporter({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_LOGIN,    // From .env
    pass: process.env.BREVO_SMTP_PASSWORD, // From .env
  },
});

// ============================================
// SEND WELCOME EMAIL
// ============================================
const sendWelcomeEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Welcome to NexaHealth! 🎉',
      html: `
        <h1>Welcome ${name}!</h1>
        <p>Your account has been created successfully.</p>
        <p><strong>Your account is pending approval.</strong></p>
        <p>You will receive an email once approved.</p>
      `,
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
      html: `
        <h1>Hello ${name},</h1>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background:#0088cc;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;">Reset Password</a>
        <p>This link expires in 10 minutes.</p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });
    console.log(`✅ Reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Reset email failed:', error);
    return false;
  }
};

// ============================================
// SEND APPROVAL EMAIL
// ============================================
const sendApprovalEmail = async (email, name) => {
  try {
    await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: '✅ Account Approved!',
      html: `
        <h1>Congratulations ${name}! 🎉</h1>
        <p>Your NexaHealth account has been <strong>approved</strong>.</p>
        <p>You can now log in and start using the platform.</p>
        <br>
        <a href="https://nexahealth-backend.onrender.com" style="background:#0088cc;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;">Log In Now</a>
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
// SEND REJECTION EMAIL
// ============================================
const sendRejectionEmail = async (email, name, reason) => {
  try {
    await transporter.sendMail({
      from: `"NexaHealth" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: '❌ Account Update',
      html: `
        <h1>Hello ${name},</h1>
        <p>We regret to inform you that your NexaHealth account has been <strong>rejected</strong>.</p>
        <p><strong>Reason:</strong> ${reason || 'We could not verify your documents.'}</p>
        <p>Please contact us for more information.</p>
      `,
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
        <p>Your NexaHealth account has been <strong>deactivated</strong> due to:</p>
        <ul>
          <li>Malicious or fraudulent activity</li>
          <li>Incorrect or misleading information</li>
        </ul>
        <p>If you believe this is a mistake, you can <strong>create a new account</strong> with accurate details.</p>
        <br>
        <a href="https://nexahealth-backend.onrender.com" style="background:#0088cc;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;">Create New Account</a>
        <br><br>
        <p>Thank you for understanding.</p>
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