/**
 * NexaHealth — utils/email.js
 * Uses Resend (HTTP API) instead of Gmail SMTP.
 * Render blocks/throttles outbound SMTP connections — Resend works over
 * plain HTTPS so it is not affected by that restriction.
 *
 * Required .env / Render environment variable:
 *   RESEND_API_KEY=re_xxxxxxxxxxxx      (already set on Render)
 *   FRONTEND_URL=https://nexahealth-backend.onrender.com
 *
 * Same 5 exports as before — nothing else in your app needs to change.
 *
 * NOTE: Until you verify your own domain on resend.com, all emails must be
 * sent FROM "onboarding@resend.dev". This is Resend's free shared sender
 * for unverified accounts. Once you verify a domain (e.g. nexahealth.co.zw),
 * change FROM below to "NexaHealth <noreply@nexahealth.co.zw>".
 */

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM     = 'NexaHealth <onboarding@resend.dev>';
const SITE_URL = process.env.FRONTEND_URL || 'https://nexahealth-backend.onrender.com';
const PRIMARY  = '#0088cc';
const DARK     = '#0b2b44';

/* ─────────────────────────────────────────────────────────────
   SHARED HTML WRAPPER
───────────────────────────────────────────────────────────── */
function buildEmail(previewText, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  body{margin:0;padding:0;background-color:#f4f7fa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;}
  .wrapper{background-color:#f4f7fa;padding:32px 16px;}
  .card{background:#ffffff;border-radius:16px;max-width:560px;margin:0 auto;overflow:hidden;box-shadow:0 4px 24px rgba(11,43,68,.09);}
  .header{background:${DARK};padding:28px 36px 24px;text-align:center;}
  .logo-mark{display:inline-block;background:linear-gradient(135deg,${PRIMARY},#00b8f0);width:36px;height:36px;border-radius:9px;font-size:16px;font-weight:900;color:#fff;line-height:36px;text-align:center;vertical-align:middle;margin-right:8px;}
  .logo-text{font-size:22px;font-weight:700;color:#ffffff;vertical-align:middle;}
  .logo-text span{color:#00b8f0;}
  .body{padding:36px 36px 28px;}
  h1{font-size:22px;font-weight:700;color:${DARK};margin:0 0 10px;text-align:center;}
  .sub{font-size:14.5px;color:#64748b;text-align:center;line-height:1.7;margin:0 0 24px;}
  .info-box{background:#f4f7fa;border-radius:12px;padding:6px 20px;margin:0 0 22px;}
  .info-row{display:table;width:100%;padding:10px 0;border-bottom:1px solid #e3e9ef;font-size:13.5px;}
  .info-row:last-child{border-bottom:none;}
  .info-label{color:#64748b;font-weight:600;display:table-cell;min-width:110px;}
  .info-value{color:${DARK};font-weight:600;display:table-cell;text-align:right;}
  .btn{display:block;background:${PRIMARY};color:#ffffff!important;text-decoration:none;border-radius:12px;padding:15px 28px;font-size:15px;font-weight:700;text-align:center;margin:22px 0 8px;}
  .notice{border-radius:12px;padding:14px 18px;margin:0 0 20px;font-size:13.5px;line-height:1.6;}
  .notice-warn{background:#fffbeb;border:1.5px solid #fbbf24;color:#92400e;}
  .notice-success{background:#ecfdf5;border:1.5px solid #6ee7b7;color:#065f46;}
  .notice-danger{background:#fff1f2;border:1.5px solid #fca5a5;color:#991b1b;}
  .divider{border:none;border-top:1px solid #e3e9ef;margin:22px 0;}
  .fallback-url{background:#f4f7fa;border:1.5px dashed #e3e9ef;border-radius:10px;padding:12px 16px;font-size:12px;color:#64748b;word-break:break-all;margin-top:14px;}
  .footer{background:#f4f7fa;padding:20px 36px;text-align:center;}
  .footer p{font-size:12px;color:#94a3b8;margin:3px 0;line-height:1.6;}
  .footer a{color:${PRIMARY};text-decoration:none;}
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
───────────────────────────────────────────────────────────── */
const sendWelcomeEmail = async (email, name, userType = '') => {
  const roleLabels = {
    pharmacy:   'Pharmacy / Hospital',
    wholesaler: 'Wholesaler / Manufacturer',
    mcaz:       'MCAZ / Regulator',
    logistics:  'Logistics / Delivery',
  };

  const body = `
    <div style="text-align:center;margin-bottom:22px;"><div style="font-size:52px;">🎉</div></div>
    <h1>Welcome to NexaHealth, ${name}!</h1>
    <p class="sub">Your account has been created successfully. Our MCAZ compliance team is now reviewing your details.</p>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Name</span><span class="info-value">${name}</span></div>
      <div class="info-row"><span class="info-label">Email</span><span class="info-value">${email}</span></div>
      <div class="info-row"><span class="info-label">Account type</span><span class="info-value">${roleLabels[userType] || 'NexaHealth Member'}</span></div>
      <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color:#f59e0b;">Pending approval</span></div>
    </div>
    <div class="notice notice-warn">
      <strong>What happens next?</strong><br>
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
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: '🎉 Welcome to NexaHealth — Account Under Review',
      html: buildEmail(`Welcome ${name}! Your NexaHealth account is under review — approval within 24–48 hours.`, body),
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
───────────────────────────────────────────────────────────── */
const sendApprovalEmail = async (email, name) => {
  const body = `
    <div style="text-align:center;margin-bottom:22px;"><div style="font-size:52px;">✅</div></div>
    <h1>You're approved, ${name}!</h1>
    <p class="sub">Your NexaHealth account has been reviewed and approved by our MCAZ compliance team. You now have full access to the platform.</p>
    <div class="notice notice-success">
      <strong>Account fully activated</strong><br>
      Sign in now to start ordering medicines, comparing supplier prices, tracking deliveries, and managing your supply chain.
    </div>
    <a href="${SITE_URL}" class="btn">Sign in to NexaHealth →</a>
    <hr class="divider">
    <p style="font-size:13px;color:#64748b;text-align:center;line-height:1.7;">
      <strong>What you can do now:</strong><br>
      Search &amp; compare medicine prices across suppliers · Place orders with verified wholesalers ·
      Track deliveries in real time · Manage invoices &amp; payments
    </p>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "✅ NexaHealth Account Approved — You're in!",
      html: buildEmail(`Great news ${name}! Your NexaHealth account is approved. Sign in now.`, body),
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
───────────────────────────────────────────────────────────── */
const sendResetEmail = async (email, name, resetToken) => {
  const resetUrl = `${SITE_URL}/reset-password/${resetToken}`;

  const body = `
    <div style="text-align:center;margin-bottom:22px;"><div style="font-size:52px;">🔐</div></div>
    <h1>Reset your password</h1>
    <p class="sub">Hi ${name}, we received a request to reset your NexaHealth password. Click the button below to choose a new one.</p>
    <a href="${resetUrl}" class="btn">Reset my password →</a>
    <div class="notice notice-warn" style="margin-top:20px;">
      <strong>This link expires in 3 minutes.</strong><br>
      If you did not request a password reset, ignore this email — your password will not change.
    </div>
    <hr class="divider">
    <p style="font-size:13px;color:#94a3b8;text-align:center;">Button not working? Copy and paste this link into your browser:</p>
    <div class="fallback-url">${resetUrl}</div>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: '🔐 Reset your NexaHealth password',
      html: buildEmail(`Reset your NexaHealth password — link expires in 3 minutes.`, body),
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
───────────────────────────────────────────────────────────── */
const sendRejectionEmail = async (email, name, reason) => {
  const body = `
    <div style="text-align:center;margin-bottom:22px;"><div style="font-size:52px;">❌</div></div>
    <h1>Account application update</h1>
    <p class="sub">Hi ${name}, after reviewing your NexaHealth application our compliance team was unable to approve your account at this time.</p>
    <div class="notice notice-danger">
      <strong>Reason for rejection:</strong><br>
      ${reason || 'We were unable to verify your submitted documents or business details.'}
    </div>
    <div class="info-box">
      <div class="info-row"><span class="info-value" style="text-align:left;">Ensure your MCAZ licence is valid and clearly legible</span></div>
      <div class="info-row"><span class="info-value" style="text-align:left;">Upload a clear copy of your national ID or passport</span></div>
      <div class="info-row"><span class="info-value" style="text-align:left;">Ensure your business name matches your licence exactly</span></div>
      <div class="info-row"><span class="info-value" style="text-align:left;">Re-register with correct, up-to-date information</span></div>
    </div>
    <a href="${SITE_URL}" class="btn">Re-apply with correct details →</a>
    <hr class="divider">
    <p style="font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
      If you believe this is an error, reply to this email and our team will help you.
    </p>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: 'NexaHealth — Application Update',
      html: buildEmail(`Update regarding your NexaHealth account application.`, body),
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
───────────────────────────────────────────────────────────── */
const sendDeactivationEmail = async (email, name) => {
  const body = `
    <div style="text-align:center;margin-bottom:22px;"><div style="font-size:52px;">🔒</div></div>
    <h1>Account deactivated</h1>
    <p class="sub">Hi ${name}, your NexaHealth account has been temporarily deactivated by our compliance team.</p>
    <div class="notice notice-warn">
      <strong>Your account is currently inactive.</strong><br>
      You will not be able to place orders or access your dashboard until your account is reactivated, or you create a new account with correct details.
    </div>
    <div class="info-box">
      <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color:#f59e0b;">Deactivated</span></div>
      <div class="info-row"><span class="info-label">Next step</span><span class="info-value">Contact support or re-register</span></div>
    </div>
    <a href="${SITE_URL}" class="btn">Create a new account →</a>
    <hr class="divider">
    <p style="font-size:13px;color:#94a3b8;text-align:center;line-height:1.6;">
      If you believe this deactivation was made in error, reply to this email immediately and our compliance team will review your case.
    </p>
  `;

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: '🔒 NexaHealth Account Deactivated',
      html: buildEmail(`Your NexaHealth account has been deactivated. Contact support if this is an error.`, body),
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
