const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { validationResult } = require('express-validator');
const { createNotification } = require('../utils/notifications');

// @desc    Get customer dashboard data
// @route   GET /api/customer/dashboard
// @access  Private (Customer only)
const getDashboard = async (req, res) => {
  try {
    const customerId = req.user._id;

    // Run ALL independent queries in parallel
    const [upcomingBookings, recentBookings, bookingStats, favoriteCategories, reviewAgg] = await Promise.all([
      // Upcoming bookings
      Booking.find({
        customer: customerId,
        scheduledDate: { $gte: new Date() },
        status: { $in: ['pending', 'confirmed'] }
      })
      .populate('service', 'title category')
      .populate('provider', 'name profileImage email phone')
      .sort({ scheduledDate: 1 })
      .limit(5)
      .lean(),

      // Recent bookings
      Booking.find({
        customer: customerId,
        status: { $in: ['completed', 'cancelled', 'declined', 'no_show', 'resolved'] }
      })
      .populate('service', 'title category')
      .populate('provider', 'name profileImage email phone')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),

      // Booking stats (include resolved as completed)
      Booking.aggregate([
        { $match: { customer: customerId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Favorite categories
      Booking.aggregate([
        { $match: { customer: customerId } },
        { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'serviceData' } },
        { $unwind: '$serviceData' },
        { $group: { _id: '$serviceData.category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ]),

      // Review rating via aggregation (not loading all docs)
      Review.aggregate([
        { $match: { customer: customerId } },
        { $group: { _id: null, avg: { $avg: { $ifNull: ['$rating.overall', '$rating'] } }, cnt: { $sum: 1 } } }
      ]),
    ]);

    const stats = { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
    bookingStats.forEach(stat => {
      // Count 'resolved' bookings (from disputes) as part of completed
      if (stat._id === 'resolved') {
        stats.completed += stat.count;
      } else {
        stats[stat._id] = stat.count;
      }
      stats.total += stat.count;
    });

    const ratingData = reviewAgg[0]
      ? { averageRating: Math.round(reviewAgg[0].avg * 10) / 10, totalReviews: reviewAgg[0].cnt }
      : { averageRating: 0, totalReviews: 0 };

    res.json({
      success: true,
      data: {
        upcomingBookings,
        recentBookings,
        stats,
        favoriteCategories,
        rating: ratingData
      }
    });

  } catch (error) {
    console.error('Get customer dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get customer profile
// @route   GET /api/customer/profile
// @access  Private (Customer only)
const getProfile = async (req, res) => {
  try {
    const customer = await User.findById(req.user._id).select('-password');
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      data: {
        customer
      }
    });

  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update customer profile
// @route   PUT /api/customer/profile
// @access  Private (Customer only)
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const allowedUpdates = ['name', 'phone', 'address'];
    const updates = {};

    // Handle regular form data
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key === 'address' && typeof req.body[key] === 'string') {
          // Parse JSON string for address
          try {
            updates[key] = JSON.parse(req.body[key]);
          } catch (e) {
            updates[key] = req.body[key];
          }
        } else {
          updates[key] = req.body[key];
        }
      }
    });

    // Handle profile image upload
    if (req.file) {
      const { uploadProfileImage } = require('../middleware/upload');
      try {
        const result = await uploadProfileImage(req.file.buffer);
        updates.profileImage = result.secure_url;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({
          success: false,
          message: 'Failed to upload profile image'
        });
      }
    }

    const customer = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        customer
      }
    });

  } catch (error) {
    console.error('Update customer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get customer bookings
// @route   GET /api/customer/bookings
// @access  Private (Customer only)
const getBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    let query = { customer: req.user._id };
    
    if (status && status !== 'all') {
      if (status === 'upcoming') {
        query.scheduledDate = { $gte: new Date() };
        query.status = { $in: ['pending', 'confirmed'] };
      } else if (status === 'past') {
        query.status = { $in: ['completed', 'cancelled', 'no_show', 'declined', 'resolved'] };
      } else {
        query.status = status;
      }
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('service', 'title category images')
        .populate('provider', 'name profileImage phone address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get customer bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get single booking by ID
// @route   GET /api/customer/bookings/:id
// @access  Private (Customer only)
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      customer: req.user._id
    })
    .populate('service', 'title description category images pricing duration requirements')
    .populate('provider', 'name phone profileImage address rating bio')
    .populate('customer', 'name phone');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: {
        booking
      }
    });

  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Create a new booking
// @route   POST /api/customer/bookings
// @access  Private (Customer only)
const createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { serviceId, scheduledDate, scheduledTime, customerNotes, location, selectedAddOns, selectedPackage, recurrence } = req.body;

    // Check if service exists and is active
    const service = await Service.findOne({
      _id: serviceId,
      isActive: true,
      isApproved: true
    }).populate('provider', 'name phone');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found or not available'
      });
    }

    // Check if provider is currently available
    const providerUser = await User.findById(service.provider._id);
    if (providerUser && providerUser.isAvailable === false) {
      return res.status(400).json({
        success: false,
        message: 'This provider is currently unavailable. Please try again later.'
      });
    }

    // Check if customer is trying to book their own service
    if (service.provider._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot book your own service'
      });
    }

    // Generate booking ID
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const bookingId = `BK${timestamp}${random}`.toUpperCase();

    // Resolve agreed amount — use package price if selected, else base price
    let agreedAmount = 0;
    let resolvedPackage = undefined;
    if (selectedPackage != null && service.packages && service.packages[selectedPackage]) {
      const pkg = service.packages[selectedPackage];
      agreedAmount = Number(pkg.price) || 0;
      resolvedPackage = {
        index: selectedPackage,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        duration: pkg.duration,
        includes: pkg.includes || []
      };
    } else {
      agreedAmount = service.pricing?.amount ? Number(service.pricing.amount) : 0;
    }

    // Resolve add-ons — snapshot label/price from service
    let resolvedAddOns = [];
    if (Array.isArray(selectedAddOns) && selectedAddOns.length > 0 && service.addOns) {
      resolvedAddOns = selectedAddOns
        .map(addonId => service.addOns.find(a => a.id === addonId))
        .filter(Boolean)
        .map(a => ({ id: a.id, label: a.label, price: a.price || 0 }));
      agreedAmount += resolvedAddOns.reduce((sum, a) => sum + a.price, 0);
    }

    // Resolve recurrence (parent series — children spawned by recurringBookings cron)
    const resolvedRecurrence = recurrence?.isRecurring ? {
      isRecurring: true,
      frequency: recurrence.frequency || 'weekly',
      endDate: recurrence.endDate ? new Date(recurrence.endDate) : undefined,
      recurrenceStatus: 'active',
      occurrenceIndex: 0,
      lastSpawnedAt: new Date(scheduledDate)
    } : undefined;

    // Resolve end time — strip empty strings so Mongoose gets undefined
    const endTime = scheduledTime.end && scheduledTime.end.trim()
      ? scheduledTime.end.trim()
      : undefined;

    // Resolve location — if address is a plain string wrap it properly
    let resolvedLocation = location || { type: 'customer_address', address: req.user.address };
    if (resolvedLocation.address && typeof resolvedLocation.address === 'string') {
      resolvedLocation = {
        ...resolvedLocation,
        address: { street: resolvedLocation.address }
      };
    }

    // Create booking
    const bookingData = {
      bookingId,
      customer: req.user._id,
      provider: service.provider._id,
      service: serviceId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime: {
        start: scheduledTime.start,
        ...(endTime && { end: endTime })
      },
      duration: {
        estimated: (resolvedPackage?.duration) || service.duration?.estimated || 0
      },
      pricing: {
        agreedAmount
      },
      customerNotes,
      location: resolvedLocation,
      ...(resolvedPackage && { selectedPackage: resolvedPackage }),
      ...(resolvedAddOns.length > 0 && { selectedAddOns: resolvedAddOns }),
      ...(resolvedRecurrence && { recurrence: resolvedRecurrence }),
      timeline: [{
        type: 'created',
        by: req.user._id,
        byRole: 'customer',
        at: new Date(),
        message: `Booking requested for ${new Date(scheduledDate).toLocaleDateString('en-IN')} at ${scheduledTime.start}`
      }]
    };

    const booking = new Booking(bookingData);
    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('service', 'title category')
      .populate('provider', 'name phone profileImage')
      .populate('customer', 'name phone');

    // Notify provider of new booking
    createNotification({
      user: booking.provider,
      type: 'booking_new',
      title: 'New Booking Request',
      message: `${populatedBooking.customer?.name || 'A customer'} booked "${populatedBooking.service?.title || 'a service'}"`,
      data: { bookingId: booking._id, serviceId: booking.service, fromUser: booking.customer }
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        booking: populatedBooking
      }
    });

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Cancel a booking
// @route   PUT /api/customer/bookings/:id/cancel
// @access  Private (Customer only)
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if customer owns this booking
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only cancel your own bookings'
      });
    }

    // Check if booking can be cancelled
    if (!booking.canBeCancelled()) {
      return res.status(400).json({
        success: false,
        message: 'Booking cannot be cancelled. It must be at least 2 hours before the scheduled time'
      });
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: req.user._id,
      reason: req.body.reason || 'Cancelled by customer',
      cancelledAt: new Date()
    };

    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate('service', 'title category')
      .populate('provider', 'name phone');

    // Notify provider of cancellation
    createNotification({
      user: booking.provider,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `${req.user.name || 'A customer'} cancelled the booking for "${populatedBooking.service?.title || 'a service'}"`,
      data: { bookingId: booking._id, serviceId: booking.service, fromUser: req.user._id }
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        booking: populatedBooking
      }
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get provider details
// @route   GET /api/customer/providers/:id
// @access  Private (Customer only)
const getProviderDetails = async (req, res) => {
  try {
    const providerId = req.params.id;

    // Find provider by ID (role should be 'housewife')
    const provider = await User.findById(providerId)
      .select('-password')
      .lean();

    if (!provider || provider.role !== 'housewife') {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    // Parallel: services + reviews
    const [services, reviews] = await Promise.all([
      Service.find({ provider: providerId, isActive: true, isApproved: true })
        .select('title category subcategory pricing rating images featured')
        .sort({ featured: -1, 'rating.average': -1 })
        .lean(),
      Review.find({ provider: providerId })
        .populate('customer', 'name profileImage')
        .select('rating comment customer createdAt wouldRecommend pros cons')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        provider,
        services,
        reviews
      }
    });

  } catch (error) {
    console.error('Get provider details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get provider details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Create a review
// @route   POST /api/customer/reviews
// @access  Private (Customer only)
const createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let { bookingId, rating, comment, wouldRecommend, pros, cons } = req.body;

    // Multipart: rating may arrive stringified
    if (typeof rating === 'string') {
      try { rating = JSON.parse(rating); } catch { /* keep as string */ }
    }
    if (typeof pros === 'string') {
      try { pros = JSON.parse(pros); } catch { pros = pros ? [pros] : []; }
    }
    if (typeof cons === 'string') {
      try { cons = JSON.parse(cons); } catch { cons = cons ? [cons] : []; }
    }

    // Check if booking exists and belongs to customer
    // Booking must be either 'completed' OR 'resolved' (from settled dispute)
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: req.user._id,
      status: { $in: ['completed', 'resolved'] }
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not completed'
      });
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      booking: bookingId,
      customer: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }

    // Optional review photos (multipart)
    let images = [];
    if (req.files && req.files.length) {
      const { uploadToCloudinary } = require('../middleware/upload');
      for (const f of req.files) {
        try {
          const r = await uploadToCloudinary(f.buffer, 'housewife-services/reviews');
          images.push({ url: r.secure_url, caption: '' });
        } catch (e) { /* skip */ }
      }
    }

    // Create review
    const review = new Review({
      customer: req.user._id,
      provider: booking.provider,
      service: booking.service,
      booking: bookingId,
      rating,
      comment,
      wouldRecommend: wouldRecommend !== undefined ? (wouldRecommend === 'true' || wouldRecommend === true) : true,
      pros: pros || [],
      cons: cons || [],
      images
    });

    await review.save();

    // Mark booking as reviewed
    booking.isReviewed = true;
    await booking.save();

    const populatedReview = await Review.findById(review._id)
      .populate('customer', 'name profileImage')
      .populate('service', 'title category');

    // Notify provider of new review
    createNotification({
      user: booking.provider,
      type: 'review_new',
      title: 'New Review',
      message: `${req.user.name || 'A customer'} left a ${rating?.overall || ''}-star review on "${populatedReview.service?.title || 'your service'}"`,
      data: { reviewId: review._id, serviceId: booking.service, fromUser: req.user._id }
    });

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: {
        review: populatedReview
      }
    });

  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get customer's reviews
