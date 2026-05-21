const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const Category = require('../models/Category');
const Notification = require('../models/Notification');
const SystemSettings = require('../models/SystemSettings');
const SupportTicket = require('../models/SupportTicket');
const ContentPage = require('../models/ContentPage');

// ════════════════════════════════════════════════
// PROVIDER MANAGEMENT
// ════════════════════════════════════════════════

// @desc    Get provider detail with full profile, services, earnings
// @route   GET /api/admin/providers/:id
const getProviderDetail = async (req, res) => {
  try {
    const provider = await User.findOne({ _id: req.params.id, role: 'housewife' })
      .select('-password -refreshToken')
      .lean();

    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    const [services, bookings, reviews, earningsBreakdown] = await Promise.all([
      Service.find({ provider: provider._id }).lean(),
      Booking.find({ provider: provider._id })
        .populate('customer', 'name')
        .populate('service', 'title category')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Review.find({ provider: provider._id, isVisible: true })
        .populate('customer', 'name')
        .populate('service', 'title')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Booking.aggregate([
        { $match: { provider: provider._id, status: 'completed' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            earnings: { $sum: '$pricing.agreedAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 12 },
      ]),
    ]);

    const stats = {
      totalServices: services.length,
      activeServices: services.filter(s => s.isActive).length,
      totalBookings: await Booking.countDocuments({ provider: provider._id }),
      completedBookings: await Booking.countDocuments({ provider: provider._id, status: 'completed' }),
      cancelledBookings: await Booking.countDocuments({ provider: provider._id, status: 'cancelled' }),
      totalEarnings: provider.totalEarnings || 0,
      averageRating: provider.rating?.average || 0,
      totalReviews: provider.rating?.count || 0,
    };

    // Performance score (out of 100)
    const completionRate = stats.totalBookings > 0
      ? (stats.completedBookings / stats.totalBookings) * 100 : 0;
    const ratingScore = (stats.averageRating / 5) * 100;
    const performanceScore = Math.round(
      (completionRate * 0.4) + (ratingScore * 0.4) + (Math.min(stats.totalBookings, 50) / 50 * 100 * 0.2)
    );

    res.json({
      success: true,
      data: {
        provider,
        services,
        recentBookings: bookings,
        recentReviews: reviews,
        earningsBreakdown,
        stats,
        performanceScore,
      },
    });
  } catch (error) {
    console.error('Provider detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to get provider detail' });
  }
};

// @desc    Bulk approve/reject providers
// @route   POST /api/admin/providers/bulk-action
const bulkProviderAction = async (req, res) => {
  try {
    const { providerIds, action } = req.body;

    if (!Array.isArray(providerIds) || providerIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Provider IDs required' });
    }
    if (!['approve', 'reject', 'activate', 'deactivate'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    let update = {};
    if (action === 'approve') update = { isApproved: true };
    else if (action === 'reject') update = { isApproved: false };
    else if (action === 'activate') update = { isActive: true };
    else if (action === 'deactivate') update = { isActive: false };

    const result = await User.updateMany(
      { _id: { $in: providerIds }, role: 'housewife' },
      update
    );

    res.json({
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: `${result.modifiedCount} providers ${action}d successfully`,
    });
  } catch (error) {
    console.error('Bulk provider action error:', error);
    res.status(500).json({ success: false, message: 'Bulk action failed' });
  }
};

// @desc    Get provider performance rankings
// @route   GET /api/admin/providers/rankings
const getProviderRankings = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const providers = await User.aggregate([
      { $match: { role: 'housewife', isApproved: true, isActive: true } },
      {
        $lookup: {
          from: 'bookings',
          localField: '_id',
          foreignField: 'provider',
          as: 'bookings',
        },
      },
      {
        $addFields: {
          totalBookings: { $size: '$bookings' },
          completedBookings: {
            $size: {
              $filter: { input: '$bookings', as: 'b', cond: { $eq: ['$$b.status', 'completed'] } },
            },
          },
          totalEarned: {
            $sum: {
              $map: {
                input: { $filter: { input: '$bookings', as: 'b', cond: { $eq: ['$$b.status', 'completed'] } } },
                as: 'cb',
                in: { $ifNull: ['$$cb.pricing.agreedAmount', 0] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          completionRate: {
            $cond: [{ $gt: ['$totalBookings', 0] }, { $divide: ['$completedBookings', '$totalBookings'] }, 0],
          },
          performanceScore: {
            $add: [
              { $multiply: [{ $cond: [{ $gt: ['$totalBookings', 0] }, { $divide: ['$completedBookings', '$totalBookings'] }, 0] }, 40] },
              { $multiply: [{ $divide: [{ $ifNull: ['$rating.average', 0] }, 5] }, 40] },
              { $multiply: [{ $divide: [{ $min: ['$totalBookings', 50] }, 50] }, 20] },
            ],
          },
        },
      },
      { $sort: { performanceScore: -1 } },
      { $limit: limit },
      {
        $project: {
          name: 1, email: 1, phone: 1, profileImage: 1,
          'rating.average': 1, 'rating.count': 1,
          totalBookings: 1, completedBookings: 1, completionRate: 1,
          totalEarned: 1, performanceScore: 1, experience: 1,
          createdAt: 1,
        },
      },
    ]);

    res.json({ success: true, data: providers });
  } catch (error) {
    console.error('Provider rankings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get rankings' });
  }
};

// @desc    Send notice to provider(s)
// @route   POST /api/admin/providers/notify
const notifyProviders = async (req, res) => {
  try {
    const { providerIds, title, message, type = 'provider_approved' } = req.body;

    if (!providerIds || !title || !message) {
      return res.status(400).json({ success: false, message: 'providerIds, title, and message required' });
    }

    const ids = Array.isArray(providerIds) ? providerIds : [providerIds];
    const notifications = ids.map(id => ({
      user: id,
      type,
      title,
      message,
      data: { fromAdmin: true },
    }));

    await Notification.insertMany(notifications);

    // Emit via socket if available
    const io = req.app.get('io');
    if (io) {
      ids.forEach(id => {
        io.to(`user:${id}`).emit('notification', { title, message, type });
      });
    }

    res.json({ success: true, message: `Notification sent to ${ids.length} provider(s)` });
  } catch (error) {
    console.error('Notify providers error:', error);
    res.status(500).json({ success: false, message: 'Failed to send notifications' });
  }
};

// ════════════════════════════════════════════════
// BOOKING MANAGEMENT (ENHANCED)
// ════════════════════════════════════════════════

// @desc    Search bookings with text search, date range, pagination
// @route   GET /api/admin/bookings/search
const searchBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search, status, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (dateFrom || dateTo) {
      query.scheduledDate = {};
      if (dateFrom) query.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) query.scheduledDate.$lte = new Date(dateTo);
    }

    // Text search across customer/provider/service names requires a pipeline
    let pipeline = [{ $match: query }];

    if (search) {
      pipeline = [
        {
          $lookup: { from: 'users', localField: 'customer', foreignField: '_id', as: 'customerDoc' },
        },
        {
          $lookup: { from: 'users', localField: 'provider', foreignField: '_id', as: 'providerDoc' },
        },
        {
          $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'serviceDoc' },
        },
        { $unwind: { path: '$customerDoc', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$providerDoc', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$serviceDoc', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            ...query,
            $or: [
              { 'customerDoc.name': new RegExp(search, 'i') },
              { 'providerDoc.name': new RegExp(search, 'i') },
              { 'serviceDoc.title': new RegExp(search, 'i') },
              { bookingId: new RegExp(search, 'i') },
            ],
          },
        },
      ];
    }

    // Count pipeline
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Booking.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Data pipeline
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };
    pipeline.push({ $sort: sort });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    if (!search) {
      // If no search, we didn't lookup yet, so do it now for display
      pipeline.push({ $lookup: { from: 'users', localField: 'customer', foreignField: '_id', as: 'customerDoc' } });
      pipeline.push({ $lookup: { from: 'users', localField: 'provider', foreignField: '_id', as: 'providerDoc' } });
      pipeline.push({ $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'serviceDoc' } });
      pipeline.push({ $unwind: { path: '$customerDoc', preserveNullAndEmptyArrays: true } });
      pipeline.push({ $unwind: { path: '$providerDoc', preserveNullAndEmptyArrays: true } });
      pipeline.push({ $unwind: { path: '$serviceDoc', preserveNullAndEmptyArrays: true } });
    }

    pipeline.push({
      $project: {
        bookingId: 1, status: 1, scheduledDate: 1, scheduledTime: 1,
        pricing: 1, createdAt: 1, updatedAt: 1,
        'customer': { _id: '$customerDoc._id', name: '$customerDoc.name', email: '$customerDoc.email' },
        'provider': { _id: '$providerDoc._id', name: '$providerDoc.name', email: '$providerDoc.email' },
        'service': { _id: '$serviceDoc._id', title: '$serviceDoc.title', category: '$serviceDoc.category' },
        cancellation: 1, communication: 1,
      },
    });

    const bookings = await Booking.aggregate(pipeline);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: { current: page, pages: Math.ceil(total / limit), total, limit },
      },
    });
  } catch (error) {
    console.error('Search bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to search bookings' });
  }
};

