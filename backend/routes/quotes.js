const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const quoteController = require('../controllers/quoteController');

router.use(authenticateToken);

router.post('/request', quoteController.requestQuote);
router.get('/:bookingId', quoteController.getQuote);
router.post('/:bookingId/offer', quoteController.addOffer);
router.post('/:bookingId/accept', quoteController.acceptOffer);
router.post('/:bookingId/reject', quoteController.rejectQuote);

module.exports = router;
