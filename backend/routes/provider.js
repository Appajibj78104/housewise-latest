const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const upload = require('../middleware/upload');
const {
  getProfile,
  updateProfile,
  createService,
  getMyServices,
  updateService,
  deleteService,
  getMyBookings,
  getEarnings,
  updateBookingStatus,
  updatePaymentInfo,
  getDashboard,
  toggleAvailability
} = require('../controllers/providerController');

// Middleware to parse JSON strings from FormData
const parseFormDataJSON = (req, res, next) => {
  if (req.body) {
    // Parse JSON fields if they come as strings
    const fieldsToParseJSON = ['pricing', 'duration', 'availability', 'requirements', 'location', 'categoryFields', 'addOns', 'packages', 'tags'];

    fieldsToParseJSON.forEach(field => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          req.body[field] = JSON.parse(req.body[field]);
        } catch (e) {
          return res.status(400).json({
            message: `Invalid ${field} format`,
            error: e.message
          });
        }
      }
    });
  }
  next();
};

// All routes require authentication and provider role
router.use(authenticateToken);
router.use(roleAuth(['housewife']));

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', 
  upload.single('profileImage'),
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
    body('bio').optional().isLength({ max: 500 }).withMessage('Bio must be less than 500 characters'),
    body('location.address').optional().trim().isLength({ min: 5 }).withMessage('Address must be at least 5 characters'),
    body('location.city').optional().trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
    body('workingHours.*.start').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid start time format'),
    body('workingHours.*.end').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid end time format')
  ],
  updateProfile
);

// Service routes
router.post('/services',
  upload.array('images', 5),
  parseFormDataJSON,
  [
    // Title validation
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Title must be between 5 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-&.,()]+$/)
      .withMessage('Title contains invalid characters'),

    // Description validation
    body('description')
      .notEmpty()
      .withMessage('Description is required')
      .trim()
      .isLength({ min: 20, max: 1000 })
      .withMessage('Description must be between 20 and 1000 characters'),

    // Category validation
    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .isIn(['cooking', 'tailoring', 'tuition', 'beauty', 'cleaning', 'childcare', 'eldercare', 'handicrafts', 'catering', 'other'])
      .withMessage('Invalid category selected'),

    // Pricing validation
    body('pricing.type')
      .notEmpty()
      .withMessage('Pricing type is required')
      .isIn(['fixed', 'hourly', 'negotiable'])
      .withMessage('Pricing type must be fixed, hourly, or negotiable'),

    body('pricing.amount')
      .if(body('pricing.type').not().equals('negotiable'))
      .notEmpty()
      .withMessage('Price amount is required when pricing type is not negotiable')
      .isFloat({ min: 1, max: 50000 })
      .withMessage('Price must be between ₹1 and ₹50,000'),

    // Duration validation
    body('duration.estimated')
      .notEmpty()
      .withMessage('Estimated duration is required')
      .isInt({ min: 15, max: 1440 })
      .withMessage('Duration must be between 15 minutes and 24 hours'),

    // Availability validation
    body('availability.days')
      .isArray({ min: 1 })
      .withMessage('At least one availability day must be selected'),

    body('availability.days.*')
      .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
      .withMessage('Invalid day selected'),

    // Requirements validation (optional but with limits)
    body('requirements.materials')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Materials requirements must be less than 500 characters'),

    body('requirements.space')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Space requirements must be less than 500 characters'),

    body('requirements.other')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Other requirements must be less than 500 characters')
  ],
  createService
);

router.get('/services', getMyServices);

// Save / update draft (relaxed validation — only category required)
router.post('/services/draft',
  upload.array('images', 5),
  parseFormDataJSON,
  [
    body('category')
      .optional()
      .isIn(['cooking', 'tailoring', 'tuition', 'beauty', 'cleaning', 'childcare', 'eldercare', 'handicrafts', 'catering', 'other'])
      .withMessage('Invalid category'),
  ],
  require('../controllers/providerController').saveDraft
);

router.put('/services/:id',
  upload.array('images', 5),
  parseFormDataJSON,
  [
    body('title').optional().trim().isLength({ min: 5 }).withMessage('Title must be at least 5 characters'),
    body('description').optional().trim().isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),
    body('category').optional().isIn(['cooking', 'tailoring', 'tuition', 'beauty', 'cleaning', 'childcare', 'eldercare', 'handicrafts', 'catering', 'other']).withMessage('Invalid category'),
    body('pricing.amount').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('pricing.type').optional().isIn(['fixed', 'hourly', 'negotiable']).withMessage('Invalid pricing type'),
    body('duration.estimated').optional().isInt({ min: 15 }).withMessage('Duration must be at least 15 minutes'),
    body('availability.days').optional().isArray().withMessage('Availability days must be an array'),
    body('availability.days.*').optional().isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).withMessage('Invalid day')
  ],
  updateService
);

router.delete('/services/:id', deleteService);

// Booking routes
router.get('/bookings', getMyBookings);
router.put('/bookings/:id/status',
  [
    body('status').isIn(['confirmed', 'declined', 'in_progress', 'completed', 'cancelled', 'no_show']).withMessage('Invalid status'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
  ],
  updateBookingStatus
);

router.put('/bookings/:id/payment',
  [
    body('paymentMethod').isIn(['cash', 'upi', 'online', 'bank_transfer']).withMessage('Invalid payment method'),
    body('transactionId').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('Transaction ID too long'),
    body('paymentNote').optional({ values: 'falsy' }).trim().isLength({ max: 300 }).withMessage('Payment note too long')
  ],
  updatePaymentInfo
);

// Dashboard route
router.get('/dashboard', getDashboard);

// Earnings route
router.get('/earnings', getEarnings);

// Availability toggle
router.put('/availability',
  [
    body('isAvailable').isBoolean().withMessage('Availability must be true or false')
  ],
  toggleAvailability
);

module.exports = router;