// @desc    Get booking detail with full timeline
// @route   GET /api/admin/bookings/:id
const getBookingDetail = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone profileImage address')
      .populate('provider', 'name email phone profileImage address rating')
      .populate('service', 'title category pricing duration images')
      .lean();

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Build timeline from booking data
    const timeline = [];
    timeline.push({ event: 'Booking Created', date: booking.createdAt, status: 'pending' });

    if (booking.status !== 'pending') {
      timeline.push({ event: 'Booking Confirmed', date: booking.updatedAt, status: 'confirmed' });
    }
    if (booking.status === 'in_progress') {
      timeline.push({ event: 'Service Started', date: booking.updatedAt, status: 'in_progress' });
    }
    if (booking.status === 'completed') {
      timeline.push({ event: 'Service Completed', date: booking.completion?.completedAt || booking.updatedAt, status: 'completed' });
    }
    if (booking.status === 'cancelled') {
      timeline.push({
        event: `Cancelled by ${booking.cancellation?.cancelledBy || 'unknown'}`,
        date: booking.cancellation?.cancelledAt || booking.updatedAt,
        status: 'cancelled',
        reason: booking.cancellation?.reason,
      });
    }

    // Get related review if exists
    const review = await Review.findOne({ booking: booking._id })
      .select('rating comment createdAt')
      .lean();

    res.json({
      success: true,
      data: { booking, timeline, review },
    });
  } catch (error) {
    console.error('Booking detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to get booking detail' });
  }
};

