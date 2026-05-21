const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      // Booking lifecycle
      'booking_new',
      'new_booking',           // legacy alias (used in bookingController)
      'booking_confirmed',
      'booking_declined',
      'booking_completed',
      'booking_cancelled',
      'booking_started',
      'booking_eta',
      'booking_arrived',
      'booking_reminder',
      'booking_update',
      'no_show',
      // Quote / negotiation
      'quote_received',
      'quote_offer',
      'quote_accepted',
      'quote_rejected',
      // Tips, reviews, ratings
      'tip_received',
      'review_new',
      'review_response',
      'customer_rated',
      // Disputes
      'dispute_raised',
      'dispute_resolved',
      'dispute_rejected',
      // Recurring
      'recurring_created',
      'recurring_skipped',
      'recurring_cancelled',
      // KYC
      'kyc_submitted',
      'kyc_approved',
      'kyc_rejected',
      // Trust / gamification
      'badge_earned',
      'level_up',
      // Service/provider lifecycle
      'service_new',
      'provider_approved',
      'provider_rejected',
      // Real-time chat (sometimes persisted as a hint)
      'chat_message',
      // Referrals
      'referral',
      // Catch-all
      'system'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    reviewId: { type: mongoose.Schema.Types.ObjectId, ref: 'Review' },
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