// @route   GET /api/customer/reviews
// @access  Private (Customer only)
const getMyReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const reviews = await Review.find({ customer: req.user._id })
      .populate('provider', 'name profileImage')
      .populate('service', 'title category')
      .populate('booking', 'bookingId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({ customer: req.user._id });

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get customer reviews error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to get reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get pending reviews for completed bookings
// @route   GET /api/customer/reviews/pending
// @access  Private (Customer only)
const getPendingReviews = async (req, res) => {
  try {
    const customerId = req.user._id;
    const pendingReviews = await Review.getPendingReviews(customerId);

    res.json({
      success: true,
      data: {
        pendingReviews,
        count: pendingReviews.length
      }
    });

  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Update a review (within 24 hours)
// @route   PUT /api/customer/reviews/:id
// @access  Private (Customer only)
const updateReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const reviewId = req.params.id;
    const { rating, comment, wouldRecommend, pros, cons } = req.body;

    // Find the review
    const review = await Review.findOne({
      _id: reviewId,
      customer: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if review is still editable
    if (!review.isStillEditable()) {
      return res.status(400).json({
        success: false,
        message: 'Review is no longer editable (24-hour limit exceeded)'
      });
    }

    // Update review
    review.rating = rating;
    review.comment = comment;
    if (wouldRecommend !== undefined) review.wouldRecommend = wouldRecommend;
    if (pros) review.pros = pros;
    if (cons) review.cons = cons;

    await review.save();

    const populatedReview = await Review.findById(review._id)
      .populate('provider', 'name profileImage')
      .populate('service', 'title category');

    res.json({
      success: true,
      message: 'Review updated successfully',
      data: {
        review: populatedReview
      }
    });

  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update review',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get customer's favorite services
// @route   GET /api/customer/favorites
// @access  Private (Customer only)
const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'favorites',
        select: 'title category pricing rating images provider isActive',
        populate: { path: 'provider', select: 'name profileImage rating' }
      })
      .lean();

    const favorites = (user.favorites || []).filter(s => s && s.isActive);
    res.json({ success: true, data: { favorites } });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ success: false, message: 'Failed to get favorites' });
  }
};