// @desc    Process refund for a booking
// @route   POST /api/admin/bookings/:id/refund
const processRefund = async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.pricing.refund = {
      amount: amount || booking.pricing.agreedAmount,
      reason: reason || 'Admin initiated refund',
      processedAt: new Date(),
      processedBy: req.admin?.email || 'admin',
    };
    booking.status = 'cancelled';
    await booking.save();

    // Notify customer
    await Notification.create({
      user: booking.customer,
      type: 'booking_cancelled',
      title: 'Refund Processed',
      message: `Your refund of ₹${amount || booking.pricing.agreedAmount} has been processed for booking ${booking.bookingId}`,
      data: { bookingId: booking._id },
    });

    res.json({ success: true, message: 'Refund processed successfully', data: booking });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
};

// @desc    Bulk status update for bookings
// @route   POST /api/admin/bookings/bulk-status
const bulkBookingStatus = async (req, res) => {
  try {
    const { bookingIds, status } = req.body;

    if (!Array.isArray(bookingIds) || !status) {
      return res.status(400).json({ success: false, message: 'bookingIds array and status required' });
    }

    const validStatuses = ['pending', 'quote_pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'declined', 'no_show', 'disputed', 'resolved'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const result = await Booking.updateMany(
      { _id: { $in: bookingIds } },
      { status, updatedAt: new Date() }
    );

    res.json({
      success: true,
      data: { modifiedCount: result.modifiedCount },
      message: `${result.modifiedCount} bookings updated to ${status}`,
    });
  } catch (error) {
    console.error('Bulk booking status error:', error);
    res.status(500).json({ success: false, message: 'Bulk update failed' });
  }
};

