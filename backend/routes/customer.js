const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, requireCustomer } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');
const upload = require('../middleware/upload');
const {
  getDashboard,
  getProfile,
  updateProfile,
  getBookings,
  getBookingById,
  createBooking,
  cancelBooking,
  getProviderDetails,
  createReview,
  getMyReviews,
  getPendingReviews,
  updateReview,
  getRecurringSeries,
  mutateRecurringSeries,
  getSavedProviders,
  getMyDisputes
} = require('../controllers/customerController');

const router = express.Router();

// Apply authentication and customer role requirement to all routes
router.use(authenticateToken);
router.use(requireCustomer);

// @route   GET /api/customer/dashboard
// @desc    Get customer dashboard data
// @access  Private (Customer only)
router.get('/dashboard', getDashboard);

// @route   GET /api/customer/profile
// @desc    Get customer profile
// @access  Private (Customer only)
router.get('/profile', getProfile);

// @route   PUT /api/customer/profile
// @desc    Update customer profile
// @access  Private (Customer only)
router.put('/profile', upload.single('profileImage'), [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone must be a valid 10-digit number'),
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Street address must be less than 100 characters'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City must be less than 50 characters'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State must be less than 50 characters'),
  body('address.pincode')
    .optional()
    .matches(/^[0-9]{6}$/)
    .withMessage('Pincode must be a valid 6-digit number')
], updateProfile);

// @route   GET /api/customer/bookings
// @desc    Get customer bookings
// @access  Private (Customer only)
router.get('/bookings', getBookings);

// @route   GET /api/customer/bookings/:id
// @desc    Get single booking by ID
// @access  Private (Customer only)
router.get('/bookings/:id', validateObjectId('id'), getBookingById);

// @route   POST /api/customer/bookings
// @desc    Create a new booking
// @access  Private (Customer only)
router.post('/bookings', [
  body('serviceId')
    .notEmpty()
    .withMessage('Service ID is required')
    .isMongoId()
    .withMessage('Invalid service ID'),
  body('scheduledDate')
    .notEmpty()
    .withMessage('Scheduled date is required')
    .isISO8601()
    .withMessage('Invalid date format')
    .custom((value) => {
      const scheduledDate = new Date(value);
      const now = new Date();
      if (scheduledDate <= now) {
        throw new Error('Scheduled date must be in the future');
      }
      return true;
    }),
  body('scheduledTime.start')
    .notEmpty()
    .withMessage('Start time is required')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
  body('scheduledTime.end')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
  body('customerNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must be less than 500 characters'),
  body('location.type')
    .optional()
    .isIn(['customer_address', 'provider_address', 'custom'])
    .withMessage('Invalid location type'),
  body('selectedPackage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Invalid package selection'),
  body('selectedAddOns')
    .optional()
    .isArray()
    .withMessage('Add-ons must be an array'),
  body('selectedAddOns.*')
    .optional()
    .isString()
    .withMessage('Each add-on must be a string ID'),
  body('recurrence.isRecurring')
    .optional()
    .isBoolean()
    .withMessage('isRecurring must be a boolean'),
  body('recurrence.frequency')
    .optional()
    .isIn(['weekly', 'biweekly', 'monthly'])
    .withMessage('Invalid recurrence frequency'),
  body('recurrence.endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid recurrence end date'),
], createBooking);

// @route   PUT /api/customer/bookings/:id/cancel
// @desc    Cancel a booking
// @access  Private (Customer only)
router.put('/bookings/:id/cancel', [
  validateObjectId('id'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Cancellation reason must be less than 200 characters')
], cancelBooking);

// @route   GET /api/customer/providers/:id
// @desc    Get provider details
// @access  Private (Customer only)
router.get('/providers/:id', validateObjectId('id'), getProviderDetails);

// @route   POST /api/customer/reviews
// @desc    Create a review (with optional photos)
// @access  Private (Customer only)
//
// When the request is multipart (image upload) the frontend stringifies nested
// objects (`rating`, `pros`, `cons`) into JSON. Express-validator runs against
// req.body BEFORE the controller, so we need to unwrap those strings here so
// the per-field validators (`rating.overall` etc.) can see real values.
const parseReviewMultipart = (req, res, next) => {
  ['rating', 'pros', 'cons'].forEach((key) => {
    const v = req.body?.[key];
    if (typeof v === 'string') {
      try { req.body[key] = JSON.parse(v); } catch { /* keep as-is */ }
    }
  });
  next();
};

router.post('/reviews', upload.array('images', 5), parseReviewMultipart, [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid booking ID'),
  body('rating.overall')
    .notEmpty()
    .withMessage('Overall rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  body('rating.quality')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Quality rating must be between 1 and 5'),
  body('rating.punctuality')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Punctuality rating must be between 1 and 5'),
  body('rating.communication')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1 and 5'),
  body('rating.value')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Value rating must be between 1 and 5'),
  body('comment')
    .notEmpty()
    .withMessage('Review comment is required')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),
  body('wouldRecommend')
    .optional()
    .isBoolean()
    .withMessage('Would recommend must be a boolean')
], createReview);

// @route   GET /api/customer/reviews
// @desc    Get customer's reviews
// @access  Private (Customer only)
router.get('/reviews', getMyReviews);

// @route   GET /api/customer/reviews/pending
// @desc    Get pending reviews for completed bookings
// @access  Private (Customer only)
router.get('/reviews/pending', getPendingReviews);

// @route   PUT /api/customer/reviews/:id
// @desc    Update a review (within 24 hours)
// @access  Private (Customer only)
router.put('/reviews/:id', [
  validateObjectId('id'),
  body('rating.overall')
    .notEmpty()
    .withMessage('Overall rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must be less than 1000 characters')
], updateReview);

// --- Favorites/Wishlist ---
const { getFavorites, toggleFavorite } = require('../controllers/customerController');

// @route   GET /api/customer/favorites
// @desc    Get customer's favorite services
// @access  Private (Customer only)
router.get('/favorites', getFavorites);

// @route   POST /api/customer/favorites/:serviceId
// @desc    Toggle service in favorites
// @access  Private (Customer only)
router.post('/favorites/:serviceId', validateObjectId('serviceId'), toggleFavorite);

// --- Recurring booking series management ---
router.get('/recurring',                 getRecurringSeries);
router.put('/recurring/:id/:action',     validateObjectId('id'), mutateRecurringSeries);

// --- Saved providers (distinct from favorited services) ---
router.get('/saved-providers',           getSavedProviders);

// --- Customer disputes (history) ---
router.get('/disputes',                  getMyDisputes);

module.exports = router;
