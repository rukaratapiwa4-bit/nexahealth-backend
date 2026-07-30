/**
 * NexaHealth — utils/cronJobs.js
 *
 * Scheduled background jobs, replacing the old "calculated on page load"
 * approach for anything that should run on its own regardless of whether
 * a user happens to have a dashboard open.
 *
 * CURRENT JOBS:
 *   1. Low-stock digest — daily, 07:00 Africa/Harare.
 *      Finds every active product at or below its lowStockThreshold and
 *      emails each affected wholesaler ONE digest listing all of theirs.
 *
 * NOT INCLUDED (yet): licence-expiry checks. The User model has no
 * licence-expiry date field — mcazLicense is just the uploaded document
 * path, not a date — so there is nothing for a cron job to check against.
 * Add a `licenseExpiryDate` field to models/User.js first if you want
 * this job later; wiring it now would either do nothing every run or
 * require inventing data, and NexaHealth's rule is no fake data.
 *
 * Requires the "node-cron" package (added to package.json).
 */
const cron = require('node-cron');
const Product = require('../models/Product');
const { sendLowStockDigestEmail } = require('./email');

// ============================================
// JOB 1: DAILY LOW-STOCK DIGEST
// ============================================
async function runLowStockDigest() {
  console.log('⏰ Running daily low-stock digest job...');

  try {
    const products = await Product.find({ isActive: true, isRecalled: false })
      .populate('wholesaler', 'fullName businessName email isActive')
      .select('name batchNumber stockQuantity reservedQuantity lowStockThreshold wholesaler');

    // Group low-stock items by wholesaler so each gets ONE email, not one per product
    const byWholesaler = new Map();

    for (const p of products) {
      const available = p.stockQuantity - p.reservedQuantity;
      if (available > p.lowStockThreshold) continue;
      if (!p.wholesaler || !p.wholesaler.isActive) continue;

      const key = p.wholesaler._id.toString();
      if (!byWholesaler.has(key)) {
        byWholesaler.set(key, { wholesaler: p.wholesaler, items: [] });
      }
      byWholesaler.get(key).items.push({
        name: p.name,
        batchNumber: p.batchNumber,
        available,
        lowStockThreshold: p.lowStockThreshold,
      });
    }

    let sent = 0;
    for (const { wholesaler, items } of byWholesaler.values()) {
      if (!wholesaler.email) continue;
      const ok = await sendLowStockDigestEmail(
        wholesaler.email,
        wholesaler.fullName || wholesaler.businessName || 'there',
        items
      );
      if (ok) sent += 1;
    }

    console.log(`✅ Low-stock digest job complete — ${sent} email(s) sent across ${byWholesaler.size} wholesaler(s).`);
  } catch (err) {
    console.error('❌ Low-stock digest job failed:', err.message);
  }
}

// ============================================
// SCHEDULER
// ============================================
function startCronJobs() {
  // 07:00 every day, Africa/Harare time (CAT, UTC+2, no DST)
  cron.schedule('0 7 * * *', runLowStockDigest, { timezone: 'Africa/Harare' });
  console.log('🕐 Cron jobs scheduled: low-stock digest daily at 07:00 (Africa/Harare).');
}

module.exports = { startCronJobs, runLowStockDigest };
