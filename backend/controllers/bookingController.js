const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { createNotification } = require('../utils/notifications');
const crypto = require('crypto');

// @desc    Create a booking
// @route   POST /api/bookings
// @access  Private (Customer)
const createBooking = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { serviceId, scheduledDate, scheduledTime, location, notes } = req.body;

    const service = await Service.findById(serviceId).populate('provider', 'name');
    if (!service || !service.isActive) {
      return res.status(404).json({ success: false, message: 'Service not found or inactive' });
    }

    const bookingId = `BK-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const booking = await Booking.create({
      bookingId,
      customer: req.user._id,
      provider: service.provider._id,
      service: service._id,
      scheduledDate,
      scheduledTime,
      location: location || { type: 'customer_address' },
      pricing: { agreedAmount: service.pricing.amount || 0 },
      notes,
      status: 'pending',
    });

    const populated = await Booking.findById(booking._id)
      .populate('service', 'title category pricing')
      .populate('provider', 'name profileImage')
      .populate('customer', 'name phone');

    try {
      await createNotification({
        recipient: service.provider._id,
        type: 'new_booking',
        title: 'New Booking Request',
        message: `New booking for ${service.title}`,
        relatedBooking: booking._id,
      });
    } catch (notifErr) {
      console.error('Notification error:', notifErr.message);
    }

    res.status(201).json({ success: true, data: { booking: populated } });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
};

// @desc    Get bookings for current user
// @route   GET /api/bookings
// @access  Private
const getBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = req.user.role === 'housewife'
      ? { provider: req.user._id }
      : { customer: req.user._id };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('service', 'title category pricing images')
        .populate('provider', 'name profileImage phone')
        .populate('customer', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Booking.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to get bookings' });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('service', 'title category pricing images description')
      .populate('provider', 'name profileImage phone email address')
      .populate('customer', 'name phone email address');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Ensure user is part of the booking
    const userId = req.user._id.toString();
    if (
      booking.customer._id.toString() !== userId &&
      booking.provider._id.toString() !== userId &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, data: { booking } });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ success: false, message: 'Failed to get booking' });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id/status
// @access  Private
const { canTransition, getAvailableTransitions } = require('../config/bookingStateMachine');

const updateBookingStatus = async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const userId = req.user._id.toString();
    if (
      booking.customer.toString() !== userId &&
      booking.provider.toString() !== userId &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // State machine validation
    const transition = canTransition(booking.status, status, req.user.role, userId, booking);
    if (!transition.allowed) {
      return res.status(400).json({ success: false, message: transition.reason });
    }

    booking.status = status;
    if (status === 'cancelled' && cancellationReason) {
      booking.cancellation = { reason: cancellationReason, cancelledBy: req.user._id, cancelledAt: new Date() };
    }
    if (status === 'completed') {
      booking.completion = { completedAt: new Date(), completedBy: req.user._id };
      await User.findByIdAndUpdate(booking.provider, { $inc: { completedServices: 1 } });
      await Service.findByIdAndUpdate(booking.service, { $inc: { totalBookings: 1 } });

      // Referral reward: check if this referred user hasn't been rewarded yet
      try {
        const Referral = require('../models/Referral');
        const referral = await Referral.findOne({ 'referredUsers.user': booking.customer });
        if (referral) {
          const referredEntry = referral.referredUsers.find(r => r.user.toString() === booking.customer.toString());
          if (referredEntry && referredEntry.status === 'registered') {
            referredEntry.status = 'first_booking';
            referredEntry.rewardedAt = new Date();
            referral.successfulReferrals += 1;
            referral.totalRewardsEarned += 50; // ₹50 reward per successful referral
            await referral.save();
            // Notify the referrer
            const { createNotification } = require('../utils/notifications');
            await createNotification({
              recipient: referral.referrer,
              type: 'referral',
              title: 'Referral Reward!',
              message: 'Your referral completed their first booking! ₹50 reward earned.',
              data: { reward: 50 }
            });
          }
        }
      } catch (refErr) { /* non-critical */ }

      // Gamification: check for new badges after booking completion
      try {
        const Booking = require('../models/Booking');
        const Review = require('../models/Review');
        const BADGES = {
          new_provider: { id: 'new_provider', name: 'New Provider', icon: '🌟', description: 'Welcome to the platform', tier: 'bronze' },
          first_booking: { id: 'first_booking', name: 'First Booking', icon: '🎯', description: 'Completed first booking', tier: 'bronze' },
          ten_bookings: { id: 'ten_bookings', name: 'Rising Star', icon: '🚀', description: 'Completed 10 bookings', tier: 'silver' },
          fifty_bookings: { id: 'fifty_bookings', name: 'Expert', icon: '💎', description: 'Completed 50 bookings', tier: 'gold' },
          hundred_bookings: { id: 'hundred_bookings', name: 'Master', icon: '👑', description: 'Completed 100 bookings', tier: 'platinum' },
        };
        const completedCount = await Booking.countDocuments({ provider: booking.provider, status: 'completed' }) + 1; // +1 for current
        const provider = await User.findById(booking.provider);
        const previousBadges = provider?.earnedBadges || [];
        const earned = ['new_provider'];
        if (completedCount >= 1) earned.push('first_booking');
        if (completedCount >= 10) earned.push('ten_bookings');
        if (completedCount >= 50) earned.push('fifty_bookings');
        if (completedCount >= 100) earned.push('hundred_bookings');
        const newBadgeIds = earned.filter(id => !previousBadges.includes(id));
        if (newBadgeIds.length > 0) {
          await User.findByIdAndUpdate(booking.provider, { $addToSet: { earnedBadges: { $each: earned } } });
          for (const badgeId of newBadgeIds) {
            const badge = BADGES[badgeId];
            if (badge) {
              await createNotification({
                recipient: booking.provider,
                type: 'badge_earned',
                title: 'New Badge Earned! 🎉',
                message: `You earned the "${badge.name}" badge: ${badge.description}`,
                data: { badgeId: badge.id, badgeIcon: badge.icon }
              });
            }
          }
        }
      } catch (badgeErr) { /* non-critical */ }

      // Gamification: check level-up
      try {
        const LEVELS = [
          { level: 1, name: 'Beginner', minBookings: 0, minRating: 0 },
          { level: 2, name: 'Intermediate', minBookings: 5, minRating: 3.0 },
          { level: 3, name: 'Advanced', minBookings: 20, minRating: 3.5 },
          { level: 4, name: 'Expert', minBookings: 50, minRating: 4.0 },
          { level: 5, name: 'Master', minBookings: 100, minRating: 4.5 },
        ];
        const prov = await User.findById(booking.provider);
        const count = (prov?.completedServices || 0) + 1;
        const rating = prov?.rating?.average || 0;
        const prevLevel = prov?.gamificationLevel || 1;
        let newLevel = 1;
        for (const l of LEVELS) {
          if (count >= l.minBookings && rating >= l.minRating) newLevel = l.level;
        }
        if (newLevel > prevLevel) {
          await User.findByIdAndUpdate(booking.provider, { gamificationLevel: newLevel });
          const levelName = LEVELS.find(l => l.level === newLevel)?.name || 'Unknown';
          await createNotification({
            recipient: booking.provider,
            type: 'level_up',
            title: `Level Up! 🆙`,
            message: `Congratulations! You've reached Level ${newLevel} (${levelName})`,
            data: { level: newLevel, levelName }
          });
        }
      } catch (lvlErr) { /* non-critical */ }
    }

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('service', 'title category pricing')
      .populate('provider', 'name profileImage')
      .populate('customer', 'name phone');

    // Notify the other party
    const recipientId = userId === booking.customer.toString() ? booking.provider : booking.customer;
    try {
      await createNotification({
        recipient: recipientId,
        type: 'booking_update',
        title: 'Booking Updated',
        message: `Booking status changed to ${status}`,
        relatedBooking: booking._id,
      });
    } catch (notifErr) {
      console.error('Notification error:', notifErr.message);
    }

    res.json({ success: true, data: { booking: updated } });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking status' });
  }
};

// @desc    Get available transitions for a booking
// @route   GET /api/bookings/:id/transitions
// @access  Private
const getBookingTransitions = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const userId = req.user._id.toString();
    if (
      booking.customer.toString() !== userId &&
      booking.provider.toString() !== userId &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const transitions = getAvailableTransitions(booking.status, req.user.role);
    res.json({ success: true, data: { currentStatus: booking.status, availableTransitions: transitions } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get transitions' });
  }
};

module.exports = {
  createBooking,
  getBookings,
  getBookingById,
  updateBookingStatus,
  getBookingTransitions,
};
