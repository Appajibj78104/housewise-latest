const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Service title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Service description is required'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'cooking',
      'tailoring',
      'tuition',
      'beauty',
      'cleaning',
      'childcare',
      'eldercare',
      'handicrafts',
      'catering',
      'other'
    ]
  },
  subcategory: {
    type: String,
    trim: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pricing: {
    type: {
      type: String,
      enum: ['fixed', 'hourly', 'negotiable'],
      default: 'fixed'
    },
    amount: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  duration: {
    estimated: {
      type: Number, // in minutes
      min: [15, 'Duration must be at least 15 minutes']
    },
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'days'],
      default: 'hours'
    }
  },
  location: {
    type: {
      type: String,
      enum: ['home_visit', 'customer_place', 'both'],
      default: 'customer_place'
    },
    serviceArea: {
      radius: {
        type: Number,
        default: 5 // in kilometers
      },
      coordinates: {
        latitude: Number,
        longitude: Number
      }
    }
  },
  availability: {
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    timeSlots: [{
      start: String,
      end: String
    }],
    isAvailable: {
      type: Boolean,
      default: true
    }
  },
  images: [{
    url: String,
    caption: String
  }],
  requirements: {
    materials: {
      type: String,
      trim: true,
      maxlength: 500
    },
    space: {
      type: String,
      trim: true,
      maxlength: 500
    },
    other: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Category-specific smart fields (key-value pairs filled from category config)
  categoryFields: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Add-ons offered by this service
  addOns: [{
    id: { type: String, required: true },
    label: { type: String, required: true },
    price: { type: Number, default: 0 },
    description: String,
    enabled: { type: Boolean, default: true }
  }],
  // Service packages/tiers
  packages: [{
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number }, // minutes
    includes: [String]
  }],
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'draft'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  rejectionReason: String,
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Keep isActive in sync with status
serviceSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.isActive = this.status === 'active';
  }
  next();
});

serviceSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.$set && update.$set.status !== undefined) {
    update.$set.isActive = update.$set.status === 'active';
  } else if (update.status !== undefined) {
    update.isActive = update.status === 'active';
  }
  next();
});

// Indexes for efficient queries
serviceSchema.index({ category: 1, isActive: 1, isApproved: 1 });
serviceSchema.index({ provider: 1 });
serviceSchema.index({ provider: 1, isActive: 1 });
serviceSchema.index({ 'location.serviceArea.coordinates': '2dsphere' });
serviceSchema.index({ 'rating.average': -1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ featured: -1, 'rating.average': -1 });

// Text search index
serviceSchema.index({ 
  title: 'text', 
  description: 'text', 
  tags: 'text',
  subcategory: 'text'
});

// Virtual for formatted price
serviceSchema.virtual('formattedPrice').get(function() {
  if (!this.pricing.amount) return 'Negotiable';
  return `₹${this.pricing.amount}${this.pricing.type === 'hourly' ? '/hr' : ''}`;
});

// Virtual for service area description
serviceSchema.virtual('serviceAreaDescription').get(function() {
  if (!this.location.serviceArea.radius) return 'Location not specified';
  return `${this.location.serviceArea.radius} km radius`;
});

// Method to increment views
serviceSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Method to update rating
serviceSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.rating.average * this.rating.count;
  this.rating.count += 1;
  this.rating.average = (currentTotal + newRating) / this.rating.count;
  return this.save();
};

// Static method to find services near location
serviceSchema.statics.findNearby = function(latitude, longitude, maxDistance = 10000) {
  return this.find({
    'location.serviceArea.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistance
      }
    },
    isActive: true,
    isApproved: true
  });
};

// Ensure virtual fields are serialized
serviceSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Service', serviceSchema);
