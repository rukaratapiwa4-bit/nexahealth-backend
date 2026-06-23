const nodemailer = require('nodemailer');

console.log('✅ nodemailer loaded:', typeof nodemailer);
console.log('✅ createTransport exists:', typeof nodemailer.createTransport);

const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

// Add other functions (welcome, reset, rejection, deactivation) with same pattern

module.exports = {
  sendApprovalEmail,
  // ... add other functions here
};