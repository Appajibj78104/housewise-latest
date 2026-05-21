const express = require('express');
const { authenticateToken, requireCustomer } = require('../middleware/auth');
const { validateBookingCreation, validateObjectId, validatePagination } = require('../middleware/validation');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/bookingController');
const lifecycle = require('../controllers/bookingLifecycleController');

const router = express.Router();

router.post('/',           authenticateToken, requireCustomer, validateBookingCreation, ctrl.createBooking);
router.get('/',            authenticateToken, validatePagination,                       ctrl.getBookings);
router.get('/:id',         authenticateToken, validateObjectId('id'),                   ctrl.getBookingById);
router.get('/:id/transitions', authenticateToken, validateObjectId('id'),               ctrl.getBookingTransitions);
router.put('/:id/status',  authenticateToken, validateObjectId('id'),                   ctrl.updateBookingStatus);

// Premium lifecycle endpoints (provider, customer, admin)
router.put('/:id/eta',          authenticateToken, validateObjectId('id'), lifecycle.setEta);
router.put('/:id/arrived',      authenticateToken, validateObjectId('id'), lifecycle.markArrived);
router.put('/:id/start',        authenticateToken, validateObjectId('id'), lifecycle.startJob);
router.post('/:id/timeline',    authenticateToken, validateObjectId('id'),
  upload.array('photos', 5), lifecycle.addTimelineEvent);
router.put('/:id/checklist',    authenticateToken, validateObjectId('id'), lifecycle.setChecklist);
router.put('/:id/checklist/:itemIndex', authenticateToken, validateObjectId('id'),
  lifecycle.toggleChecklistItem);
router.post('/:id/tip',         authenticateToken, validateObjectId('id'), lifecycle.addTip);
router.post('/:id/customer-rating', authenticateToken, validateObjectId('id'),
  lifecycle.rateCustomer);
router.post('/:id/dispute',     authenticateToken, validateObjectId('id'),
  upload.array('photos', 5), lifecycle.raiseDispute);
// dispute resolution is admin-only — see /api/admin/bookings/:id/dispute/resolve
router.post('/:id/rebook',      authenticateToken, validateObjectId('id'), lifecycle.rebook);

module.exports = router;