// ════════════════════════════════════════════════
// REVIEW MANAGEMENT (ENHANCED)
// ════════════════════════════════════════════════

// Abusive language keywords for auto-flagging
const ABUSIVE_KEYWORDS = [
  'scam', 'fraud', 'cheat', 'steal', 'thief', 'idiot', 'stupid', 'useless',
  'terrible', 'worst', 'horrible', 'disgusting', 'pathetic', 'trash', 'garbage',
  'hate', 'kill', 'die', 'threat', 'assault', 'abuse',
];

// @desc    Analyze review sentiment & auto-flag
// @route   POST /api/admin/reviews/auto-flag
const autoFlagReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ isFlagged: false, isVisible: true }).lean();
    let flaggedCount = 0;

    for (const review of reviews) {
      const text = (review.comment || '').toLowerCase();
      const hasAbusive = ABUSIVE_KEYWORDS.some(kw => text.includes(kw));
      const isVeryLowRating = (review.rating?.overall || 5) <= 1;
      const isShortAngry = text.length < 20 && isVeryLowRating;

      if (hasAbusive || isShortAngry) {
        await Review.findByIdAndUpdate(review._id, {
          isFlagged: true,
          flaggedBy: 'system',
          flaggedAt: new Date(),
          flagReason: hasAbusive ? 'Abusive language detected' : 'Very low rating with minimal feedback',
        });
        flaggedCount++;
      }
    }

    res.json({
      success: true,
      message: `Auto-flagged ${flaggedCount} reviews out of ${reviews.length} checked`,
      data: { flaggedCount, totalChecked: reviews.length },
    });
  } catch (error) {
    console.error('Auto-flag error:', error);
    res.status(500).json({ success: false, message: 'Auto-flag failed' });
  }
};

// @desc    Admin respond to a review
// @route   POST /api/admin/reviews/:id/respond
const respondToReview = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Response message required' });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      {
        providerResponse: {
          message,
          respondedAt: new Date(),
          isPublic: true,
        },
      },
      { new: true }
    ).populate('customer', 'name').populate('provider', 'name');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Review respond error:', error);
    res.status(500).json({ success: false, message: 'Failed to respond' });
  }
};

