const User = require('../models/User');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { validationResult } = require('express-validator');

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

// @desc    Update current user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const allowedFields = ['name', 'phone', 'address', 'bio', 'experience', 'profileImage', 'workingHours'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: { user }, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// @desc    Get all housewives (providers) with pagination
// @route   GET /api/users/housewives
// @access  Public
const getHousewives = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const query = {
      role: 'housewife',
      isActive: true,
      isApproved: true,
    };

    if (req.query.city) {
      query['address.city'] = new RegExp(req.query.city, 'i');
    }

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    const [housewives, total] = await Promise.all([
      User.find(query)
        .select('name bio experience rating profileImage address completedServices')
        .sort({ 'rating.average': -1, completedServices: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        housewives,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Get housewives error:', error);
    res.status(500).json({ success: false, message: 'Failed to get housewives' });
  }
};

// @desc    Get housewife by ID
// @route   GET /api/users/housewives/:id
// @access  Public
const getHousewifeById = async (req, res) => {
  try {
    const housewife = await User.findOne({
      _id: req.params.id,
      role: 'housewife',
      isActive: true,
    }).select('-password').lean();

    if (!housewife) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    const services = await Service.find({
      provider: housewife._id,
      isActive: true,
      isApproved: true,
    })
      .select('title category pricing rating images')
      .lean();

    res.json({
      success: true,
      data: { housewife, services },
    });
  } catch (error) {
    console.error('Get housewife by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to get provider details' });
  }
};

// @desc    Get generic user dashboard (redirects data based on role)
// @route   GET /api/users/dashboard
// @access  Private
const getDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const bookingQuery = user.role === 'housewife'
      ? { provider: user._id }
      : { customer: user._id };

    const [totalBookings, recentBookings] = await Promise.all([
      Booking.countDocuments(bookingQuery),
      Booking.find(bookingQuery)
        .populate('service', 'title category')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.json({
      success: true,
      data: {
        user,
        stats: { totalBookings },
        recentBookings,
      },
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to get dashboard' });
  }
};

// @desc    Deactivate user account
// @route   POST /api/users/deactivate
// @access  Private
const deactivateAccount = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (error) {
    console.error('Deactivate account error:', error);
    res.status(500).json({ success: false, message: 'Failed to deactivate account' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getHousewives,
  getHousewifeById,
  getDashboard,
  deactivateAccount,
};
