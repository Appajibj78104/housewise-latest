const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { createNotification } = require('../utils/notifications');

// Badge definitions
const BADGES = {
  new_provider: { id: 'new_provider', name: 'New Provider', nameHi: 'नया प्रदाता', icon: '🌟', description: 'Welcome to the platform', tier: 'bronze' },
  first_booking: { id: 'first_booking', name: 'First Booking', nameHi: 'पहली बुकिंग', icon: '🎯', description: 'Completed first booking', tier: 'bronze' },
  five_star: { id: 'five_star', name: 'Five Star', nameHi: 'पांच सितारा', icon: '⭐', description: 'Received a 5-star review', tier: 'silver' },
  ten_bookings: { id: 'ten_bookings', name: 'Rising Star', nameHi: 'उभरता सितारा', icon: '🚀', description: 'Completed 10 bookings', tier: 'silver' },
  fifty_bookings: { id: 'fifty_bookings', name: 'Expert', nameHi: 'विशेषज्ञ', icon: '💎', description: 'Completed 50 bookings', tier: 'gold' },
  hundred_bookings: { id: 'hundred_bookings', name: 'Master', nameHi: 'मास्टर', icon: '👑', description: 'Completed 100 bookings', tier: 'platinum' },
  high_rated: { id: 'high_rated', name: 'Top Rated', nameHi: 'शीर्ष रेटेड', icon: '🏆', description: 'Maintained 4.5+ rating with 10+ reviews', tier: 'gold' },
  quick_responder: { id: 'quick_responder', name: 'Quick Responder', nameHi: 'तेज़ जवाब', icon: '⚡', description: 'Average response time under 30 minutes', tier: 'silver' },
  loyal_provider: { id: 'loyal_provider', name: 'Loyal Provider', nameHi: 'वफ़ादार प्रदाता', icon: '💝', description: 'Active for over 6 months', tier: 'gold' },
  community_favorite: { id: 'community_favorite', name: 'Community Favorite', nameHi: 'समुदाय का पसंदीदा', icon: '🌈', description: '90%+ would recommend rate', tier: 'platinum' },
};

// Level definitions
const LEVELS = [
  { level: 1, name: 'Beginner', nameHi: 'शुरुआत', minBookings: 0, minRating: 0 },
  { level: 2, name: 'Intermediate', nameHi: 'मध्यम', minBookings: 5, minRating: 3.0 },
  { level: 3, name: 'Advanced', nameHi: 'उन्नत', minBookings: 20, minRating: 3.5 },
  { level: 4, name: 'Expert', nameHi: 'विशेषज्ञ', minBookings: 50, minRating: 4.0 },
  { level: 5, name: 'Master', nameHi: 'मास्टर', minBookings: 100, minRating: 4.5 },
];

