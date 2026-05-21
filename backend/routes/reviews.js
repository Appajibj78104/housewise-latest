const express = require('express');
const { authenticateToken, requireCustomer } = require('../middleware/auth');
const { validateReviewCreation, validateObjectId, validatePagination } = require('../middleware/validation');
const ctrl = require('../controllers/reviewController');

const router = express.Router();

router.post('/',                      authenticateToken, requireCustomer, validateReviewCreation, ctrl.createReview);
router.get('/service/:serviceId',     validateObjectId('serviceId'), validatePagination,          ctrl.getServiceReviews);
router.get('/provider/:providerId',   validateObjectId('providerId'), validatePagination,         ctrl.getProviderReviews);
router.post('/:id/helpful',          authenticateToken, validateObjectId('id'),                   ctrl.markHelpful);
router.delete('/:id/helpful',        authenticateToken, validateObjectId('id'),                   ctrl.removeHelpful);
router.post('/:id/response',         authenticateToken, validateObjectId('id'),                   ctrl.addProviderResponse);

module.exports = router;
