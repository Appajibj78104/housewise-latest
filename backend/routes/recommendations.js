const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Service = require('../models/Service');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const User = require('../models/User');

// GET /api/recommendations - Get personalized recommendations
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);

    // Get user's booking history for preferences
    const pastBookings = await Booking.find({ customer: userId, status: 'completed' })
      .populate('service', 'category provider')
      .sort({ createdAt: -1 })
      .limit(20);

    // Extract preferred categories and providers
    const categoryCount = {};
    const bookedProviders = new Set();
    const bookedServiceIds = [];
    pastBookings.forEach(b => {
      if (b.service) {
        categoryCount[b.service.category] = (categoryCount[b.service.category] || 0) + 1;
        bookedProviders.add(b.service.provider.toString());
        bookedServiceIds.push(b.service._id);
      }
    });

    const preferredCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    const hasHistory = pastBookings.length > 0;

    // Build recommendation pipeline
    let pipeline = [
      { $match: { isActive: true, isApproved: true } },
      { $lookup: { from: 'users', localField: 'provider', foreignField: '_id', as: 'providerData' } },
      { $unwind: '$providerData' },
      { $match: { 'providerData.isActive': { $ne: false }, 'providerData.isApproved': { $ne: false } } },
    ];

    // Scoring logic
    pipeline.push({
      $addFields: {
        // Category preference score (0-30) — only applies if user has history
        categoryScore: hasHistory ? {
          $cond: {
            if: { $in: ['$category', preferredCategories] },
            then: 30,
            else: 0
          }
        } : { $literal: 0 },
        // Rating score (0-25)
        ratingScore: { $multiply: [{ $ifNull: ['$rating.average', 0] }, 5] },
        // Popularity score (0-20)
        popularityScore: { $min: [{ $multiply: [{ $ifNull: ['$totalBookings', 0] }, 0.4] }, 20] },
        // Recency bonus for newer services (0-15)
        recencyScore: {
          $cond: {
            if: { $gte: ['$createdAt', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
            then: 15,
            else: { $cond: { if: { $gte: ['$createdAt', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)] }, then: 8, else: 0 } }
          }
        },
        // Provider rating bonus (0-10)
        providerBonus: { $multiply: [{ $ifNull: ['$providerData.rating.average', 0] }, 2] }
      }
    });

    pipeline.push({
      $addFields: {
        recommendationScore: { $add: ['$categoryScore', '$ratingScore', '$popularityScore', '$recencyScore', '$providerBonus'] }
      }
    });

    // Exclude already booked services in last 7 days
    if (hasHistory) {
      const recentBookedServices = pastBookings
        .filter(b => new Date(b.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        .map(b => b.service?._id)
        .filter(Boolean);

      if (recentBookedServices.length > 0) {
        pipeline.push({ $match: { _id: { $nin: recentBookedServices } } });
      }
    }

    pipeline.push(
      { $sort: { recommendationScore: -1 } },
      { $limit: limit },
      { $project: {
        title: 1, description: 1, category: 1, pricing: 1, rating: 1,
        images: 1, totalBookings: 1, recommendationScore: 1, createdAt: 1,
        provider: {
          _id: '$providerData._id',
          name: '$providerData.name',
          profileImage: '$providerData.profileImage',
          rating: '$providerData.rating',
        },
      }}
    );

    const recommendations = await Service.aggregate(pipeline);

    // Tag each with reason
    const tagged = recommendations.map(s => {
      const reasons = [];
      if (hasHistory && preferredCategories.includes(s.category)) reasons.push('based_on_history');
      if (s.rating?.average >= 4.5) reasons.push('highly_rated');
      if (s.totalBookings >= 10) reasons.push('popular');
      if (new Date(s.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) reasons.push('new');
      return { ...s, reasons: reasons.length > 0 ? reasons : ['suggested'] };
    });

    res.json({
      success: true,
      data: {
        services: tagged,
        basedOn: { preferredCategories, bookingCount: pastBookings.length, hasHistory }
      }
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ success: false, message: 'Failed to get recommendations' });
  }
});

// GET /api/recommendations/similar/:serviceId - Get similar services
router.get('/similar/:serviceId', async (req, res) => {
  try {
    const service = await Service.findById(req.params.serviceId);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    const similar = await Service.find({
      _id: { $ne: service._id },
      category: service.category,
      isActive: true,
      isApproved: true
    })
      .populate('provider', 'name profileImage rating')
      .sort({ 'rating.average': -1 })
      .limit(6);

    res.json({ success: true, data: { services: similar } });
  } catch (error) {
    console.error('Similar services error:', error);
    res.status(500).json({ success: false, message: 'Failed to get similar services' });
  }
});

// GET /api/recommendations/trending - Get trending services
router.get('/trending', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // Aggregate recent bookings to find trending services
    let trending = await Booking.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: '$service', bookingCount: { $sum: 1 } } },
      { $sort: { bookingCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: 'services', localField: '_id', foreignField: '_id', as: 'serviceData' } },
      { $unwind: '$serviceData' },
      { $match: { 'serviceData.isActive': true, 'serviceData.isApproved': true } },
      { $lookup: { from: 'users', localField: 'serviceData.provider', foreignField: '_id', as: 'providerData' } },
      { $unwind: '$providerData' },
      { $project: {
        _id: '$serviceData._id',
        title: '$serviceData.title',
        category: '$serviceData.category',
        pricing: '$serviceData.pricing',
        rating: '$serviceData.rating',
        images: '$serviceData.images',
        totalBookings: '$serviceData.totalBookings',
        bookingCount: 1,
        provider: { name: '$providerData.name', profileImage: '$providerData.profileImage', _id: '$providerData._id', rating: '$providerData.rating' }
      }}
    ]);

    // Fallback: if no trending found, return top-rated active services
    if (trending.length === 0) {
      trending = await Service.find({ isActive: true, isApproved: true })
        .populate('provider', 'name profileImage rating')
        .sort({ 'rating.average': -1, totalBookings: -1 })
        .limit(10)
        .lean();
    }

    res.json({ success: true, data: { services: trending } });
  } catch (error) {
    console.error('Trending error:', error);
    res.status(500).json({ success: false, message: 'Failed to get trending services' });
  }
});

module.exports = router;
