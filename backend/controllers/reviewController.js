const Review = require('../models/Review');
const Service = require('../models/Service');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { validationResult } = require('express-validator');
const { createNotification } = require('../utils/notifications');

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private (Customer)
const createReview = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { serviceId, bookingId, rating, comment, pros, cons, wouldRecommend } = req.body;

    // Verify customer booked this service
    // Booking must be either 'completed' OR 'resolved' (from settled dispute)
    const booking = await Booking.findOne({
      _id: bookingId,
      customer: req.user._id,
      service: serviceId,
      status: { $in: ['completed', 'resolved'] },
    });

    if (!booking) {
      return res.status(400).json({ success: false, message: 'You can only review completed or resolved bookings' });
    }

    // Check for existing review
    const existingReview = await Review.findOne({ customer: req.user._id, booking: bookingId });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this booking' });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found' });
    }

    const review = await Review.create({
      customer: req.user._id,
      provider: service.provider,
      service: serviceId,
      booking: bookingId,
      rating: typeof rating === 'object' ? rating : { overall: rating },
      comment,
      pros,
      cons,
      wouldRecommend: wouldRecommend !== false,
    });

    // Mark booking as reviewed
    await Booking.findByIdAndUpdate(bookingId, { isReviewed: true });

    // Update service rating
    const reviewAgg = await Review.aggregate([
      { $match: { service: service._id, isVisible: true } },
      { $group: { _id: null, avg: { $avg: { $ifNull: ['$rating.overall', '$rating'] } }, cnt: { $sum: 1 } } },
    ]);
    if (reviewAgg.length > 0) {
      service.rating.average = Math.round(reviewAgg[0].avg * 10) / 10;
      service.rating.count = reviewAgg[0].cnt;
      await service.save();
    }

    const populated = await Review.findById(review._id)
      .populate('customer', 'name profileImage')
      .populate('service', 'title category');

    try {
      await createNotification({
        recipient: service.provider,
        type: 'new_review',
        title: 'New Review',
        message: `You received a new review for ${service.title}`,
        relatedReview: review._id,
      });
    } catch (notifErr) {
      console.error('Notification error:', notifErr.message);
    }

    // Auto-analyze review sentiment (before response so tags are included)
    try {
      const POSITIVE_WORDS = ['excellent','amazing','wonderful','fantastic','great','good','nice','perfect','love','best','outstanding','superb','brilliant','recommend','professional','friendly','polite','punctual','clean','thorough','efficient','helpful','skilled','reliable','satisfied','happy','awesome','exceptional','quality'];
      const NEGATIVE_WORDS = ['terrible','awful','horrible','bad','worst','poor','disappointing','rude','late','dirty','unprofessional','slow','expensive','waste','avoid','complaint','damaged','unsatisfied','frustrated','angry','unacceptable','incompetent','careless','dishonest','unreliable','overpriced'];
      const ASPECTS = { quality: ['quality','work','result','outcome','finish'], punctuality: ['time','punctual','late','early','delay','schedule'], communication: ['communication','responsive','reply','call','polite','rude'], value: ['price','cost','worth','value','expensive','affordable'], cleanliness: ['clean','neat','tidy','mess','dirty'], professionalism: ['professional','expert','skilled','experienced','amateur'] };

      if (comment) {
        const words = comment.toLowerCase().split(/\s+/);
        let pos = 0, neg = 0;
        words.forEach(w => { const c = w.replace(/[^a-z]/g, ''); if (POSITIVE_WORDS.includes(c)) pos++; if (NEGATIVE_WORDS.includes(c)) neg++; });
        const total = pos + neg;
        const score = total > 0 ? (pos - neg) / total : 0;
        const label = score > 0.3 ? 'positive' : score < -0.3 ? 'negative' : 'neutral';
        const aspects = [];
        const lower = comment.toLowerCase();
        for (const [asp, kws] of Object.entries(ASPECTS)) { if (kws.some(k => lower.includes(k))) aspects.push(asp); }

        const tags = [...new Set([...aspects, label])];
        const updateData = { tags };
        // Flag suspicious reviews
        const ratingVal = typeof rating === 'object' ? rating.overall : rating;
        if (label === 'negative' && ratingVal <= 2 && total >= 3) {
          updateData.isFlagged = true; updateData.flagReason = 'Very negative review - needs moderation'; updateData.flaggedBy = 'system'; updateData.flaggedAt = new Date();
        } else if (ratingVal >= 4 && label === 'negative') {
          updateData.isFlagged = true; updateData.flagReason = 'Rating/sentiment mismatch'; updateData.flaggedBy = 'system'; updateData.flaggedAt = new Date();
        }
        await Review.findByIdAndUpdate(review._id, { $set: updateData });
        // Merge tags into populated response
        populated.tags = tags;
        if (updateData.isFlagged) populated.isFlagged = true;
      }
    } catch (sentErr) {
      console.error('Sentiment analysis error:', sentErr.message);
    }

    res.status(201).json({ success: true, data: { review: populated } });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ success: false, message: 'Failed to create review' });
  }
};

