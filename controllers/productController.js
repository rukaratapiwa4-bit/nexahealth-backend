/**
 * NexaHealth — controllers/productController.js
 *
 * Wholesalers manage their real stock here. Pharmacists search/browse
 * across every wholesaler's products. This replaces the frontend's
 * PRODUCTS / CATALOGUE_ITEMS mock arrays with a real, shared database.
 */
const Product = require('../models/Product');
const { logAction } = require('../utils/audit');

// ============================================
// WHOLESALER: CREATE PRODUCT
// POST /api/products
// ============================================
exports.createProduct = async (req, res) => {
  try {
    const {
      name, genericName, category, packSize, batchNumber, expiryDate,
      manufacturer, pricePerUnit, promoPrice, isPromo, stockQuantity,
      lowStockThreshold, deliveryOption, deliveryFee, images,
    } = req.body;

    if (!name || !category || !batchNumber || !expiryDate || !pricePerUnit) {
      return res.status(400).json({
        success: false,
        message: 'name, category, batchNumber, expiryDate, and pricePerUnit are required.',
      });
    }

    const product = await Product.create({
      wholesaler: req.user._id,
      name,
      genericName,
      category,
      packSize,
      batchNumber,
      expiryDate,
      manufacturer,
      pricePerUnit,
      promoPrice,
      isPromo: !!isPromo,
      stockQuantity: stockQuantity || 0,
      lowStockThreshold: lowStockThreshold || 20,
      deliveryOption: deliveryOption || 'paid',
      deliveryFee: deliveryFee || 0,
      images: images || [],
    });

    await logAction({
      action: 'PRODUCT_CREATED',
      performedBy: req.user,
      targetEntity: product._id,
      targetType: 'Product',
      newValue: { name: product.name, batchNumber: product.batchNumber },
      req,
    });

    return res.status(201).json({ success: true, product });
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ success: false, message: 'Server error creating product.' });
  }
};

// ============================================
// PHARMACIST: SEARCH / BROWSE PRODUCTS (across all wholesalers)
// GET /api/products
// Supports: ?search=amoxicillin&category=Antibiotics&page=1&limit=20
// ============================================
exports.searchProducts = async (req, res) => {
  try {
    const { search, category, page = 1, limit = 20 } = req.query;

    const filter = { isActive: true, isRecalled: false };
    if (category) filter.category = category;
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('wholesaler', 'businessName city fullName phone')
        .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      products,
    });
  } catch (err) {
    console.error('Search products error:', err);
    return res.status(500).json({ success: false, message: 'Server error searching products.' });
  }
};

// ============================================
// WHOLESALER: GET MY OWN PRODUCTS
// GET /api/products/mine
// ============================================
exports.getMyProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50, lowStock } = req.query;
    const filter = { wholesaler: req.user._id };

    const skip = (Number(page) - 1) * Number(limit);

    let products = await Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    if (lowStock === 'true') {
      products = products.filter(
        (p) => p.stockQuantity - p.reservedQuantity <= p.lowStockThreshold
      );
    }

    const total = await Product.countDocuments(filter);

    return res.status(200).json({
      success: true,
      count: products.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      products,
    });
  } catch (err) {
    console.error('Get my products error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// GET SINGLE PRODUCT (used by pharmacist's product detail modal)
// GET /api/products/:id
// ============================================
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      'wholesaler',
      'businessName city fullName phone email'
    );
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    return res.status(200).json({ success: true, product });
  } catch (err) {
    console.error('Get product by id error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// COMPARE SUPPLIERS FOR A GIVEN MEDICINE NAME
// GET /api/products/compare?name=Amoxicillin
// (powers the pharmacist "Search & Order" supplier comparison cards)
// ============================================
exports.compareSuppliers = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) {
      return res.status(400).json({ success: false, message: 'name query param is required.' });
    }

    const products = await Product.find({
      name: new RegExp(name, 'i'),
      isActive: true,
      isRecalled: false,
    })
      .populate('wholesaler', 'businessName city fullName')
      .sort({ pricePerUnit: 1 });

    return res.status(200).json({ success: true, count: products.length, products });
  } catch (err) {
    console.error('Compare suppliers error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// WHOLESALER: UPDATE PRODUCT (price, stock, images, promo)
// PATCH /api/products/:id
// ============================================
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (!product.wholesaler.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const allowedFields = [
      'name', 'genericName', 'category', 'packSize', 'batchNumber', 'expiryDate',
      'manufacturer', 'pricePerUnit', 'promoPrice', 'isPromo', 'stockQuantity',
      'lowStockThreshold', 'deliveryOption', 'deliveryFee', 'images', 'isActive',
    ];

    const previousValue = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        previousValue[field] = product[field];
        product[field] = req.body[field];
      }
    }

    await product.save();

    await logAction({
      action: 'PRODUCT_UPDATED',
      performedBy: req.user,
      targetEntity: product._id,
      targetType: 'Product',
      previousValue,
      newValue: req.body,
      req,
    });

    return res.status(200).json({ success: true, product });
  } catch (err) {
    console.error('Update product error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating product.' });
  }
};

// ============================================
// WHOLESALER: DELETE / DEACTIVATE PRODUCT
// DELETE /api/products/:id
// (soft delete — sets isActive false, never hard-deletes stock history)
// ============================================
exports.deactivateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    if (!product.wholesaler.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    product.isActive = false;
    await product.save();

    await logAction({
      action: 'PRODUCT_DEACTIVATED',
      performedBy: req.user,
      targetEntity: product._id,
      targetType: 'Product',
      req,
    });

    return res.status(200).json({ success: true, message: 'Product deactivated.' });
  } catch (err) {
    console.error('Deactivate product error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// MCAZ: MARK PRODUCT/BATCH AS RECALLED
// PATCH /api/products/:id/recall
// (used when MCAZ issues a recall — see Recall model, called from
//  recallController once that's built)
// ============================================
exports.markRecalled = async (req, res) => {
  try {
    const { recallReason } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    product.isRecalled = true;
    product.recallReason = recallReason;
    product.isActive = false;
    await product.save();

    await logAction({
      action: 'PRODUCT_RECALLED',
      performedBy: req.user,
      targetEntity: product._id,
      targetType: 'Product',
      reason: recallReason,
      req,
    });

    return res.status(200).json({ success: true, product });
  } catch (err) {
    console.error('Mark recalled error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ============================================
// PHARMACY MANAGER: LOW STOCK / STOCKOUT FORECAST INPUT
// GET /api/products/low-stock/:wholesalerId
// (used by the wholesaler's own dashboard AND MCAZ oversight)
// ============================================
exports.getLowStockProducts = async (req, res) => {
  try {
    const wholesalerId = req.params.wholesalerId || req.user._id;

    if (req.user.userType === 'wholesaler' && !req.user._id.equals(wholesalerId)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const products = await Product.find({ wholesaler: wholesalerId, isActive: true });
    const lowStock = products.filter(
      (p) => p.stockQuantity - p.reservedQuantity <= p.lowStockThreshold
    );

    return res.status(200).json({ success: true, count: lowStock.length, products: lowStock });
  } catch (err) {
    console.error('Get low stock error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
