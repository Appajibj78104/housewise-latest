const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { uploadToCloudinary, uploadProfileImage } = require('../middleware/upload');
const { createNotification } = require('../utils/notifications');
const { getIO, emitToUser } = require('../config/socket');

// Get provider profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update provider profile
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user.id;
    const updateData = { ...req.body };

    // Handle profile image upload
    if (req.file) {
      try {
        const result = await uploadProfileImage(req.file.buffer);
        updateData.profileImage = result.secure_url;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({ message: 'Failed to upload image' });
      }
    }

    // Parse JSON fields if they come as strings
    if (typeof updateData.address === 'string') {
      updateData.address = JSON.parse(updateData.address);
    }
    if (typeof updateData.workingHours === 'string') {
      updateData.workingHours = JSON.parse(updateData.workingHours);
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new service
const createService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Service creation validation errors:', errors.array());
      console.error('Request body:', req.body);

      // Format error messages for better user experience
      const errorMessages = errors.array().map(error => error.msg);
      const message = errorMessages.length === 1
        ? errorMessages[0]
        : `Please fix the following issues: ${errorMessages.join(', ')}`;

      return res.status(400).json({
        message,
        errors: errors.array()
      });
    }

    const serviceData = {
      ...req.body,
      provider: req.user.id
    };

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      try {
        const imageUploads = await Promise.all(
          req.files.map(file => uploadToCloudinary(file.buffer, 'services'))
        );
        serviceData.images = imageUploads.map(result => ({
          url: result.secure_url,
          publicId: result.public_id
        }));
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({ message: 'Failed to upload images' });
      }
    }

    // JSON parsing is now done before validation

    const service = new Service(serviceData);
    await service.save();

    await service.populate('provider', 'name profileImage location rating');

    // Notify all customers about the new service
    User.find({ role: 'customer', isActive: { $ne: false } }).select('_id').lean()
      .then(customers => {
        const serviceName = service.title || service.category || 'a new service';
        const providerName = service.provider?.name || 'A provider';
        customers.forEach(c => {
          createNotification({
            user: c._id,
            type: 'service_new',
            title: 'New Service Available',
            message: `${providerName} is now offering "${serviceName}". Check it out!`,
            data: { serviceId: service._id, fromUser: req.user._id }
          });
        });
      })
      .catch(err => console.error('Failed to notify customers of new service:', err.message));

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service }
    });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get provider's services
