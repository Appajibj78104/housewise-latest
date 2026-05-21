const mongoose = require('mongoose');
const crypto = require('crypto');

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referralCode: {
    type: String,
    unique: true,
    required: true
  },
  referredUsers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['registered', 'first_booking', 'rewarded'], default: 'registered' },
    joinedAt: { type: Date, default: Date.now },
    rewardedAt: Date
  }],
  totalReferrals: { type: Number, default: 0 },
  successfulReferrals: { type: Number, default: 0 },
  totalRewardsEarned: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

referralSchema.index({ referrer: 1 });

// Generate unique referral code
referralSchema.statics.generateCode = function(userName) {
  const prefix = userName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${suffix}`;
};

module.exports = mongoose.model('Referral', referralSchema);
