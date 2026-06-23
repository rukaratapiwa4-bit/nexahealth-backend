const SibApiV3Sdk = require('sib-api-v3-sdk');

// ===== BREVO API CONFIG =====
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_SMTP_PASSWORD; // Your SMTP key works as API key too

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// ============================================
// SEND APPROVAL EMAIL (TEST WITH THIS FIRST)
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
      <p>Your NexaHealth account has been approved.</p>
      <a href="https://nexahealth-backend.onrender.com">Log in now</a>
    `;

    const result = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Approval email sent to ${email}`);
    console.log('📧 Message ID:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Approval email failed:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response body:', error.response.body);
    }
    return false;
  }
};

// ============================================
// OTHER EMAIL FUNCTIONS (welcome, reset, rejection, deactivation)
// ============================================

const sendWelcomeEmail = async (email, name) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: process.env.EMAIL_FROM, name: 'NexaHealth' };
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.subject = 'Welcome to NexaHealth! 🎉';
    sendSmtpEmail.htmlContent = `<h1>Welcome ${name}!</h1><p>Your account is pending approval.</p>`;
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Welcome email failed:', error.message);
    return false;
  }
};

const sendResetEmail = async (email, name, resetToken) => {
  try {
    const resetUrl = `https://nexahealth-backend.onrender.com/reset-password/${resetToken}`;
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: process.env.EMAIL_FROM, name: 'NexaHealth' };
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.subject = '🔐 Password Reset Request';
    sendSmtpEmail.htmlContent = `<h1>Hello ${name},</h1><p>Click <a href="${resetUrl}">here</a> to reset your password.</p>`;
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Reset email failed:', error.message);
    return false;
  }
};

const sendRejectionEmail = async (email, name, reason) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: process.env.EMAIL_FROM, name: 'NexaHealth' };
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.subject = '❌ Account Update';
    sendSmtpEmail.htmlContent = `<h1>Hello ${name},</h1><p>Your account was rejected. Reason: ${reason || 'Could not verify documents.'}</p>`;
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(`✅ Rejection email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Rejection email failed:', error.message);
    return false;
  }
};

const sendDeactivationEmail = async (email, name) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.sender = { email: process.env.EMAIL_FROM, name: 'NexaHealth' };
    sendSmtpEmail.to = [{ email, name }];
    sendSmtpEmail.subject = '🔒 Account Deactivated';
    sendSmtpEmail.htmlContent = `<h1>Hello ${name},</h1><p>Your account has been deactivated.</p><p>You can create a new account with accurate details.</p><a href="https://nexahealth-backend.onrender.com">Create New Account</a>`;
    await apiInstance.sendTransacEmail(sendSmtpEmail);
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