const getMyServices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category } = req.query;
    const query = { provider: req.user.id };

    if (status === 'active') {
      query.$or = [{ status: 'active' }, { status: { $exists: false }, isActive: true }];
    } else if (status === 'inactive') {
      query.$or = [{ status: 'inactive' }, { status: { $exists: false }, isActive: false }];
    } else if (status) {
      query.status = status;
    }
    if (category) query.category = category;

    const services = await Service.find(query)
      .populate('provider', 'name profileImage location rating')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Ensure all services have a status field (backfill for old documents)
    const servicesWithStatus = services.map(svc => ({
      ...svc,
      status: svc.status || (svc.isActive !== false ? 'active' : 'inactive')
    }));

    const total = await Service.countDocuments(query);

    res.json({
      success: true,
      data: {
        services: servicesWithStatus,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update service
const updateService = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const serviceId = req.params.id;
    const updateData = { ...req.body };

    // Check if service belongs to the provider
    const service = await Service.findOne({ _id: serviceId, provider: req.user.id });
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      try {
        // Delete old images
        if (service.images && service.images.length > 0) {
          await Promise.all(
            service.images.map(img => deleteFromCloudinary(img.publicId))
          );
        }

        // Upload new images
        const imageUploads = await Promise.all(
          req.files.map(file => uploadToCloudinary(file.buffer, 'services'))
        );
        updateData.images = imageUploads.map(result => ({
          url: result.secure_url,
          publicId: result.public_id
        }));
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(400).json({ message: 'Failed to upload images' });
      }
    }

    // JSON parsing is now done before validation

    // Sync isActive from status
    if (updateData.status) {
      updateData.isActive = updateData.status === 'active';
    }

    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('provider', 'name profileImage location rating');

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: { service: updatedService }
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete service
const deleteService = async (req, res) => {
  try {
    const serviceId = req.params.id;

    const service = await Service.findOne({ _id: serviceId, provider: req.user.id });
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // Check if there are active bookings
    const activeBookings = await Booking.countDocuments({
      service: serviceId,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (activeBookings > 0) {
      return res.status(400).json({
        message: 'Cannot delete service with active bookings'
      });
    }

    // Delete images from cloudinary
    if (service.images && service.images.length > 0) {
      await Promise.all(
        service.images.map(img => deleteFromCloudinary(img.publicId))
      );
    }

    await Service.findByIdAndDelete(serviceId);

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get provider's bookings
const getMyBookings = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 10));
    const { status, date } = req.query;
    const query = { provider: req.user.id };

    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.scheduledDate = { $gte: startDate, $lt: endDate };
    }

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('customer', 'name email phone profileImage')
        .populate('service', 'title category pricing duration')
        .sort({ scheduledDate: -1, createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
      Booking.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        bookings,
        pagination: {
          current: page,
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get provider earnings (dedicated endpoint)
const getEarnings = async (req, res) => {
  try {
    const providerId = req.user.id;
    const providerObjId = new mongoose.Types.ObjectId(providerId);

    // Fetch all completed/resolved bookings + aggregation in parallel
    const [bookings, earningsAgg, categoryAgg] = await Promise.all([
      Booking.find({ provider: providerId, status: { $in: ['completed', 'resolved'] } })
        .populate('customer', 'name email phone profileImage')
        .populate('service', 'title category pricing duration')
        .sort({ scheduledDate: -1, createdAt: -1 })
        .lean(),
      Booking.aggregate([
        { $match: { provider: providerObjId, status: { $in: ['completed', 'resolved'] } } },
        { $group: { _id: null, total: { $sum: '$pricing.agreedAmount' }, count: { $sum: 1 } } }
      ]),
      Booking.aggregate([
        { $match: { provider: providerObjId, status: { $in: ['completed', 'resolved'] } } },
        { $lookup: { from: 'services', localField: 'service', foreignField: '_id', as: 'serviceInfo' } },
        { $unwind: { path: '$serviceInfo', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: '$serviceInfo.category',
          total: { $sum: '$pricing.agreedAmount' },
          count: { $sum: 1 }
        }},
        { $sort: { total: -1 } }
      ])
    ]);

    const totalEarnings = earningsAgg.length > 0 ? earningsAgg[0].total : 0;
    const completedCount = earningsAgg.length > 0 ? earningsAgg[0].count : 0;
    const avgEarning = completedCount > 0 ? Math.round(totalEarnings / completedCount) : 0;

    res.json({
      success: true,
      data: {
        bookings,
        summary: {
          totalEarnings,
          completedCount,
          avgEarning,
          categoryBreakdown: categoryAgg.map(c => ({
            category: c._id || 'other',
            total: c.total,
            count: c.count
          }))
        }
      }
    });
  } catch (error) {
    console.error('Get earnings error:', error);
    res.status(500).json({ success: false, message: 'Failed to load earnings data' });
  }
};

// Update booking status
const updateBookingStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const bookingId = req.params.id;
    const { status, notes } = req.body;

    const booking = await Booking.findOne({ _id: bookingId, provider: req.user.id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Validate status transitions (provider-side; aligned with bookingStateMachine)
    const validTransitions = {
      'quote_pending': ['confirmed', 'declined', 'cancelled'],
      'pending': ['confirmed', 'declined'],
      'confirmed': ['in_progress', 'completed', 'cancelled', 'no_show'],
      'in_progress': ['completed'],
      'declined': [],
      'completed': [],
      'cancelled': [],
      'no_show': []
    };

    if (!validTransitions[booking.status] || !validTransitions[booking.status].includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${booking.status} to ${status}`
      });
    }

    const fromStatus = booking.status;
    booking.status = status;
    if (notes) booking.providerNotes = notes;
    if (status === 'completed') {
      booking.completedAt = new Date();
      booking.completion = {
        completedAt: new Date(),
        completedBy: req.user.id
      };
      booking.subStatus = null;
    }
    if (status === 'in_progress') {
      booking.subStatus = 'working';
      booking.startedAt = booking.startedAt || new Date();
    }
    if (status === 'cancelled' || status === 'declined') {
      booking.cancellation = {
        cancelledBy: req.user.id,
        reason: notes || (status === 'declined' ? 'Provider declined the request' : 'Cancelled by provider'),
        cancelledAt: new Date()
      };
    }

    // Append to timeline
    booking.timeline = booking.timeline || [];
    booking.timeline.push({
      type: status === 'in_progress' ? 'started'
        : status === 'completed' ? 'completed'
        : status === 'declined' ? 'declined'
        : status === 'cancelled' ? 'cancelled'
        : status === 'no_show' ? 'cancelled'
        : 'confirmed',
      by: req.user.id,
      byRole: 'housewife',
      at: new Date(),
      message: notes || `Status updated from ${fromStatus} to ${status}`,
      data: { from: fromStatus, to: status }
    });

    await booking.save();

    // Update User and Service stats when booking is completed
    if (status === 'completed') {
      const earningsAmount = booking.pricing?.agreedAmount || 0;
      await Promise.all([
        User.findByIdAndUpdate(req.user.id, {
          $inc: { totalEarnings: earningsAmount, completedServices: 1 }
        }),
        Service.findByIdAndUpdate(booking.service, {
          $inc: { totalBookings: 1 }
        })
      ]);
    }

    await booking.populate([
      { path: 'customer', select: 'name email phone profileImage' },
      { path: 'service', select: 'title category pricing duration' }
    ]);

    // Notify customer about booking status change
    const statusMessages = {
      confirmed: { type: 'booking_confirmed', title: 'Booking Confirmed', msg: `Your booking for "${booking.service?.title}" has been confirmed` },
      declined: { type: 'booking_declined', title: 'Booking Declined', msg: `Your booking for "${booking.service?.title}" has been declined` },
      completed: { type: 'booking_completed', title: 'Service Completed', msg: `Your service "${booking.service?.title}" has been completed` },
      cancelled: { type: 'booking_cancelled', title: 'Booking Cancelled', msg: `Your booking for "${booking.service?.title}" has been cancelled by the provider` },
    };
    const info = statusMessages[status];
    if (info && booking.customer?._id) {
      createNotification({
        user: booking.customer._id,
        type: info.type,
        title: info.title,
        message: info.msg,
        data: { bookingId: booking._id, serviceId: booking.service?._id, fromUser: req.user._id }
      });
    }

    // Emit real-time socket event to notify customer of status change
    // This triggers immediate UI refresh without page reload
    if (booking.customer?._id) {
      const io = getIO();
      io.to(`user:${booking.customer._id}`).emit('booking:status-changed', {
        bookingId: booking._id,
        status: status,
        previousStatus: fromStatus,
        message: `Booking status changed to ${status}`
      });
    }

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: { booking }
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get provider dashboard data
const getDashboard = async (req, res) => {
  try {
    const providerId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const providerObjId = new mongoose.Types.ObjectId(providerId);

    // Run ALL queries in parallel — single round-trip batch
    const [
      todaysBookings,
      totalServices,
      activeServices,
      totalBookings,
      completedServices,
      pendingBookings,
      confirmedBookings,
      reviews,
      earningsAgg,
      recentBookings
    ] = await Promise.all([
      // Today's bookings
      Booking.find({
        provider: providerId,
        scheduledDate: { $gte: today, $lt: tomorrow }
      })
      .populate('customer', 'name phone')
      .populate('service', 'title')
      .sort({ 'scheduledTime.start': 1 })
      .lean(),

      // Stats counts (note: resolved bookings also count as completed)
      Service.countDocuments({ provider: providerId }),
      Service.countDocuments({ provider: providerId, isActive: true }),
      Booking.countDocuments({ provider: providerId }),
      Booking.countDocuments({ provider: providerId, status: { $in: ['completed', 'resolved'] } }),
      Booking.countDocuments({ provider: providerId, status: 'pending' }),
      Booking.countDocuments({ provider: providerId, status: 'confirmed' }),
      Review.find({ provider: providerId }).select('rating').lean(),

      // Earnings aggregation (include resolved bookings)
      Booking.aggregate([
        { $match: { provider: providerObjId, status: { $in: ['completed', 'resolved'] } } },
        { $group: { _id: null, total: { $sum: '$pricing.agreedAmount' } } }
      ]),

      // Recent bookings
      Booking.find({ provider: providerId })
        .populate('customer', 'name')
        .populate('service', 'title')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    // Calculate average rating
    const averageRating = reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating.overall, 0) / reviews.length
      : 0;

    // Calculate total earnings from aggregation
    const totalEarnings = earningsAgg.length > 0 ? earningsAgg[0].total : 0;

    // Sync User model earnings in background (non-blocking)
    // Note: completedServices includes resolved bookings
    User.findByIdAndUpdate(providerId, {
      totalEarnings,
      completedServices
    }).catch(err => console.error('Sync user earnings error:', err));

    res.json({
      success: true,
      data: {
        stats: {
          totalServices,
          activeServices,
          totalBookings,
          completedServices,
          pendingBookings,
          confirmedBookings,
          totalEarnings,
          averageRating: Math.round(averageRating * 10) / 10,
          totalReviews: reviews.length
        },
        todaysBookings,
        recentBookings
      }
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Toggle availability
const toggleAvailability = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { isAvailable } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { isAvailable },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: `Availability ${isAvailable ? 'enabled' : 'disabled'} successfully`,
      data: { user }
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update payment info on a completed booking
const updatePaymentInfo = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
    }

    const booking = await Booking.findOne({ _id: req.params.id, provider: req.user.id });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Payment info can only be updated for completed bookings' });
    }

    const { paymentMethod, transactionId, paymentNote } = req.body;
    if (paymentMethod) booking.pricing.paymentMethod = paymentMethod;
    if (transactionId !== undefined) booking.pricing.transactionId = transactionId || undefined;
    if (paymentNote !== undefined) booking.pricing.paymentNote = paymentNote || undefined;
    booking.pricing.paymentUpdatedAt = new Date();

    await booking.save();
    await booking.populate([
      { path: 'customer', select: 'name email phone profileImage' },
      { path: 'service', select: 'title category pricing duration' }
    ]);

    res.json({ success: true, data: { booking } });
  } catch (error) {
    console.error('Update payment info error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Save or update a draft service (relaxed validation)
const saveDraft = async (req, res) => {
  try {
    const draftData = {
      ...req.body,
      provider: req.user.id,
      status: 'draft',
      isActive: false
    };

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      try {
        const imageUploads = await Promise.all(
          req.files.map(file => uploadToCloudinary(file.buffer, 'services'))
        );
        draftData.images = imageUploads.map(result => ({
          url: result.secure_url,
          publicId: result.public_id
        }));
      } catch (uploadError) {
        console.error('Draft image upload error:', uploadError);
        // Don't fail draft save for image upload issues
      }
    }

    let service;
    if (req.body._draftId) {
      // Update existing draft
      service = await Service.findOneAndUpdate(
        { _id: req.body._draftId, provider: req.user.id, status: 'draft' },
        { $set: draftData },
        { new: true, runValidators: false }
      );
      if (!service) {
        // Draft not found, create new
        delete draftData._draftId;
        service = new Service(draftData);
        await service.save({ validateBeforeSave: false });
      }
    } else {
      delete draftData._draftId;
      service = new Service(draftData);
      await service.save({ validateBeforeSave: false });
    }

    res.status(200).json({
      success: true,
      message: 'Draft saved',
      data: { service }
    });
  } catch (error) {
    console.error('Save draft error:', error);
    res.status(500).json({ message: 'Failed to save draft' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  createService,
  getMyServices,
  updateService,
  deleteService,
  getMyBookings,
  getEarnings,
  updateBookingStatus,
  updatePaymentInfo,
  getDashboard,
  toggleAvailability,
  saveDraft
};
