const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const AdminActivityLog = require('../models/AdminActivityLog');
const bcrypt = require('bcryptjs');

// @desc    Get admin overview / dashboard stats
// @route   GET /api/admin/overview
// @access  Private (Admin)
const getOverview = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalCustomers,
      totalProviders,
      pendingProviders,
      totalBookings,
      todayBookings,
      totalServices,
      totalReviews,
      recentBookings,
      recentSignups,
      flaggedReviews,
      revenueAgg,
      ratingAgg,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer', isActive: true }),
      User.countDocuments({ role: 'housewife', isActive: true, isApproved: true }),
      User.countDocuments({ role: 'housewife', isApproved: false }),
      Booking.countDocuments(),
      Booking.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
      Service.countDocuments({ isActive: true }),
      Review.countDocuments({ isVisible: true }),
      Booking.find()
        .populate('customer', 'name')
        .populate('provider', 'name')
        .populate('service', 'title category')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      User.find()
        .select('name email role createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Review.find({ isFlagged: true })
        .populate('customer', 'name')
        .populate('provider', 'name')
        .populate('service', 'title')
        .sort({ flaggedAt: -1 })
        .limit(5)
        .lean(),
      Booking.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$pricing.agreedAmount' } } },
      ]),
      Review.aggregate([
        { $match: { isVisible: true } },
        { $group: { _id: null, avg: { $avg: { $ifNull: ['$rating.overall', '$rating'] } } } },
      ]),
    ]);

    const averageProviderRating = ratingAgg[0]?.avg ? Math.round(ratingAgg[0].avg * 10) / 10 : 0;

    res.json({
      success: true,
      data: {
        metrics: {
          totalCustomers,
          totalProviders,
          pendingProviders,
          totalBookings,
          todayBookings,
          totalServices,
          totalReviews,
          totalRevenue: revenueAgg[0]?.total || 0,
          averageProviderRating,
        },
        recentActivity: {
          bookings: recentBookings,
          signups: recentSignups,
          flaggedReviews,
        },
      },
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to get overview' });
  }
};

// @desc    Get all customers
// @route   GET /api/admin/customers
// @access  Private (Admin)
const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { role: 'customer' };
    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
      ];
    }

    const [customers, total] = await Promise.all([
      User.find(query)
        .select('name email phone createdAt isActive address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { customers, pagination: { current: page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ success: false, message: 'Failed to get customers' });
  }
};

// @desc    Toggle customer active status
// @route   PUT /api/admin/customers/:id/toggle
// @access  Private (Admin)
const toggleCustomer = async (req, res) => {
  try {
    const customer = await User.findById(req.params.id);
    if (!customer || customer.role !== 'customer') {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    customer.isActive = !customer.isActive;
    await customer.save();
    res.json({ success: true, data: { customer }, message: `Customer ${customer.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('Toggle customer error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle customer' });
  }
};

// @desc    Get pending providers
// @route   GET /api/admin/providers/pending
// @access  Private (Admin)
const getPendingProviders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { role: 'housewife', isApproved: false };
    const [providers, total] = await Promise.all([
      User.find(query)
        .select('name email phone bio experience createdAt address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { providers, pagination: { current: page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get pending providers error:', error);
    res.status(500).json({ success: false, message: 'Failed to get pending providers' });
  }
};

// @desc    Get approved providers
// @route   GET /api/admin/providers/approved
// @access  Private (Admin)
const getApprovedProviders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { role: 'housewife', isApproved: true };
    if (req.query.search) {
      query.$or = [
        { name: new RegExp(req.query.search, 'i') },
        { email: new RegExp(req.query.search, 'i') },
      ];
    }

    const [providers, total] = await Promise.all([
      User.find(query)
        .select('name email phone bio experience rating createdAt isActive address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { providers, pagination: { current: page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get approved providers error:', error);
    res.status(500).json({ success: false, message: 'Failed to get approved providers' });
  }
};

// @desc    Approve a provider
// @route   PUT /api/admin/providers/:id/approve
// @access  Private (Admin)
const approveProvider = async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);
    if (!provider || provider.role !== 'housewife') {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    provider.isApproved = true;
    await provider.save();
    res.json({ success: true, data: { provider }, message: 'Provider approved' });
  } catch (error) {
    console.error('Approve provider error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve provider' });
  }
};

// @desc    Reject a provider
// @route   PUT /api/admin/providers/:id/reject
// @access  Private (Admin)
const rejectProvider = async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);
    if (!provider || provider.role !== 'housewife') {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    provider.isApproved = false;
    provider.isActive = false;
    await provider.save();
    res.json({ success: true, message: 'Provider rejected' });
  } catch (error) {
    console.error('Reject provider error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject provider' });
  }
};

// @desc    Toggle provider active status
// @route   PUT /api/admin/providers/:id/toggle
// @access  Private (Admin)
const toggleProvider = async (req, res) => {
  try {
    const provider = await User.findById(req.params.id);
    if (!provider || provider.role !== 'housewife') {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }
    provider.isActive = !provider.isActive;
    await provider.save();
    res.json({ success: true, data: { provider }, message: `Provider ${provider.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    console.error('Toggle provider error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle provider' });
  }
};

// @desc    Get all bookings (admin view)
// @route   GET /api/admin/bookings
// @access  Private (Admin)
const getBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status && req.query.status !== 'all') query.status = req.query.status;

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('customer', 'name email')
        .populate('provider', 'name email')
        .populate('service', 'title category pricing')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { bookings, pagination: { current: page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Admin get bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get bookings' });
  }
};

// @desc    Force-update booking status (admin override)
// @route   PUT /api/admin/bookings/:id/status
// @access  Private (Admin)
const forceUpdateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('customer', 'name')
      .populate('provider', 'name')
      .populate('service', 'title');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.json({ success: true, data: { booking } });
  } catch (error) {
    console.error('Force update booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking' });
  }
};

