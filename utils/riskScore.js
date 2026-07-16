/**
 * NexaHealth — utils/riskScore.js
 * Computes a 0-100 risk score for an order, used by the MCAZ dashboard
 * to auto-flag suspicious transactions. Simple rule-based version —
 * can be swapped for a real ML model later without touching callers.
 */

/**
 * @param {Object} params
 * @param {Number} params.quantity          units ordered
 * @param {Number} params.avgQuantity       this pharmacy's average order qty for this product
 * @param {Boolean} params.isNewPharmacy    account created < 30 days ago
 * @param {Boolean} params.wholesalerVerified
 * @param {Boolean} params.productRecalled
 */
function computeRiskScore({
  quantity = 0,
  avgQuantity = 0,
  isNewPharmacy = false,
  wholesalerVerified = true,
  productRecalled = false,
}) {
  let score = 0;

  // Ordering far more than usual is the strongest signal
  if (avgQuantity > 0) {
    const ratio = quantity / avgQuantity;
    if (ratio >= 10) score += 50;
    else if (ratio >= 5) score += 30;
    else if (ratio >= 2.5) score += 12;
  }

  if (isNewPharmacy) score += 15;
  if (!wholesalerVerified) score += 25;
  if (productRecalled) score += 40;

  return Math.min(100, score);
}

module.exports = { computeRiskScore };
