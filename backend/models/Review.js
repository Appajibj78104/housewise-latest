const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true // One review per booking
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
  rating: {
    overall: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot be more than 5']
    },
    quality: {
      type: Number,
      min: [1, 'Quality rating must be at least 1'],
      max: [5, 'Quality rating cannot be more than 5']
    },
    punctuality: {
      type: Number,
      min: [1, 'Punctuality rating must be at least 1'],
      max: [5, 'Punctuality rating cannot be more than 5']
    },
    communication: {
      type: Number,
      min: [1, 'Communication rating must be at least 1'],
      max: [5, 'Communication rating cannot be more than 5']
    },
    value: {
      type: Number,
      min: [1, 'Value rating must be at least 1'],
      max: [5, 'Value rating cannot be more than 5']
    }
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    maxlength: [1000, 'Comment cannot be more than 1000 characters'],
    trim: true
  },
  pros: [{
    type: String,
    trim: true
  }],
  cons: [{
    type: String,
    trim: true
  }],
  images: [{
    url: String,
    caption: String
  }],
  wouldRecommend: {
    type: Boolean,
    default: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: true // Since it's linked to a booking
  },
  helpfulVotes: {
    count: {
      type: Number,
      default: 0
    },
    voters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  providerResponse: {
    message: String,
    respondedAt: Date,
    isPublic: {
      type: Boolean,
      default: true
    }
  },
  isReported: {
    type: Boolean,
    default: false
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  flaggedBy: {
    type: String
  },
  flaggedAt: {
    type: Date
  },
  flagReason: {
    type: String
  },
  reportDetails: {
    reportedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: String,
      reportedAt: {
        type: Date,
        default: Date.now
      }
    }],
    isReviewed: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    action: {
      type: String,
      enum: ['no_action', 'warning', 'hidden', 'removed']
    }
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  editableUntil: {
    type: Date,
    default: function() {
      // Reviews are editable for 24 hours after submission
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }]
}, {
  timestamps: true
});

// Indexes for efficient queries
reviewSchema.index({ provider: 1, createdAt: -1 });
reviewSchema.index({ service: 1, createdAt: -1 });
reviewSchema.index({ customer: 1 });
reviewSchema.index({ 'rating.overall': -1 });
reviewSchema.index({ isVisible: 1, createdAt: -1 });
// 'booking' field already has unique: true constraint which creates an index

// Text search index
reviewSchema.index({ comment: 'text', pros: 'text', cons: 'text' });

// Virtual for average detailed rating
reviewSchema.virtual('averageDetailedRating').get(function() {
  const ratings = [
    this.rating.quality,
    this.rating.punctuality,
    this.rating.communication,
    this.rating.value
  ].filter(rating => rating !== undefined);
  
  if (ratings.length === 0) return this.rating.overall;
  
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return (sum / ratings.length).toFixed(1);
});

// Virtual for formatted date
reviewSchema.virtual('formattedDate').get(function() {
  return this.createdAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

// Method to mark as helpful
reviewSchema.methods.markAsHelpful = function(userId) {
  if (!this.helpfulVotes.voters.includes(userId)) {
    this.helpfulVotes.voters.push(userId);
    this.helpfulVotes.count += 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove helpful vote
reviewSchema.methods.removeHelpfulVote = function(userId) {
  const index = this.helpfulVotes.voters.indexOf(userId);
  if (index > -1) {
    this.helpfulVotes.voters.splice(index, 1);
    this.helpfulVotes.count -= 1;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to add provider response
reviewSchema.methods.addProviderResponse = function(message, isPublic = true) {
  this.providerResponse = {
    message,
    respondedAt: new Date(),
    isPublic
  };
  return this.save();
};

// Method to check if review is still editable
reviewSchema.methods.isStillEditable = function() {
  return this.isEditable && new Date() < this.editableUntil;
};

// Method to make review non-editable
reviewSchema.methods.makeNonEditable = function() {
  this.isEditable = false;
  this.editableUntil = new Date();
  return this.save();
};

// Static method to get provider's average rating
reviewSchema.statics.getProviderAverageRating = async function(providerId) {
  const result = await this.aggregate([
    {
      $match: {
        provider: new mongoose.Types.ObjectId(providerId),
        isVisible: true
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating.overall' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating.overall'
        }
      }
    }
  ]);

  if (result.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }

  const data = result[0];
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  
  data.ratingDistribution.forEach(rating => {
    distribution[Math.floor(rating)] += 1;
  });

  return {
    averageRating: Math.round(data.averageRating * 10) / 10,
    totalReviews: data.totalReviews,
    ratingDistribution: distribution
  };
};

// Static method to get recent reviews for a provider
reviewSchema.statics.getRecentReviews = function(providerId, limit = 10) {
  return this.find({
    provider: providerId,
    isVisible: true
  })
  .populate('customer', 'name profileImage')
  .populate('service', 'title category')
  .sort({ createdAt: -1 })
  .limit(limit);
};

// Static method to get pending reviews for completed bookings
reviewSchema.statics.getPendingReviews = async function(customerId) {
  try {
    const Booking = require('./Booking');

    // Get completed AND resolved bookings for this customer
    // (resolved = dispute was settled, still needs a review)
    const completedBookings = await Booking.find({
      customer: customerId,
      status: { $in: ['completed', 'resolved'] }
    })
    .populate('service', 'title category')
    .populate('provider', 'name profileImage')
    .sort({ updatedAt: -1 });

    // Get existing reviews for this customer
    const existingReviews = await this.find({
      customer: customerId
    }).select('booking');

    const reviewedBookingIds = existingReviews
      .map(review => review.booking ? review.booking.toString() : null)
      .filter(Boolean);

    // Filter out bookings that already have reviews
    const pending = completedBookings.filter(booking =>
      !reviewedBookingIds.includes(booking._id.toString())
    );

    return pending;
  } catch (error) {
    console.error('Error in getPendingReviews:', error.message, error.stack);
    throw error;
  }
};

// Ensure virtual fields are serialized
reviewSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Review', reviewSchema);
