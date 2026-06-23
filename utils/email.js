const SibApiV3Sdk = require('sib-api-v3-sdk');

// ===== BREVO API CLIENT =====
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_SMTP_PASSWORD; // Your API key (starts with xsmtpsib-)

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// ============================================
// SEND WELCOME EMAIL
// ============================================
const sendWelcomeEmail = async (email, name) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_FROM,
      name: 'NexaHealth'
    };
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.subject = 'Welcome to NexaHealth! 🎉';
    sendSmtpEmail.htmlContent = `
      <h1>Welcome ${name}!</h1>
      <p>Your account has been created successfully.</p>
      <p><strong>Your account is pending approval.</strong></p>
      <p>You will receive an email once approved.</p>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
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
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_FROM,
      name: 'NexaHealth'
    };
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.subject = '🔐 Password Reset Request';
    sendSmtpEmail.htmlContent = `
      <h1>Hello ${name},</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background:#0088cc;color:white;padding:12px 30px;text-decoration:none;border-radius:6px;">Reset Password</a>
      <p>This link expires in 10 minutes.</p>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
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
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_FROM,
      name: 'NexaHealth'
    };
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.subject = '✅ Account Approved!';
    sendSmtpEmail.htmlContent = `
      <h1>Congratulations ${name}! 🎉</h1>
      <p>Your NexaHealth account has been <strong>approved</strong>.</p>
      <p>You can now log in: <a href="https://nexahealth-backend.onrender.com">Login</a></p>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
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
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_FROM,
      name: 'NexaHealth'
    };
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.subject = '❌ Account Update';
    sendSmtpEmail.htmlContent = `
      <h1>Hello ${name},</h1>
      <p>We regret to inform you that your NexaHealth account has been <strong>rejected</strong>.</p>
      <p><strong>Reason:</strong> ${reason || 'We could not verify your documents.'}</p>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
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
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = {
      email: process.env.EMAIL_FROM,
      name: 'NexaHealth'
    };
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.subject = '🔒 Account Deactivated';
    sendSmtpEmail.htmlContent = `
      <h1>Hello ${name},</h1>
      <p>Your NexaHealth account has been <strong>deactivated</strong>.</p>
      <p>You can <strong>create a new account</strong> with accurate details.</p>
      <br>
      <a href="https://nexahealth-backend.onrender.com">Create New Account</a>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);
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