// @desc    Get all reviews (admin view)
// @route   GET /api/admin/reviews
// @access  Private (Admin)
const getReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.flagged === 'true') query.isFlagged = true;
    else if (req.query.flagged === 'false') query.isFlagged = { $ne: true };

    const [reviews, total, flaggedCount, ratingAgg] = await Promise.all([
      Review.find(query)
        .populate('customer', 'name email')
        .populate('provider', 'name email')
        .populate('service', 'title category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
      Review.countDocuments({ isFlagged: true }),
      Review.aggregate([
        { $group: { _id: null, avg: { $avg: { $ifNull: ['$rating.overall', '$rating'] } }, cnt: { $sum: 1 } } },
      ]),
    ]);

    const totalReviews = ratingAgg[0]?.cnt || 0;
    const averageRating = ratingAgg[0]?.avg ? Math.round(ratingAgg[0].avg * 10) / 10 : 0;

    res.json({
      success: true,
      data: {
        reviews,
        pagination: { current: page, limit, total, pages: Math.ceil(total / limit) },
        statistics: { totalReviews, averageRating, flaggedCount },
      },
    });
  } catch (error) {
    console.error('Admin get reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to get reviews' });
  }
};

// @desc    Flag/unflag a review
// @route   PUT /api/admin/reviews/:id/flag
// @access  Private (Admin)
const flagReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    review.isFlagged = !review.isFlagged;
    if (review.isFlagged) {
      review.flaggedBy = req.admin?.adminId || 'admin';
      review.flaggedAt = new Date();
      review.flagReason = req.body.reason || 'Flagged by admin';
    }
    await review.save();
    res.json({ success: true, data: { review } });
  } catch (error) {
    console.error('Flag review error:', error);
    res.status(500).json({ success: false, message: 'Failed to flag review' });
  }
};

// @desc    Delete a review
// @route   DELETE /api/admin/reviews/:id
// @access  Private (Admin)
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Recalculate service rating
    const reviewAgg = await Review.aggregate([
      { $match: { service: review.service, isVisible: true } },
      { $group: { _id: null, avg: { $avg: { $ifNull: ['$rating.overall', '$rating'] } }, cnt: { $sum: 1 } } },
    ]);
    if (reviewAgg.length > 0) {
      await Service.findByIdAndUpdate(review.service, {
        'rating.average': Math.round(reviewAgg[0].avg * 10) / 10,
        'rating.count': reviewAgg[0].cnt,
      });
    } else {
      await Service.findByIdAndUpdate(review.service, { 'rating.average': 0, 'rating.count': 0 });
    }

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete review' });
  }
};

// @desc    Change admin password
// @route   POST /api/admin/settings/password
// @access  Private (Admin)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Failed to change password' });
  }
};

// @desc    Admin logout
// @route   POST /api/admin/logout
// @access  Private (Admin)
const logout = async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
};