// Calculate provider badges
const calculateBadges = async (providerId) => {
  const provider = await User.findById(providerId);
  if (!provider || provider.role !== 'housewife') return [];

  const completedBookings = await Booking.countDocuments({ provider: providerId, status: 'completed' });
  const reviews = await Review.find({ provider: providerId, isVisible: true });
  const fiveStarReviews = reviews.filter(r => r.rating.overall === 5);
  const recommendRate = reviews.length > 0 ? reviews.filter(r => r.wouldRecommend).length / reviews.length : 0;
  const accountAge = (Date.now() - new Date(provider.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  const earned = [];
  earned.push(BADGES.new_provider);
  if (completedBookings >= 1) earned.push(BADGES.first_booking);
  if (fiveStarReviews.length > 0) earned.push(BADGES.five_star);
  if (completedBookings >= 10) earned.push(BADGES.ten_bookings);
  if (completedBookings >= 50) earned.push(BADGES.fifty_bookings);
  if (completedBookings >= 100) earned.push(BADGES.hundred_bookings);
  if (provider.rating.average >= 4.5 && provider.rating.count >= 10) earned.push(BADGES.high_rated);
  if (provider.avgResponseTime && provider.avgResponseTime <= 30) earned.push(BADGES.quick_responder);
  if (accountAge >= 180) earned.push(BADGES.loyal_provider);
  if (recommendRate >= 0.9 && reviews.length >= 5) earned.push(BADGES.community_favorite);

  return earned;
};

// Calculate provider level
const calculateLevel = (completedBookings, avgRating) => {
  let currentLevel = LEVELS[0];
  for (const level of LEVELS) {
    if (completedBookings >= level.minBookings && avgRating >= level.minRating) {
      currentLevel = level;
    }
  }
  return currentLevel;
};

// GET /api/gamification/badges/:providerId - Get provider badges
router.get('/badges/:providerId', async (req, res) => {
  try {
    const badges = await calculateBadges(req.params.providerId);
    res.json({ success: true, data: { badges } });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({ success: false, message: 'Failed to get badges' });
  }
});

// GET /api/gamification/level/:providerId - Get provider level
router.get('/level/:providerId', async (req, res) => {
  try {
    const provider = await User.findById(req.params.providerId);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

    const completedBookings = await Booking.countDocuments({ provider: req.params.providerId, status: 'completed' });
    const level = calculateLevel(completedBookings, provider.rating.average || 0);
    const nextLevel = LEVELS.find(l => l.level === level.level + 1);

    res.json({
      success: true,
      data: {
        currentLevel: level,
        nextLevel: nextLevel || null,
        completedBookings,
        rating: provider.rating.average || 0,
        progress: nextLevel ? {
          bookingsNeeded: Math.max(0, nextLevel.minBookings - completedBookings),
          ratingNeeded: Math.max(0, nextLevel.minRating - (provider.rating.average || 0))
        } : null
      }
    });
  } catch (error) {
    console.error('Get level error:', error);
    res.status(500).json({ success: false, message: 'Failed to get level' });
  }
});

// GET /api/gamification/profile/:providerId - Full gamification profile
router.get('/profile/:providerId', async (req, res) => {
  try {
    const provider = await User.findById(req.params.providerId);
    if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

    const completedBookings = await Booking.countDocuments({ provider: req.params.providerId, status: 'completed' });
    const badges = await calculateBadges(req.params.providerId);
    const level = calculateLevel(completedBookings, provider.rating.average || 0);
    const nextLevel = LEVELS.find(l => l.level === level.level + 1);

    res.json({
      success: true,
      data: {
        badges,
        level: {
          current: level,
          next: nextLevel || null,
          progress: nextLevel ? {
            bookingsNeeded: Math.max(0, nextLevel.minBookings - completedBookings),
            ratingNeeded: Math.max(0, nextLevel.minRating - (provider.rating.average || 0))
          } : null
        },
        stats: {
          completedBookings,
          rating: provider.rating.average || 0,
          reviewCount: provider.rating.count || 0,
          memberSince: provider.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get gamification profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get gamification profile' });
  }
});

// GET /api/gamification/leaderboard - Top providers
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    
    const topProviders = await User.find({
      role: 'housewife',
      isActive: true,
      isApproved: true,
      'rating.count': { $gte: 3 }
    })
      .select('name profileImage rating completedServices')
      .sort({ 'rating.average': -1, completedServices: -1 })
      .limit(limit);

    const leaderboard = topProviders.map((p, idx) => ({
      rank: idx + 1,
      provider: { _id: p._id, name: p.name, profileImage: p.profileImage },
      rating: p.rating.average,
      reviewCount: p.rating.count,
      completedServices: p.completedServices || 0
    }));

    res.json({ success: true, data: { leaderboard } });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Failed to get leaderboard' });
  }
});

// POST /api/gamification/check-badges - Check for new badges and notify (called after booking completion)
router.post('/check-badges', authenticateToken, async (req, res) => {
  try {
    const providerId = req.body.providerId || req.user._id;
    const provider = await User.findById(providerId);
    if (!provider || provider.role !== 'housewife') {
      return res.status(400).json({ success: false, message: 'Provider not found' });
    }

    const badges = await calculateBadges(providerId);
    const previousBadges = provider.earnedBadges || [];
    const newBadges = badges.filter(b => !previousBadges.includes(b.id));

    if (newBadges.length > 0) {
      // Store earned badge IDs on provider
      await User.findByIdAndUpdate(providerId, {
        $set: { earnedBadges: badges.map(b => b.id) }
      });

      // Notify for each new badge
      for (const badge of newBadges) {
        try {
          await createNotification({
            recipient: providerId,
            type: 'badge_earned',
            title: 'New Badge Earned! 🎉',
            message: `Congratulations! You earned the "${badge.name}" badge: ${badge.description}`,
            data: { badgeId: badge.id, badgeIcon: badge.icon }
          });
        } catch { /* non-critical */ }
      }
    }

    res.json({ success: true, data: { badges, newBadges } });
  } catch (error) {
    console.error('Check badges error:', error);
    res.status(500).json({ success: false, message: 'Failed to check badges' });
  }
});

module.exports = router;
