const { body } = require('express-validator');

exports.registerValidation = [
  body('userType').isIn(['pharmacy', 'wholesaler', 'mcaz', 'logistics']).withMessage('Invalid user type'),
  body('fullName').notEmpty().withMessage('Full name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('phone').notEmpty().withMessage('Phone required'),
  body('businessName').notEmpty().withMessage('Business name required'),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 characters'),
  body('city').notEmpty().withMessage('City required'),
  body('address').notEmpty().withMessage('Address required'),
  body('termsAccepted').isBoolean().withMessage('Terms must be accepted'),
  body('privacyAccepted').isBoolean().withMessage('Privacy must be accepted'),
];

exports.loginValidation = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

exports.forgotPasswordValidation = [
  body('email').isEmail().withMessage('Valid email required'),
];

exports.resetPasswordValidation = [
  body('password').isLength({ min: 8 }).withMessage('Password min 8 characters'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
];