// @desc    Get reviews for a service
// @route   GET /api/reviews/service/:serviceId
// @access  Public
const getServiceReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { service: req.params.serviceId, isVisible: true };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('customer', 'name profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
    ]);

    // Compute stats
    const stats = await Review.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          averageRating: { $avg: { $ifNull: ['$rating.overall', '$rating'] } },
          totalReviews: { $sum: 1 },
          recommended: { $sum: { $cond: ['$wouldRecommend', 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        stats: stats[0] || { averageRating: 0, totalReviews: 0, recommended: 0 },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Get service reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to get reviews' });
  }
};

// @desc    Get reviews for a provider
// @route   GET /api/reviews/provider/:providerId
// @access  Public
const getProviderReviews = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { provider: req.params.providerId, isVisible: true };

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate('customer', 'name profileImage')
        .populate('service', 'title category')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      },
    });
  } catch (error) {
    console.error('Get provider reviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to get reviews' });
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
const markHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (!review.helpfulVotes) review.helpfulVotes = [];
    const userId = req.user._id.toString();
    if (review.helpfulVotes.some((v) => v.toString() === userId)) {
      return res.status(400).json({ success: false, message: 'Already marked as helpful' });
    }

    review.helpfulVotes.push(req.user._id);
    review.helpfulCount = review.helpfulVotes.length;
    await review.save();

    res.json({ success: true, data: { helpfulCount: review.helpfulCount } });
  } catch (error) {
    console.error('Mark helpful error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark review as helpful' });
  }
};

// @desc    Remove helpful vote
// @route   DELETE /api/reviews/:id/helpful
// @access  Private
const removeHelpful = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (!review.helpfulVotes) review.helpfulVotes = [];
    const userId = req.user._id.toString();
    review.helpfulVotes = review.helpfulVotes.filter((v) => v.toString() !== userId);
    review.helpfulCount = review.helpfulVotes.length;
    await review.save();

    res.json({ success: true, data: { helpfulCount: review.helpfulCount } });
  } catch (error) {
    console.error('Remove helpful error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove helpful vote' });
  }
};

// @desc    Add provider response to a review
// @route   POST /api/reviews/:id/response
// @access  Private
const addProviderResponse = async (req, res) => {
  try {
    const { message, response } = req.body;
    const responseText = message || response; // Support both field names
    
    if (!responseText || !responseText.trim()) {
      return res.status(400).json({ success: false, message: 'Response text is required' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.provider.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the reviewed provider can respond' });
    }

    review.providerResponse = {
      message: responseText.trim(),
      respondedAt: new Date(),
      isPublic: true
    };
    await review.save();

    res.json({ success: true, data: { review } });
  } catch (error) {
    console.error('Add provider response error:', error);
    res.status(500).json({ success: false, message: 'Failed to add response' });
  }
};

module.exports = {
  createReview,
  getServiceReviews,
  getProviderReviews,
  markHelpful,
  removeHelpful,
  addProviderResponse,
};