// @desc    Get analytics data (time-series for charts)
// @route   GET /api/admin/analytics
// @access  Private (Admin)
const getAnalytics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [bookingsByDay, revenueByDay, userGrowth, categoryDistribution, statusDistribution] = await Promise.all([
      // Bookings per day
      Booking.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$pricing.agreedAmount' }
        }},
        { $sort: { _id: 1 } }
      ]),
      // Revenue by day (completed only)
      Booking.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: 'completed' } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricing.agreedAmount' },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]),
      // User signups per day
      User.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: {
          _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, role: '$role' },
          count: { $sum: 1 }
        }},
        { $sort: { '_id.date': 1 } }
      ]),
      // Service category distribution
      Service.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 }, avgRating: { $avg: '$rating.average' } } },
        { $sort: { count: -1 } }
      ]),
      // Booking status distribution
      Booking.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
    ]);

    res.json({
      success: true,
      data: {
        period: days,
        bookingsByDay,
        revenueByDay,
        userGrowth,
        categoryDistribution,
        statusDistribution,
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to get analytics' });
  }
};

// ─── Activity Log ───────────────────────────────────────────

// @desc    Log an admin activity
// @route   POST /api/admin/activity
// @access  Private (Admin)
const logActivity = async (req, res) => {
  try {
    const { action, details, metadata } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || '';

    await AdminActivityLog.create({
      action,
      adminEmail: req.admin?.email || 'admin@example.com',
      ip,
      userAgent,
      details: details || '',
      metadata: metadata || {},
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Log activity error:', error);
    res.status(500).json({ success: false, message: 'Failed to log activity' });
  }
};

// @desc    Get activity logs
// @route   GET /api/admin/activity
// @access  Private (Admin)
const getActivityLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.action) query.action = req.query.action;

    const [logs, total] = await Promise.all([
      AdminActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AdminActivityLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: { logs, pagination: { current: page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ success: false, message: 'Failed to get activity logs' });
  }
};

// ─── Dashboard Export ───────────────────────────────────────

// @desc    Export dashboard data as CSV
// @route   GET /api/admin/export
// @access  Private (Admin)
const getDashboardExport = async (req, res) => {
  try {
    const { type = 'bookings', period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '90d' ? 90 : period === '365d' ? 365 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    let csvContent = '';
    let filename = '';

    if (type === 'bookings') {
      const bookings = await Booking.find({ createdAt: { $gte: startDate } })
        .populate('customer', 'name email')
        .populate('provider', 'name email')
        .populate('service', 'title category')
        .sort({ createdAt: -1 })
        .lean();

      csvContent = 'Date,Customer,Provider,Service,Category,Status,Amount\n';
      bookings.forEach(b => {
        const date = new Date(b.createdAt).toISOString().split('T')[0];
        const customer = (b.customer?.name || '').replace(/,/g, ' ');
        const provider = (b.provider?.name || '').replace(/,/g, ' ');
        const service = (b.service?.title || '').replace(/,/g, ' ');
        const category = b.service?.category || '';
        const amount = b.pricing?.agreedAmount || 0;
        csvContent += `${date},${customer},${provider},${service},${category},${b.status},${amount}\n`;
      });
      filename = `bookings_export_${period}.csv`;
    } else if (type === 'revenue') {
      const revenue = await Booking.aggregate([
        { $match: { createdAt: { $gte: startDate }, status: 'completed' } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$pricing.agreedAmount' },
          count: { $sum: 1 }
        }},
        { $sort: { _id: 1 } }
      ]);

      csvContent = 'Date,Revenue,Bookings Completed\n';
      revenue.forEach(r => { csvContent += `${r._id},${r.revenue},${r.count}\n`; });
      filename = `revenue_export_${period}.csv`;
    } else if (type === 'users') {
      const users = await User.find({ createdAt: { $gte: startDate } })
        .select('name email role createdAt isActive')
        .sort({ createdAt: -1 })
        .lean();

      csvContent = 'Date,Name,Email,Role,Active\n';
      users.forEach(u => {
        const date = new Date(u.createdAt).toISOString().split('T')[0];
        csvContent += `${date},${(u.name || '').replace(/,/g, ' ')},${u.email},${u.role},${u.isActive}\n`;
      });
      filename = `users_export_${period}.csv`;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid export type' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Failed to export data' });
  }
};

module.exports = {
  getOverview,
  getCustomers,
  toggleCustomer,
  getPendingProviders,
  getApprovedProviders,
  approveProvider,
  rejectProvider,
  toggleProvider,
  getBookings,
  forceUpdateBookingStatus,
  getReviews,
  flagReview,
  deleteReview,
  changePassword,
  logout,
  getAnalytics,
  getActivityLogs,
  logActivity,
  getDashboardExport,
};
