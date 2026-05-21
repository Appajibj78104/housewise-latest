const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Referral = require('../models/Referral');
const User = require('../models/User');
const { createNotification } = require('../utils/notifications');

// GET /api/referrals/my-code - Get or create referral code for current user
router.get('/my-code', authenticateToken, async (req, res) => {
  try {
    let referral = await Referral.findOne({ referrer: req.user._id });
    
    if (!referral) {
      const code = Referral.generateCode(req.user.name);
      referral = await Referral.create({
        referrer: req.user._id,
        referralCode: code
      });
    }

    res.json({
      success: true,
      data: {
        referralCode: referral.referralCode,
        totalReferrals: referral.totalReferrals,
        successfulReferrals: referral.successfulReferrals,
        totalRewardsEarned: referral.totalRewardsEarned,
        referredUsers: referral.referredUsers.length
      }
    });
  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({ success: false, message: 'Failed to get referral code' });
  }
});

// POST /api/referrals/apply - Apply a referral code during registration
router.post('/apply', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Referral code is required' });

    const referral = await Referral.findOne({ referralCode: code.toUpperCase(), isActive: true });
    if (!referral) return res.status(404).json({ success: false, message: 'Invalid referral code' });

    // Can't refer yourself
    if (referral.referrer.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot use your own referral code' });
    }

    // Check if user already referred
    const alreadyReferred = referral.referredUsers.find(
      r => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReferred) return res.status(400).json({ success: false, message: 'Referral code already applied' });

    referral.referredUsers.push({ user: req.user._id, status: 'registered' });
    referral.totalReferrals += 1;
    await referral.save();

    // Notify referrer
    try {
      await createNotification({
        recipient: referral.referrer,
        type: 'referral',
        title: 'New Referral!',
        message: `${req.user.name} joined using your referral code!`,
        data: { referredUserId: req.user._id }
      });
    } catch (e) { /* non-critical */ }

    res.json({ success: true, message: 'Referral code applied successfully' });
  } catch (error) {
    console.error('Apply referral error:', error);
    res.status(500).json({ success: false, message: 'Failed to apply referral code' });
  }
});

// GET /api/referrals/stats - Get referral stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const referral = await Referral.findOne({ referrer: req.user._id })
      .populate('referredUsers.user', 'name profileImage createdAt');

    if (!referral) {
      return res.json({ success: true, data: { totalReferrals: 0, successfulReferrals: 0, referredUsers: [], totalRewardsEarned: 0 } });
    }

    res.json({
      success: true,
      data: {
        referralCode: referral.referralCode,
        totalReferrals: referral.totalReferrals,
        successfulReferrals: referral.successfulReferrals,
        totalRewardsEarned: referral.totalRewardsEarned,
        referredUsers: referral.referredUsers
      }
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get referral stats' });
  }
});

// POST /api/referrals/validate - Validate a referral code (public)
router.post('/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });

    const referral = await Referral.findOne({ referralCode: code.toUpperCase(), isActive: true })
      .populate('referrer', 'name');

    if (!referral) return res.json({ success: true, data: { valid: false } });

    res.json({
      success: true,
      data: { valid: true, referrerName: referral.referrer.name }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to validate code' });
  }
});

module.exports = router;
