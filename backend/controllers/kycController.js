/**
 * KYC controller — providers submit Aadhaar / PAN / Selfie for verification.
 * Admin approves/rejects. On approval, the provider receives a `verified_kyc` badge.
 */
const User = require('../models/User');
const { uploadToCloudinary } = require('../middleware/upload');
const { createNotification } = require('../utils/notifications');
const { invalidateUserCache } = require('../middleware/auth');

/**
 * POST /users/profile/kyc
 * Multipart fields: aadhaar, pan, selfie (image files)
 * Provider submits KYC documents.
 */
exports.submitKyc = async (req, res) => {
  try {
    if (req.user.role !== 'housewife') {
      return res.status(403).json({ success: false, message: 'KYC is only for service providers' });
    }
    const files = req.files || {};
    const aadhaar = files.aadhaar?.[0];
    const pan = files.pan?.[0];
    const selfie = files.selfie?.[0];
    if (!aadhaar || !pan || !selfie) {
      return res.status(400).json({
        success: false,
        message: 'aadhaar, pan, and selfie images are all required'
      });
    }

    const [aadhaarRes, panRes, selfieRes] = await Promise.all([
      uploadToCloudinary(aadhaar.buffer, 'housewife-services/kyc'),
      uploadToCloudinary(pan.buffer, 'housewife-services/kyc'),
      uploadToCloudinary(selfie.buffer, 'housewife-services/kyc')
    ]);

    const user = await User.findById(req.user._id);
    user.kyc = {
      status: 'pending',
      aadhaarUrl: aadhaarRes.secure_url,
      panUrl: panRes.secure_url,
      selfieUrl: selfieRes.secure_url,
      submittedAt: new Date(),
      rejectedReason: undefined,
      rejectedAt: undefined
    };
    await user.save();
    invalidateUserCache(String(user._id));

    createNotification({
      recipient: user._id,
      type: 'kyc_submitted',
      title: 'KYC submitted',
      message: 'Your KYC is under review. We\'ll notify you once it\'s verified.',
      data: {}
    });

    return res.json({ success: true, data: { kyc: user.kyc } });
  } catch (err) {
    console.error('submitKyc error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit KYC' });
  }
};

/** GET /users/profile/kyc — current user's KYC status */
exports.getMyKyc = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('kyc role').lean();
    return res.json({ success: true, data: { kyc: user?.kyc || { status: 'none' }, role: user?.role } });
  } catch (err) {
    console.error('getMyKyc error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load KYC' });
  }
};

/** GET /admin/kyc/pending — admin queue */
exports.adminListPending = async (req, res) => {
  try {
    const status = (req.query.status || 'pending').trim();
    const list = await User.find({ role: 'housewife', 'kyc.status': status })
      .select('name email phone profileImage kyc createdAt')
      .sort({ 'kyc.submittedAt': -1 })
      .limit(200)
      .lean();
    return res.json({ success: true, data: { items: list, count: list.length } });
  } catch (err) {
    console.error('adminListPending error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list KYC submissions' });
  }
};

/** POST /admin/kyc/:userId/approve */
exports.adminApprove = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.kyc || user.kyc.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending KYC for this user' });
    }
    const mongoose = require('mongoose');
    user.kyc.status = 'verified';
    user.kyc.verifiedAt = new Date();
    const adminId = req.user?._id || req.admin?.adminId;
    if (adminId && mongoose.Types.ObjectId.isValid(adminId)) {
      user.kyc.verifiedBy = adminId;
    }
    user.isVerified = true;
    if (!user.earnedBadges?.includes('verified_kyc')) {
      user.earnedBadges = [...(user.earnedBadges || []), 'verified_kyc'];
    }
    await user.save();
    invalidateUserCache(String(user._id));

    createNotification({
      recipient: user._id,
      type: 'kyc_approved',
      title: 'KYC verified',
      message: 'Congratulations! Your KYC has been verified. You\'ve earned the Verified badge.',
      data: {}
    });
    createNotification({
      recipient: user._id,
      type: 'badge_earned',
      title: 'Badge earned: Verified',
      message: 'You earned the Verified KYC badge',
      data: { badgeId: 'verified_kyc' }
    });

    return res.json({ success: true, data: { user: { _id: user._id, kyc: user.kyc, earnedBadges: user.earnedBadges } } });
  } catch (err) {
    console.error('adminApprove error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve KYC' });
  }
};

/** POST /admin/kyc/:userId/reject — Body: { reason } */
exports.adminReject = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.kyc || user.kyc.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending KYC for this user' });
    }
    user.kyc.status = 'rejected';
    user.kyc.rejectedReason = reason || 'Documents could not be verified';
    user.kyc.rejectedAt = new Date();
    await user.save();
    invalidateUserCache(String(user._id));

    createNotification({
      recipient: user._id,
      type: 'kyc_rejected',
      title: 'KYC rejected',
      message: user.kyc.rejectedReason,
      data: {}
    });

    return res.json({ success: true, data: { user: { _id: user._id, kyc: user.kyc } } });
  } catch (err) {
    console.error('adminReject error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject KYC' });
  }
};