// @desc    Get review trends over time
// @route   GET /api/admin/reviews/trends
const getReviewTrends = async (req, res) => {
  try {
    const period = parseInt(req.query.period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const [dailyReviews, sentimentBreakdown, topKeywords] = await Promise.all([
      Review.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
            avgRating: { $avg: { $ifNull: ['$rating.overall', '$rating'] } },
            flagged: { $sum: { $cond: ['$isFlagged', 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Review.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $bucket: {
            groupBy: { $ifNull: ['$rating.overall', '$rating'] },
            boundaries: [0, 2, 3.5, 5.1],
            default: 'unknown',
            output: { count: { $sum: 1 } },
          },
        },
      ]),
      // Simple keyword frequency from comments
      Review.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $project: { words: { $split: [{ $toLower: '$comment' }, ' '] } } },
        { $unwind: '$words' },
        { $match: { words: { $regex: /^[a-z]{4,}$/ } } },
        { $group: { _id: '$words', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);

    res.json({
      success: true,
      data: { dailyReviews, sentimentBreakdown, topKeywords },
    });
  } catch (error) {
    console.error('Review trends error:', error);
    res.status(500).json({ success: false, message: 'Failed to get trends' });
  }
};

// ════════════════════════════════════════════════
// SERVICES MANAGEMENT
// ════════════════════════════════════════════════

// @desc    Get all services with filters
// @route   GET /api/admin/services
const getServices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { search, category, status, featured } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }
    if (category) query.category = category;
    if (status === 'active') { query.isActive = true; query.isApproved = true; }
    else if (status === 'inactive') query.isActive = false;
    else if (status === 'pending') query.isApproved = false;
    if (featured === 'true') query.featured = true;

    const [services, total] = await Promise.all([
      Service.find(query)
        .populate('provider', 'name email rating')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Service.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        services,
        pagination: { current: page, pages: Math.ceil(total / limit), total, limit },
      },
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ success: false, message: 'Failed to get services' });
  }
};

// @desc    Toggle service active/approved/featured
// @route   PUT /api/admin/services/:id/toggle
const toggleService = async (req, res) => {
  try {
    const { field } = req.body; // 'isActive', 'isApproved', 'featured'
    const allowed = ['isActive', 'isApproved', 'featured'];
    if (!allowed.includes(field)) {
      return res.status(400).json({ success: false, message: 'Invalid field' });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    service[field] = !service[field];
    if (field === 'isApproved' && service[field]) {
      service.approvedBy = req.admin?.adminId;
      service.approvedAt = new Date();
    }
    await service.save();

    res.json({ success: true, data: service, message: `Service ${field} toggled` });
  } catch (error) {
    console.error('Toggle service error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle service' });
  }
};

// ════════════════════════════════════════════════
// CATEGORIES MANAGEMENT
// ════════════════════════════════════════════════

// @desc    Get all categories
// @route   GET /api/admin/categories
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();

    // Enrich with service counts
    const enriched = await Promise.all(
      categories.map(async (cat) => {
        const count = await Service.countDocuments({ category: cat.name, isActive: true });
        return { ...cat, liveServiceCount: count };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ success: false, message: 'Failed to get categories' });
  }
};

// @desc    Create category
// @route   POST /api/admin/categories
const createCategory = async (req, res) => {
  try {
    const { name, displayName, description, icon, color, subcategories } = req.body;

    if (!name || !displayName) {
      return res.status(400).json({ success: false, message: 'name and displayName required' });
    }

    const exists = await Category.findOne({ name: name.toLowerCase() });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({
      name: name.toLowerCase(),
      displayName,
      description,
      icon,
      color,
      subcategories: subcategories || [],
    });

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Failed to create category' });
  }
};

