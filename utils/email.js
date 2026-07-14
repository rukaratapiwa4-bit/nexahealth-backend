/**
 * NexaHealth — utils/email.js
 * Drop-in replacement. Same exports, same function signatures.
 * Only the HTML templates are upgraded to professional branded emails.
 *
 * Required .env variables:
 *   EMAIL_USER=your-gmail@gmail.com
 *   EMAIL_PASS=your-gmail-app-password   ← 16-char App Password, NOT your login password
 *   FRONTEND_URL=https://nexahealth-backend.onrender.com
 */

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM         = `"NexaHealth" <${process.env.EMAIL_USER}>`;
const SITE_URL     = process.env.FRONTEND_URL || 'https://nexahealth-backend.onrender.com';
const PRIMARY      = '#0088cc';
const DARK         = '#0b2b44';

/* ─────────────────────────────────────────────────────────────
   SHARED HTML WRAPPER
   Every email uses this so they all look consistent.
───────────────────────────────────────────────────────────── */
function buildEmail(previewText, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0;mso-table-rspace:0;}
  img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}
  body{margin:0;padding:0;background-color:#f4f7fa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;}
  .wrapper{background-color:#f4f7fa;padding:32px 16px;}
  .card{background:#ffffff;border-radius:16px;max-width:560px;margin:0 auto;overflow:hidden;box-shadow:0 4px 24px rgba(11,43,68,.09);}
  .header{background:${DARK};padding:28px 36px 24px;text-align:center;}
  .logo-mark{display:inline-block;background:linear-gradient(135deg,${PRIMARY},#00b8f0);width:36px;height:36px;border-radius:9px;font-size:16px;font-weight:900;color:#fff;line-height:36px;text-align:center;vertical-align:middle;margin-right:8px;}
  .logo-text{font-size:22px;font-weight:700;color:#ffffff;vertical-align:middle;}
  .logo-text span{color:#00b8f0;}
  .body{padding:36px 36px 28px;}
  .icon-circle{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 22px;font-size:28px;line-height:64px;text-align:center;}
  h1{font-size:22px;font-weight:700;color:${DARK};margin:0 0 10px;text-align:center;}
  .sub{font-size:14.5px;color:#64748b;text-align:center;line-height:1.7;margin:0 0 24px;}
  .info-box{background:#f4f7fa;border-radius:12px;padding:6px 20px;margin:0 0 22px;}
  .info-row{display:flex;padding:10px 0;border-bottom:1px solid #e3e9ef;font-size:13.5px;}
  .info-row:last-child{border-bottom:none;}
  .info-label{color:#64748b;font-weight:600;min-width:110px;}
  .info-value{color:${DARK};font-weight:600;}
  .btn{display:block;background:${PRIMARY};color:#ffffff!important;text-decoration:none;border-radius:12px;padding:15px 28px;font-size:15px;font-weight:700;text-align:center;margin:22px 0 8px;}
  .notice{border-radius:12px;padding:14px 18px;margin:0 0 20px;font-size:13.5px;line-height:1.6;}
  .notice-warn{background:#fffbeb;border:1.5px solid #fbbf24;color:#92400e;}
  .notice-success{background:#ecfdf5;border:1.5px solid #6ee7b7;color:#065f46;}
  .notice-danger{background:#fff1f2;border:1.5px solid #fca5a5;color:#991b1b;}
  .notice-info{background:#eff6ff;border:1.5px solid #93c5fd;color:#1e40af;}
  .divider{border:none;border-top:1px solid #e3e9ef;margin:22px 0;}
  .fallback-url{background:#f4f7fa;border:1.5px dashed #e3e9ef;border-radius:10px;padding:12px 16px;font-size:12px;color:#64748b;word-break:break-all;margin-top:14px;}
  .footer{background:#f4f7fa;padding:20px 36px;text-align:center;}
  .footer p{font-size:12px;color:#94a3b8;margin:3px 0;line-height:1.6;}
  .footer a{color:${PRIMARY};text-decoration:none;}
  @media only screen and (max-width:600px){
    .body{padding:24px 20px 20px!important;}
    h1{font-size:20px!important;}
  }
</style>
</head>
<body>
<div style="display:none;font-size:1px;color:#f4f7fa;line-height:1px;max-height:0;overflow:hidden;">${previewText}</div>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <span class="logo-mark">N</span>
      <span class="logo-text">Nexa<span>Health</span></span>
    </div>
    <div class="body">
      ${bodyHtml}
    </div>
    <div class="footer">
      <p><strong>NexaHealth Zimbabwe</strong> — Connect. Order. Deliver.</p>
      <p><a href="${SITE_URL}">${SITE_URL.replace('https://','')}</a></p>
      <p style="margin-top:10px;font-size:11px;color:#b0bec5;">If you did not request this email, you can safely ignore it.</p>
    </div>
  </div>
</div>
</body>
</html>`;
}

/* ─────────────────────────────────────────────────────────────
   1. WELCOME EMAIL
   Triggered: on successful registration
   Tells user: account created, pending approval, 24-48 hrs
───────────────────────────────────────────────────────────── */
const sendWelcomeEmail = async (email, name, userType = '') => {
  const roleLabels = {
    pharmacy:   'Pharmacy / Hospital',
    wholesaler: 'Wholesaler / Manufacturer',
    mcaz:       'MCAZ / Regulator',
    logistics:  'Logistics / Delivery',
  };

  const body = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="font-size:52px;">🎉</div>
    </div>
    <h1>Welcome to NexaHealth, ${name}!</h1>
    <p class="sub">Your account has been created successfully. Our MCAZ compliance team is now reviewing your details.</p>

    <div class="info-box">
      <div class="info-row" style="display:table;width:100%;">
        <span class="info-label" style="display:table-cell;">Name</span>
        <span class="info-value" style="display:table-cell;">${name}</span>
      </div>
      <div class="info-row" style="display:table;width:100%;">
        <span class="info-label" style="display:table-cell;">Email</span>
        <span class="info-value" style="display:table-cell;">${email}</span>
      </div>
      <div class="info-row" style="display:table;width:100%;">
        <span class="info-label" style="display:table-cell;">Account type</span>
        <span class="info-value" style="display:table-cell;">${roleLabels[userType] || 'NexaHealth Member'}</span>
      </div>
      <div class="info-row" style="display:table;width:100%;">
        <span class="info-label" style="display:table-cell;">Status</span>
        <span class="info-value" style="display:table-cell;color:#f59e0b;">⏳ Pending approval</span>
      </div>
    </div>

    <div class="notice notice-warn">
      <strong>⏳ What happens next?</strong><br>
      Our MCAZ compliance team will verify your submitted documents and business details.
      Once approved (usually <strong>24–48 hours</strong>), you will receive a confirmation email
      and will have full access to NexaHealth.
    </div>

    <a href="${SITE_URL}" class="btn">View my account status →</a>

    <hr class="divider">
    <p style="font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
      Have your MCAZ licence and ID ready. Questions? Simply reply to this email.
    </p>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: '🎉 Welcome to NexaHealth — Account Under Review',
      html: buildEmail(
        `Welcome ${name}! Your NexaHealth account is under review — approval within 24–48 hours.`,
        body
      ),
    });
    console.log(`✅ Welcome email sent to ${email}`);
    return true;
  } catch (err) {
    console.error('❌ Welcome email failed:', err.message);
    return false;
  }
};

/* ─────────────────────────────────────────────────────────────
   2. APPROVAL EMAIL
   Triggered: MCAZ admin approves user via admin dashboard
   Tells user: approved, sign in now, here's what you can do
───────────────────────────────────────────────────────────── */
const sendApprovalEmail = async (email, name) => {
  const body = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="font-size:52px;">✅</div>
    </div>
    <h1>You're approved, ${name}!</h1>
    <p class="sub">
      Your NexaHealth account has been reviewed and approved by our MCAZ compliance team.
      You now have full access to the platform.
    </p>

    <div class="notice notice-success">
      <strong>✅ Account fully activated</strong><br>
      Sign in now to start ordering medicines, comparing supplier prices,
      tracking deliveries, and managing your supply chain.
    </div>

    <a href="${SITE_URL}" class="btn">Sign in to NexaHealth →</a>

    <hr class="divider">
    <p style="font-size:13px;color:#64748b;text-align:center;line-height:1.7;">
      <strong>What you can do now:</strong><br>
      Search &amp; compare medicine prices across suppliers ·
      Place orders with verified wholesalers ·
      Track deliveries in real time ·
      Manage invoices &amp; payments
    </p>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: "✅ NexaHealth Account Approved — You're in!",
      html: buildEmail(
        `Great news ${name}! Your NexaHealth account is approved. Sign in now.`,
        body
      ),
    });
    console.log(`✅ Approval email sent to ${email}`);
    return true;
  } catch (err) {
    console.error('❌ Approval email failed:', err.message);
    return false;
  }
};

/* ─────────────────────────────────────────────────────────────
   3. PASSWORD RESET EMAIL
   Triggered: user submits forgot-password form
   Contains: reset link (expires 10 min) + plain URL fallback
───────────────────────────────────────────────────────────── */
const sendResetEmail = async (email, name, resetToken) => {
  // Link goes to your existing reset-password.html with the token in the URL
  const resetUrl = `${SITE_URL}/reset-password/${resetToken}`;

  const body = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="font-size:52px;">🔐</div>
    </div>
    <h1>Reset your password</h1>
    <p class="sub">
      Hi ${name}, we received a request to reset your NexaHealth password.
      Click the button below to choose a new one.
    </p>

    <a href="${resetUrl}" class="btn">Reset my password →</a>

    <div class="notice notice-warn" style="margin-top:20px;">
      <strong>⏰ This link expires in 10 minutes.</strong><br>
      If you did not request a password reset, ignore this email — your password will not change.
    </div>

    <hr class="divider">
    <p style="font-size:13px;color:#94a3b8;text-align:center;">
      Button not working? Copy and paste this link into your browser:
    </p>
    <div class="fallback-url">${resetUrl}</div>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: '🔐 Reset your NexaHealth password',
      html: buildEmail(
        `Reset your NexaHealth password — link expires in 10 minutes.`,
        body
      ),
    });
    console.log(`✅ Reset email sent to ${email}`);
    return true;
  } catch (err) {
    console.error('❌ Reset email failed:', err.message);
    return false;
  }
};

/* ─────────────────────────────────────────────────────────────
   4. REJECTION EMAIL
   Triggered: MCAZ admin rejects a pending user
   Tells user: reason, what to fix, how to re-apply
───────────────────────────────────────────────────────────── */
const sendRejectionEmail = async (email, name, reason) => {
  const body = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="font-size:52px;">❌</div>
    </div>
    <h1>Account application update</h1>
    <p class="sub">
      Hi ${name}, after reviewing your NexaHealth application our compliance team
      was unable to approve your account at this time.
    </p>

    <div class="notice notice-danger">
      <strong>Reason for rejection:</strong><br>
      ${reason || 'We were unable to verify your submitted documents or business details.'}
    </div>

    <div class="info-box">
      <div class="info-row" style="display:table;width:100%;"><span class="info-value" style="display:table-cell;">✔ Ensure your MCAZ licence is valid and clearly legible</span></div>
      <div class="info-row" style="display:table;width:100%;"><span class="info-value" style="display:table-cell;">✔ Upload a clear copy of your national ID or passport</span></div>
      <div class="info-row" style="display:table;width:100%;"><span class="info-value" style="display:table-cell;">✔ Ensure your business name matches your licence exactly</span></div>
      <div class="info-row" style="display:table;width:100%;"><span class="info-value" style="display:table-cell;">✔ Re-register with correct, up-to-date information</span></div>
    </div>

    <a href="${SITE_URL}" class="btn">Re-apply with correct details →</a>

    <hr class="divider">
    <p style="font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
      If you believe this is an error, reply to this email and our team will help you.
    </p>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: 'NexaHealth — Application Update',
      html: buildEmail(
        `Update regarding your NexaHealth account application.`,
        body
      ),
    });
    console.log(`✅ Rejection email sent to ${email}`);
    return true;
  } catch (err) {
    console.error('❌ Rejection email failed:', err.message);
    return false;
  }
};

/* ─────────────────────────────────────────────────────────────
   5. DEACTIVATION EMAIL
   Triggered: MCAZ admin deactivates an active user
   Tells user: account inactive, how to contact support or re-register
───────────────────────────────────────────────────────────── */
const sendDeactivationEmail = async (email, name) => {
  const body = `
    <div style="text-align:center;margin-bottom:22px;">
      <div style="font-size:52px;">🔒</div>
    </div>
    <h1>Account deactivated</h1>
    <p class="sub">
      Hi ${name}, your NexaHealth account has been temporarily deactivated
      by our compliance team.
    </p>

    <div class="notice notice-warn">
      <strong>🔒 Your account is currently inactive.</strong><br>
      You will not be able to place orders or access your dashboard until
      your account is reactivated, or you create a new account with correct details.
    </div>

    <div class="info-box">
      <div class="info-row" style="display:table;width:100%;">
        <span class="info-label" style="display:table-cell;">Status</span>
        <span class="info-value" style="display:table-cell;color:#f59e0b;">Deactivated</span>
      </div>
      <div class="info-row" style="display:table;width:100%;">
        <span class="info-label" style="display:table-cell;">Next step</span>
        <span class="info-value" style="display:table-cell;">Contact support or re-register</span>
      </div>
    </div>

    <a href="${SITE_URL}" class="btn">Create a new account →</a>

    <hr class="divider">
    <p style="font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
      If you believe this deactivation was made in error, reply to this email immediately
      and our compliance team will review your case.
    </p>
  `;

  try {
    await transporter.sendMail({
      from: FROM,
      to: email,
      subject: '🔒 NexaHealth Account Deactivated',
      html: buildEmail(
        `Your NexaHealth account has been deactivated. Contact support if this is an error.`,
        body
      ),
    });
    console.log(`✅ Deactivation email sent to ${email}`);
    return true;
  } catch (err) {
    console.error('❌ Deactivation email failed:', err.message);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendApprovalEmail,
  sendResetEmail,
  sendRejectionEmail,
  sendDeactivationEmail,
};
