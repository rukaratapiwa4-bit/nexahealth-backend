/**
 * NexaHealth — routes/productRoutes.js
 * Mount in server.js with: app.use('/api/products', productRoutes);
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const {
  createProduct,
  searchProducts,
  getMyProducts,
  getProductById,
  compareSuppliers,
  updateProduct,
  deactivateProduct,
  markRecalled,
  getLowStockProducts,
} = require('../controllers/productController');

const { protect } = require('../middleware/auth');
const { requireRole } = require('../middleware/roleCheck');

// ─────────────────────────────────────────────
// WHOLESALER: create a new product
// ─────────────────────────────────────────────
router.post(
  '/',
  protect,
  requireRole('wholesaler'),
  [
    body('name').notEmpty().withMessage('name is required.'),
    body('category').notEmpty().withMessage('category is required.'),
    body('batchNumber').notEmpty().withMessage('batchNumber is required.'),
    body('expiryDate').notEmpty().withMessage('expiryDate is required.'),
    body('pricePerUnit').isFloat({ min: 0 }).withMessage('pricePerUnit must be a positive number.'),
  ],
  createProduct
);

// ─────────────────────────────────────────────
// PHARMACIST: search/browse products across all wholesalers
// e.g. GET /api/products?search=amoxicillin&category=Antibiotics
// ─────────────────────────────────────────────
router.get('/', protect, requireRole('pharmacy', 'manager', 'mcaz'), searchProducts);

// Compare suppliers for one medicine name (powers supplier comparison cards)
router.get('/compare', protect, requireRole('pharmacy', 'manager'), compareSuppliers);

// WHOLESALER: get own products (must be BEFORE /:id to avoid route collision)
router.get('/mine', protect, requireRole('wholesaler'), getMyProducts);

// Low stock check — wholesaler's own, or MCAZ overseeing any wholesaler
router.get('/low-stock/:wholesalerId', protect, requireRole('wholesaler', 'mcaz'), getLowStockProducts);

// Single product detail (pharmacist product modal)
router.get('/:id', protect, getProductById);

// ─────────────────────────────────────────────
// WHOLESALER: update own product
// ─────────────────────────────────────────────
router.patch('/:id', protect, requireRole('wholesaler'), updateProduct);

// WHOLESALER: soft-delete (deactivate) own product
router.delete('/:id', protect, requireRole('wholesaler'), deactivateProduct);

// ─────────────────────────────────────────────
// MCAZ: mark a batch as recalled
// ─────────────────────────────────────────────
router.patch(
  '/:id/recall',
  protect,
  requireRole('mcaz'),
  [body('recallReason').notEmpty().withMessage('recallReason is required.')],
  markRecalled
);

module.exports = router;
