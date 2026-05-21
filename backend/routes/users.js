const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { validateUserUpdate, validateObjectId, validatePagination } = require('../middleware/validation');
const ctrl = require('../controllers/userController');
const kycController = require('../controllers/kycController');
const upload = require('../middleware/upload');

const router = express.Router();

router.get('/profile',        authenticateToken,                                  ctrl.getProfile);
router.put('/profile',        authenticateToken, validateUserUpdate,              ctrl.updateProfile);
router.get('/housewives',     validatePagination,                                 ctrl.getHousewives);
router.get('/housewives/:id', validateObjectId('id'),                             ctrl.getHousewifeById);
router.get('/dashboard',      authenticateToken,                                  ctrl.getDashboard);
router.post('/deactivate',    authenticateToken,                                  ctrl.deactivateAccount);

// KYC (provider self-service)
router.get('/profile/kyc',    authenticateToken,                                  kycController.getMyKyc);
router.post('/profile/kyc',
  authenticateToken,
  upload.fields([
    { name: 'aadhaar', maxCount: 1 },
    { name: 'pan', maxCount: 1 },
    { name: 'selfie', maxCount: 1 }
  ]),
  kycController.submitKyc
);

module.exports = router;
