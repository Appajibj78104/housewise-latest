const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true,
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Scheduled date is required']
  },
  scheduledTime: {
    start: {
      type: String,
      required: [true, 'Start time is required']
    },
    end: String
  },
  duration: {
    estimated: Number, // in minutes
    actual: Number
  },
  location: {
    type: {
      type: String,
      enum: ['customer_address', 'provider_address', 'custom'],
      default: 'customer_address'
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    },
    instructions: String
  },
  pricing: {
    agreedAmount: {
      type: Number,
      required: function () {
        // quote_pending bookings may not yet have an agreed amount
        return this.status !== 'quote_pending';
      },
      default: 0,
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR'
    },
    paymentMethod: {
      type: String,
      enum: ['cash', 'upi', 'online', 'bank_transfer'],
      default: 'cash'
    },
    transactionId: {
      type: String,
      maxlength: [100, 'Transaction ID too long'],
      trim: true
    },
    paymentNote: {
      type: String,
      maxlength: [300, 'Payment note too long'],
      trim: true
    },
    paymentUpdatedAt: Date
  },
  status: {
    type: String,
    enum: [
      'quote_pending', // Negotiable service: customer requested a quote
      'pending',       // Waiting for provider confirmation
      'confirmed',     // Provider confirmed
      'in_progress',   // Service is being performed
      'completed',     // Service completed
      'declined',      // Provider declined the request
      'cancelled',     // Cancelled by customer or provider
      'no_show',       // Customer or provider didn't show up
      'disputed',      // Customer raised a dispute after completion
      'resolved'       // Admin resolved the dispute
    ],
    default: 'pending'
  },
  subStatus: {
    type: String,
    enum: ['on_the_way', 'arrived', 'working', null],
    default: null
  },
  eta: {
    type: Date,
    default: null
  },
  etaSetAt: {
    type: Date,
    default: null
  },
  arrivedAt: {
    type: Date,
    default: null
  },
  startedAt: {
    type: Date,
    default: null
  },
  customerNotes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  providerNotes: {
    type: String,
    maxlength: [500, 'Notes cannot be more than 500 characters']
  },
  cancellation: {
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    cancelledAt: Date
  },
  completion: {
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    customerSatisfaction: {
      type: String,
      enum: ['very_satisfied', 'satisfied', 'neutral', 'dissatisfied', 'very_dissatisfied']
    }
  },
  communication: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: { type: String, maxlength: 2000 },
    photos: [{ type: String }],
    timestamp: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['message', 'status_update', 'system'],
      default: 'message'
    },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  reminders: {
    customerReminded: {
      type: Boolean,
      default: false
    },
    providerReminded: {
      type: Boolean,
      default: false
    },
    reminderSentAt: Date
  },
  // Selected package snapshot (from service.packages)
  selectedPackage: {
    index: Number,
    name: String,
    description: String,
    price: Number,
    duration: Number,
    includes: [String]
  },
  // Selected add-ons snapshot (from service.addOns)
  selectedAddOns: [{
    id: String,
    label: String,
    price: { type: Number, default: 0 }
  }],
  isReviewed: {
    type: Boolean,
    default: false
  },
  // Recurring booking support
  recurrence: {
    isRecurring: { type: Boolean, default: false },
    frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: null },
    parentBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    endDate: { type: Date, default: null },
    occurrenceIndex: { type: Number, default: 0 },
    recurrenceStatus: {
      type: String,
      enum: ['active', 'paused', 'ended', null],
      default: null
    },
    skipNext: { type: Boolean, default: false },
    lastSpawnedAt: { type: Date, default: null }
  },
  // Live job timeline events (status checkpoints, photos, notes)
  timeline: [{
    type: {
      type: String,
      enum: [
        'created', 'quote_request', 'quote_offer', 'quote_accepted', 'quote_rejected',
        'confirmed', 'declined', 'eta_set', 'on_the_way', 'arrived',
        'started', 'note', 'before_photos', 'after_photos', 'progress',
        'completed', 'cancelled', 'tip_added', 'dispute_raised', 'dispute_resolved'
      ]
    },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byRole: { type: String, enum: ['customer', 'housewife', 'admin', 'system'] },
    at: { type: Date, default: Date.now },
    message: { type: String, maxlength: 1000 },
    photos: [{ type: String }],
    data: { type: mongoose.Schema.Types.Mixed }
  }],
  // Provider checklist for the job (tracked & visible to customer)
  checklist: [{
    label: { type: String, required: true, maxlength: 200 },
    done: { type: Boolean, default: false },
    doneAt: Date,
    doneBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  // Customer tip (post-completion, metadata-only — no PSP integration)
  tip: {
    amount: { type: Number, default: 0, min: 0 },
    addedAt: Date,
    note: { type: String, maxlength: 200 }
  },
  // Provider rating of customer (two-way ratings)
  customerRatedByProvider: {
    rating: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, maxlength: 500 },
    ratedAt: Date
  },
  // Quote / negotiation thread for negotiable services
  quote: {
    requestedBudget: { type: Number, default: null },
    requestedMessage: { type: String, maxlength: 1000 },
    offers: [{
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      byRole: { type: String, enum: ['customer', 'housewife'] },
      amount: { type: Number, required: true, min: 0 },
      message: { type: String, maxlength: 1000 },
      at: { type: Date, default: Date.now },
      accepted: { type: Boolean, default: false }
    }],
    finalAmount: { type: Number, default: null }
  },
  // Customer dispute on a completed booking
  dispute: {
    raisedAt: Date,
    reason: { type: String, maxlength: 1000 },
    evidencePhotos: [{ type: String }],
    status: {
      type: String,
      enum: ['open', 'resolved', 'rejected', null],
      default: null
    },
    resolution: { type: String, maxlength: 1000 },
    refundAmount: { type: Number, default: 0 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date
  },
  feedback: {
    customerFeedbackGiven: {
      type: Boolean,
      default: false
    },
    providerFeedbackGiven: {
      type: Boolean,
      default: false
    },
    customerFeedbackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    },
    providerFeedbackId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
bookingSchema.index({ customer: 1, createdAt: -1 });
bookingSchema.index({ provider: 1, createdAt: -1 });
bookingSchema.index({ provider: 1, status: 1 });
bookingSchema.index({ provider: 1, scheduledDate: 1, status: 1 });
bookingSchema.index({ service: 1 });
bookingSchema.index({ status: 1, scheduledDate: 1 });
bookingSchema.index({ scheduledDate: 1 });

// Pre-save middleware to generate booking ID
bookingSchema.pre('save', async function(next) {
  if (!this.bookingId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.bookingId = `BK${timestamp}${random}`.toUpperCase();
  }
  next();
});

// Virtual for formatted scheduled date and time
bookingSchema.virtual('formattedSchedule').get(function() {
  if (!this.scheduledDate) return '';
  const date = this.scheduledDate.toLocaleDateString('en-IN');
  const time = this.scheduledTime?.start || '';
  return time ? `${date} at ${time}` : date;
});

// Virtual for booking duration in hours
bookingSchema.virtual('durationInHours').get(function() {
  if (!this.duration?.estimated) return null;
  return (this.duration.estimated / 60).toFixed(1);
});

// Method to check if booking can be cancelled
bookingSchema.methods.canBeCancelled = function() {
  const now = new Date();
  const scheduledDateTime = new Date(this.scheduledDate);
  const timeDiff = scheduledDateTime - now;
  const hoursDiff = timeDiff / (1000 * 60 * 60);

  // quote_pending bookings can be cancelled at any time
  if (this.status === 'quote_pending') return true;
  return ['pending', 'confirmed'].includes(this.status) && hoursDiff > 2;
};

// Method to check if a dispute can still be raised on a completed or no_show booking
bookingSchema.methods.canRaiseDispute = function(refundWindowHours = 72) {
  if (!['completed', 'no_show'].includes(this.status)) return false;
  if (this.dispute && this.dispute.status) return false;
  const completedAt = this.completion?.completedAt || this.updatedAt;
  if (!completedAt) return false;
  const hoursSince = (Date.now() - new Date(completedAt).getTime()) / (1000 * 60 * 60);
  return hoursSince <= refundWindowHours;
};

// Method to check if booking can be modified
bookingSchema.methods.canBeModified = function() {
  const now = new Date();
  const scheduledDateTime = new Date(this.scheduledDate);
  const timeDiff = scheduledDateTime - now;
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  return this.status === 'pending' && hoursDiff > 24;
};

// Static method to get upcoming bookings
bookingSchema.statics.getUpcoming = function(userId, role = 'customer') {
  const query = {
    [role === 'customer' ? 'customer' : 'provider']: userId,
    scheduledDate: { $gte: new Date() },
    status: { $in: ['pending', 'confirmed'] }
  };
  
  return this.find(query)
    .populate('customer', 'name phone')
    .populate('provider', 'name phone')
    .populate('service', 'title category')
    .sort({ scheduledDate: 1 });
};

// Static method to get booking history
bookingSchema.statics.getHistory = function(userId, role = 'customer') {
  const query = {
    [role === 'customer' ? 'customer' : 'provider']: userId,
    status: { $in: ['completed', 'cancelled', 'no_show', 'declined', 'resolved'] }
  };
  
  return this.find(query)
    .populate('customer', 'name phone')
    .populate('provider', 'name phone')
    .populate('service', 'title category')
    .sort({ createdAt: -1 });
};

// Ensure virtual fields are serialized
bookingSchema.set('toJSON', { virtuals: true });

// Emit real-time event to admins on new booking or status change
bookingSchema.post('save', function (doc) {
  try {
    const { emitToAdmins } = require('../config/socket');
    emitToAdmins('admin:booking_update', {
      type: doc.isNew ? 'new_booking' : 'status_change',
      bookingId: doc._id,
      status: doc.status,
      timestamp: new Date().toISOString(),
    });
  } catch (e) { /* Socket not initialized yet */ }
});

module.exports = mongoose.model('Booking', bookingSchema);