// @desc    Update category
// @route   PUT /api/admin/categories/:id
const updateCategory = async (req, res) => {
  try {
    const { displayName, description, icon, color, subcategories, isActive, sortOrder } = req.body;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { displayName, description, icon, color, subcategories, isActive, sortOrder },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: 'Failed to update category' });
  }
};

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Check if services use this category
    const serviceCount = await Service.countDocuments({ category: category.name });
    if (serviceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${serviceCount} services use this category`,
      });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category' });
  }
};

// ════════════════════════════════════════════════
// FINANCIAL REPORTS
// ════════════════════════════════════════════════

// @desc    Get financial overview
// @route   GET /api/admin/financial
const getFinancialOverview = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = parseInt(period) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalRevenue, periodRevenue, revenueByDay, topEarners, revenueByCategory] = await Promise.all([
      // All-time revenue
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$pricing.agreedAmount' }, count: { $sum: 1 } } },
      ]),
      // Period revenue
      Booking.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        { $group: { _id: null, total: { $sum: '$pricing.agreedAmount' }, count: { $sum: 1 } } },
      ]),
      // Revenue by day
      Booking.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            revenue: { $sum: '$pricing.agreedAmount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      // Top earning providers
      Booking.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        { $group: { _id: '$provider', earnings: { $sum: '$pricing.agreedAmount' }, bookings: { $sum: 1 } } },
        { $sort: { earnings: -1 } },
        { $limit: 10 },
        {
          $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'provider' },
        },
        { $unwind: '$provider' },
        { $project: { earnings: 1, bookings: 1, 'provider.name': 1, 'provider.email': 1 } },
      ]),
      // Revenue by category
      Booking.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: startDate } } },
        { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'svc' } },
        { $unwind: '$svc' },
        { $group: { _id: '$svc.category', revenue: { $sum: '$pricing.agreedAmount' }, count: { $sum: 1 } } },
        { $sort: { revenue: -1 } },
      ]),
    ]);

    // Platform fee calculation (default 10%)
    const platformFeePercent = await SystemSettings.get('platform_fee_percent', 10);
    const totalRev = totalRevenue[0]?.total || 0;
    const periodRev = periodRevenue[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalRevenue: totalRev,
        periodRevenue: periodRev,
        totalBookings: totalRevenue[0]?.count || 0,
        periodBookings: periodRevenue[0]?.count || 0,
        platformCommission: Math.round(periodRev * (platformFeePercent / 100)),
        providerPayouts: Math.round(periodRev * (1 - platformFeePercent / 100)),
        platformFeePercent,
        revenueByDay,
        topEarners,
        revenueByCategory,
      },
    });
  } catch (error) {
    console.error('Financial overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to get financial data' });
  }
};

// ════════════════════════════════════════════════
// NOTIFICATIONS MANAGEMENT
// ════════════════════════════════════════════════

// @desc    Send broadcast notification to all users
// @route   POST /api/admin/notifications/broadcast
const broadcastNotification = async (req, res) => {
  try {
    const { title, message, targetRole, type = 'service_new' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message required' });
    }

    const userQuery = { isActive: true };
    if (targetRole && targetRole !== 'all') {
      userQuery.role = targetRole === 'provider' ? 'housewife' : targetRole;
    }

    const users = await User.find(userQuery).select('_id').lean();
    const notifications = users.map(u => ({
      user: u._id,
      type,
      title,
      message,
      data: { fromAdmin: true, broadcast: true },
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Socket broadcast
    const io = req.app.get('io');
    if (io) {
      io.emit('notification', { title, message, type, broadcast: true });
    }

    res.json({
      success: true,
      message: `Notification sent to ${notifications.length} users`,
      data: { recipientCount: notifications.length },
    });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ success: false, message: 'Broadcast failed' });
  }
};

// @desc    Get notification history (sent by admin)
// @route   GET /api/admin/notifications/history
const getNotificationHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { 'data.fromAdmin': true };
    const [notifications, total] = await Promise.all([
      Notification.find(query)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
    ]);

    // Group by title+message to show as "campaigns"
    const campaigns = {};
    notifications.forEach(n => {
      const key = `${n.title}||${n.message}`;
      if (!campaigns[key]) {
        campaigns[key] = { title: n.title, message: n.message, date: n.createdAt, recipients: 0, type: n.type };
      }
      campaigns[key].recipients++;
    });

    res.json({
      success: true,
      data: {
        campaigns: Object.values(campaigns),
        notifications,
        pagination: { current: page, pages: Math.ceil(total / limit), total },
      },
    });
  } catch (error) {
    console.error('Notification history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get history' });
  }
};

// ════════════════════════════════════════════════
// SYSTEM SETTINGS
// ════════════════════════════════════════════════

// @desc    Get all system settings
// @route   GET /api/admin/settings/system
const getSystemSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.find().sort('category key').lean();

    // Seed defaults if empty
    if (settings.length === 0) {
      const defaults = [
        { key: 'platform_fee_percent', value: 10, label: 'Platform Fee %', description: 'Commission charged on each booking', type: 'number', category: 'platform' },
        { key: 'booking_auto_cancel_hours', value: 24, label: 'Auto-Cancel Hours', description: 'Hours after which unconfirmed bookings auto-cancel', type: 'number', category: 'booking' },
        { key: 'booking_advance_days_min', value: 1, label: 'Min Advance Days', description: 'Minimum days in advance for booking', type: 'number', category: 'booking' },
        { key: 'booking_advance_days_max', value: 30, label: 'Max Advance Days', description: 'Maximum days in advance for booking', type: 'number', category: 'booking' },
        { key: 'service_radius_km', value: 25, label: 'Service Radius (km)', description: 'Default maximum service area radius', type: 'number', category: 'provider' },
        { key: 'min_provider_rating', value: 3.0, label: 'Min Provider Rating', description: 'Minimum rating before provider is flagged', type: 'number', category: 'provider' },
        { key: 'max_services_per_provider', value: 10, label: 'Max Services Per Provider', description: 'Maximum number of services a provider can list', type: 'number', category: 'provider' },
        { key: 'refund_window_hours', value: 48, label: 'Refund Window (hours)', description: 'Hours after completion within which refund is allowed', type: 'number', category: 'booking' },
        { key: 'dispute_resolution_days', value: 7, label: 'Dispute Resolution Days', description: 'Days to resolve a dispute before auto-escalation', type: 'number', category: 'booking' },
        { key: 'maintenance_mode', value: false, label: 'Maintenance Mode', description: 'Put platform in maintenance mode', type: 'boolean', category: 'system' },
        { key: 'registration_enabled', value: true, label: 'Registration Enabled', description: 'Allow new user registrations', type: 'boolean', category: 'system' },
        { key: 'auto_approve_providers', value: false, label: 'Auto-Approve Providers', description: 'Automatically approve new provider registrations', type: 'boolean', category: 'provider' },
        { key: 'auto_approve_services', value: true, label: 'Auto-Approve Services', description: 'Automatically approve new service listings', type: 'boolean', category: 'provider' },
        { key: 'notification_email_enabled', value: true, label: 'Email Notifications', description: 'Enable email notifications', type: 'boolean', category: 'notification' },
        { key: 'notification_sms_enabled', value: false, label: 'SMS Notifications', description: 'Enable SMS notifications', type: 'boolean', category: 'notification' },
      ];
      await SystemSettings.insertMany(defaults);
      settings = await SystemSettings.find().sort('category key').lean();
    }

    // Group by category
    const grouped = {};
    settings.forEach(s => {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    });

    res.json({ success: true, data: { settings, grouped } });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get settings' });
  }
};

// @desc    Update system settings
// @route   PUT /api/admin/settings/system
const updateSystemSettings = async (req, res) => {
  try {
    const { settings } = req.body; // Array of { key, value }

    if (!Array.isArray(settings)) {
      return res.status(400).json({ success: false, message: 'settings array required' });
    }

    const results = await Promise.all(
      settings.map(({ key, value }) =>
        SystemSettings.findOneAndUpdate(
          { key },
          { value, updatedBy: req.admin?.email || 'admin' },
          { new: true, upsert: true }
        )
      )
    );

    res.json({ success: true, data: results, message: 'Settings updated' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
};

// ════════════════════════════════════════════════
// CONTENT MANAGEMENT
// ════════════════════════════════════════════════

// @desc    Get all content pages
// @route   GET /api/admin/content
const getContentPages = async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category } : {};
    const pages = await ContentPage.find(query).sort({ category: 1, sortOrder: 1 }).lean();
    res.json({ success: true, data: pages });
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ success: false, message: 'Failed to get content' });
  }
};

// @desc    Create/Update content page
// @route   PUT /api/admin/content/:slug
const upsertContentPage = async (req, res) => {
  try {
    const { title, content, category, isPublished, sortOrder } = req.body;

    const page = await ContentPage.findOneAndUpdate(
      { slug: req.params.slug },
      {
        title,
        content,
        category,
        isPublished,
        sortOrder,
        slug: req.params.slug,
        updatedBy: req.admin?.email || 'admin',
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ success: true, data: page });
  } catch (error) {
    console.error('Upsert content error:', error);
    res.status(500).json({ success: false, message: 'Failed to save content' });
  }
};

// @desc    Delete content page
// @route   DELETE /api/admin/content/:slug
const deleteContentPage = async (req, res) => {
  try {
    const result = await ContentPage.findOneAndDelete({ slug: req.params.slug });
    if (!result) {
      return res.status(404).json({ success: false, message: 'Page not found' });
    }
    res.json({ success: true, message: 'Page deleted' });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete content' });
  }
};

// ════════════════════════════════════════════════
// SUPPORT TICKETS
// ════════════════════════════════════════════════

// @desc    Get all support tickets
// @route   GET /api/admin/support
const getSupportTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, priority, category } = req.query;

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const [tickets, total, statusCounts] = await Promise.all([
      SupportTicket.find(query)
        .populate('user', 'name email role phone')
        .populate('relatedBooking', 'bookingId status')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.countDocuments(query),
      SupportTicket.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        tickets,
        statusCounts: Object.fromEntries(statusCounts.map(s => [s._id, s.count])),
        pagination: { current: page, pages: Math.ceil(total / limit), total },
      },
    });
  } catch (error) {
    console.error('Get tickets error:', error);
    res.status(500).json({ success: false, message: 'Failed to get tickets' });
  }
};

// @desc    Get single ticket detail
// @route   GET /api/admin/support/:id
const getTicketDetail = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('user', 'name email role phone profileImage')
      .populate('relatedBooking')
      .lean();

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Get ticket detail error:', error);
    res.status(500).json({ success: false, message: 'Failed to get ticket' });
  }
};

// @desc    Respond to support ticket
// @route   POST /api/admin/support/:id/respond
const respondToTicket = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Response message required' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.messages.push({
      sender: 'admin',
      senderName: req.admin?.email || 'Admin',
      message,
    });
    ticket.status = 'awaiting_response';
    await ticket.save();

    // Notify user
    await Notification.create({
      user: ticket.user,
      type: 'service_new',
      title: 'Support Reply',
      message: `Your ticket "${ticket.subject}" has a new response`,
      data: { ticketId: ticket._id },
    });

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Respond to ticket error:', error);
    res.status(500).json({ success: false, message: 'Failed to respond' });
  }
};

// @desc    Update ticket status
// @route   PUT /api/admin/support/:id/status
const updateTicketStatus = async (req, res) => {
  try {
    const { status, resolution } = req.body;
    const validStatuses = ['open', 'in_progress', 'awaiting_response', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const update = { status };
    if (status === 'resolved' && resolution) {
      update.resolution = {
        summary: resolution,
        resolvedAt: new Date(),
        resolvedBy: req.admin?.email || 'admin',
      };
    }

    const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('user', 'name email');

    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({ success: true, data: ticket });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
};

module.exports = {
  // Provider
  getProviderDetail,
  bulkProviderAction,
  getProviderRankings,
  notifyProviders,
  // Booking
  searchBookings,
  getBookingDetail,
  processRefund,
  bulkBookingStatus,
  // Review
  autoFlagReviews,
  respondToReview,
  getReviewTrends,
  // Services
  getServices,
  toggleService,
  // Categories
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  // Financial
  getFinancialOverview,
  // Notifications
  broadcastNotification,
  getNotificationHistory,
  // Settings
  getSystemSettings,
  updateSystemSettings,
  // Content
  getContentPages,
  upsertContentPage,
  deleteContentPage,
  // Support
  getSupportTickets,
  getTicketDetail,
  respondToTicket,
  updateTicketStatus,
};