// @desc    Toggle a service in favorites
// @route   POST /api/customer/favorites/:serviceId
// @access  Private (Customer only)
const toggleFavorite = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const user = await User.findById(req.user._id);
    
    const index = user.favorites.indexOf(serviceId);
    let added;
    if (index === -1) {
      user.favorites.push(serviceId);
      added = true;
    } else {
      user.favorites.splice(index, 1);
      added = false;
    }
    await user.save();

    res.json({ success: true, data: { added, favoriteCount: user.favorites.length } });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle favorite' });
  }
};

// @desc    Get customer's recurring booking series (parents only)
// @route   GET /api/customer/recurring
const getRecurringSeries = async (req, res) => {
  try {
    const series = await Booking.find({
      customer: req.user._id,
      'recurrence.isRecurring': true
    })
      .populate('service', 'title category images pricing')
      .populate('provider', 'name profileImage phone')
      .sort({ createdAt: -1 })
      .lean();

    // For each parent, count children
    const ids = series.map(s => s._id);
    const childCounts = await Booking.aggregate([
      { $match: { 'recurrence.parentBooking': { $in: ids } } },
      { $group: { _id: '$recurrence.parentBooking', count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(childCounts.map(c => [String(c._id), c.count]));
    const data = series.map(s => ({
      ...s,
      childOccurrences: countMap[String(s._id)] || 0
    }));

    res.json({ success: true, data: { series: data } });
  } catch (error) {
    console.error('Get recurring series error:', error);
    res.status(500).json({ success: false, message: 'Failed to get recurring series' });
  }
};

// @desc    Mutate recurring series (pause/resume/skip-next/cancel)
// @route   PUT /api/customer/recurring/:id/:action
const mutateRecurringSeries = async (req, res) => {
  try {
    const { id, action } = req.params;
    const validActions = ['pause', 'resume', 'skip-next', 'cancel'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    const parent = await Booking.findOne({
      _id: id,
      customer: req.user._id,
      'recurrence.isRecurring': true
    });
    if (!parent) {
      return res.status(404).json({ success: false, message: 'Recurring series not found' });
    }

    if (action === 'pause') parent.recurrence.recurrenceStatus = 'paused';
    if (action === 'resume') parent.recurrence.recurrenceStatus = 'active';
    if (action === 'skip-next') parent.recurrence.skipNext = true;
    if (action === 'cancel') {
      parent.recurrence.recurrenceStatus = 'ended';
      parent.recurrence.isRecurring = false;
    }

    await parent.save();

    if (action === 'cancel') {
      createNotification({
        recipient: parent.provider,
        type: 'recurring_cancelled',
        title: 'Recurring series cancelled',
        message: 'A customer cancelled their recurring booking series',
        data: { bookingId: parent._id, fromUser: req.user._id }
      });
    }

    res.json({ success: true, data: { booking: parent } });
  } catch (error) {
    console.error('Mutate recurring series error:', error);
    res.status(500).json({ success: false, message: 'Failed to update series' });
  }
};

// @desc    Saved providers (distinct providers from user's favorites)
// @route   GET /api/customer/saved-providers
const getSavedProviders = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'favorites',
        select: 'provider title category',
        populate: {
          path: 'provider',
          select: 'name profileImage phone address bio rating earnedBadges customerRating isVerified completedServices'
        }
      })
      .lean();

    const map = new Map();
    for (const fav of user?.favorites || []) {
      const prov = fav?.provider;
      if (!prov?._id) continue;
      const key = String(prov._id);
      if (!map.has(key)) {
        map.set(key, {
          ...prov,
          savedServices: [{ _id: fav._id, title: fav.title, category: fav.category }],
        });
      } else {
        map.get(key).savedServices.push({ _id: fav._id, title: fav.title, category: fav.category });
      }
    }

    const providers = Array.from(map.values());
    res.json({ success: true, data: { providers } });
  } catch (error) {
    console.error('Get saved providers error:', error);
    res.status(500).json({ success: false, message: 'Failed to load saved providers' });
  }
};

// @desc    List customer's disputes
// @route   GET /api/customer/disputes
const getMyDisputes = async (req, res) => {
  try {
    const filter = { customer: req.user._id, 'dispute.status': { $in: ['open', 'resolved', 'rejected'] } };
    const disputes = await Booking.find(filter)
      .populate('service', 'title category images')
      .populate('provider', 'name profileImage')
      .sort({ 'dispute.raisedAt': -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: { disputes } });
  } catch (error) {
    console.error('Get disputes error:', error);
    res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
};

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  getBookings,
  getBookingById,
  createBooking,
  cancelBooking,
  getProviderDetails,
  createReview,
  getMyReviews,
  getPendingReviews,
  updateReview,
  getFavorites,
  toggleFavorite,
  getRecurringSeries,
  mutateRecurringSeries,
  getSavedProviders,
  getMyDisputes,
};
