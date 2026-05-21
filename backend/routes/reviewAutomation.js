const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/adminAuth');
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const { createNotification } = require('../utils/notifications');

// Positive/Negative word lists for sentiment analysis
const POSITIVE_WORDS = [
  'excellent', 'amazing', 'wonderful', 'fantastic', 'great', 'good', 'nice', 'perfect',
  'love', 'loved', 'best', 'outstanding', 'superb', 'brilliant', 'impressed', 'recommend',
  'professional', 'friendly', 'polite', 'punctual', 'clean', 'thorough', 'efficient',
  'helpful', 'skilled', 'talented', 'dedicated', 'reliable', 'trustworthy', 'satisfied',
  'happy', 'delighted', 'pleased', 'awesome', 'exceptional', 'beautiful', 'quality',
  // Hindi transliterations
  'bahut', 'accha', 'badiya', 'shandar', 'zabardast', 'behtareen'
];

const NEGATIVE_WORDS = [
  'terrible', 'awful', 'horrible', 'bad', 'worst', 'poor', 'disappointing', 'disappointed',
  'rude', 'late', 'dirty', 'unprofessional', 'slow', 'expensive', 'waste', 'avoid',
  'never', 'complaint', 'damaged', 'broken', 'unsatisfied', 'frustrated', 'angry',
  'unacceptable', 'incompetent', 'careless', 'dishonest', 'unreliable', 'overpriced',
  // Hindi transliterations
  'kharab', 'bekar', 'ghatiya', 'bura'
];

// Aspect categories for tagging
const ASPECTS = {
  quality: ['quality', 'work', 'result', 'outcome', 'finish', 'detail', 'craftsmanship'],
  punctuality: ['time', 'punctual', 'late', 'early', 'delay', 'waiting', 'schedule', 'on time'],
  communication: ['communication', 'responsive', 'reply', 'call', 'message', 'updates', 'polite', 'rude'],
  value: ['price', 'cost', 'worth', 'value', 'expensive', 'cheap', 'affordable', 'overpriced'],
  cleanliness: ['clean', 'neat', 'tidy', 'mess', 'dirty', 'organized'],
  professionalism: ['professional', 'expert', 'skilled', 'experienced', 'amateur', 'unprofessional']
};

// Analyze sentiment of a review comment
const analyzeSentiment = (comment) => {
  if (!comment) return { score: 0, label: 'neutral', confidence: 0 };
  
  const words = comment.toLowerCase().split(/\s+/);
  let positiveCount = 0;
  let negativeCount = 0;

  words.forEach(word => {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (POSITIVE_WORDS.includes(cleaned)) positiveCount++;
    if (NEGATIVE_WORDS.includes(cleaned)) negativeCount++;
  });

  const total = positiveCount + negativeCount;
  if (total === 0) return { score: 0, label: 'neutral', confidence: 0.3 };

  const score = (positiveCount - negativeCount) / total;
  const confidence = Math.min(total / 5, 1); // Higher confidence with more signal words

  let label = 'neutral';
  if (score > 0.3) label = 'positive';
  else if (score < -0.3) label = 'negative';

  return { score: Math.round(score * 100) / 100, label, confidence: Math.round(confidence * 100) / 100 };
};

// Extract aspect tags from comment
const extractAspects = (comment) => {
  if (!comment) return [];
  const lower = comment.toLowerCase();
  const found = [];

  for (const [aspect, keywords] of Object.entries(ASPECTS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      found.push(aspect);
    }
  }
  return found;
};

// Auto-flag review for moderation
const shouldFlag = (review, sentiment) => {
  // Flag if very negative with low rating
  if (sentiment.label === 'negative' && review.rating.overall <= 2 && sentiment.confidence > 0.5) {
    return { flag: true, reason: 'Very negative review - needs moderation check' };
  }
  // Flag if rating and sentiment mismatch (e.g., 5 star but negative words)
  if (review.rating.overall >= 4 && sentiment.label === 'negative') {
    return { flag: true, reason: 'Rating/sentiment mismatch - possible spam' };
  }
  if (review.rating.overall <= 2 && sentiment.label === 'positive') {
    return { flag: true, reason: 'Rating/sentiment mismatch - possible error' };
  }
  return { flag: false, reason: null };
};

// POST /api/review-automation/analyze - Analyze a review (used after creation)
router.post('/analyze', async (req, res) => {
  try {
    const { reviewId } = req.body;
    if (!reviewId) return res.status(400).json({ success: false, message: 'reviewId is required' });

    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ success: false, message: 'Review not found' });

    const sentiment = analyzeSentiment(review.comment);
    const aspects = extractAspects(review.comment);
    const flagResult = shouldFlag(review, sentiment);

    // Update review with sentiment data and aspect tags
    review.tags = [...new Set([...(review.tags || []), ...aspects, sentiment.label])];
    if (flagResult.flag && !review.isFlagged) {
      review.isFlagged = true;
      review.flagReason = flagResult.reason;
      review.flaggedBy = 'system';
      review.flaggedAt = new Date();
    }
    await review.save();

    res.json({
      success: true,
      data: {
        sentiment,
        aspects,
        flagged: flagResult.flag,
        flagReason: flagResult.reason,
        tags: review.tags
      }
    });
  } catch (error) {
    console.error('Review analysis error:', error);
    res.status(500).json({ success: false, message: 'Failed to analyze review' });
  }
});

// POST /api/review-automation/batch-analyze - Batch analyze all un-tagged reviews
router.post('/batch-analyze', requireAdmin, async (req, res) => {
  try {
    const reviews = await Review.find({ tags: { $size: 0 } }).limit(100);
    let analyzed = 0;

    for (const review of reviews) {
      const sentiment = analyzeSentiment(review.comment);
      const aspects = extractAspects(review.comment);
      const flagResult = shouldFlag(review, sentiment);

      review.tags = [...new Set([...aspects, sentiment.label])];
      if (flagResult.flag && !review.isFlagged) {
        review.isFlagged = true;
        review.flagReason = flagResult.reason;
        review.flaggedBy = 'system';
        review.flaggedAt = new Date();
      }
      await review.save();
      analyzed++;
    }

    res.json({ success: true, data: { analyzed, total: reviews.length } });
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({ success: false, message: 'Failed to batch analyze reviews' });
  }
});

// GET /api/review-automation/insights - Get review insights/stats
router.get('/insights', requireAdmin, async (req, res) => {
  try {
    const [sentimentDist, aspectDist, flaggedCount, totalCount] = await Promise.all([
      Review.aggregate([
        { $unwind: '$tags' },
        { $match: { tags: { $in: ['positive', 'negative', 'neutral'] } } },
        { $group: { _id: '$tags', count: { $sum: 1 } } }
      ]),
      Review.aggregate([
        { $unwind: '$tags' },
        { $match: { tags: { $nin: ['positive', 'negative', 'neutral'] } } },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Review.countDocuments({ isFlagged: true }),
      Review.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        totalReviews: totalCount,
        flaggedReviews: flaggedCount,
        sentimentDistribution: sentimentDist,
        aspectDistribution: aspectDist
      }
    });
  } catch (error) {
    console.error('Review insights error:', error);
    res.status(500).json({ success: false, message: 'Failed to get insights' });
  }
});

// Cron-compatible: Send review reminders for completed bookings without reviews
router.post('/send-reminders', requireAdmin, async (req, res) => {
  try {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find completed bookings in the last 2-7 days without reviews
    const bookingsWithoutReview = await Booking.find({
      status: 'completed',
      updatedAt: { $gte: sevenDaysAgo, $lte: twoDaysAgo }
    }).populate('customer', 'name').populate('service', 'title');

    const existingReviews = await Review.find({
      booking: { $in: bookingsWithoutReview.map(b => b._id) }
    }).select('booking');
    const reviewedBookingIds = new Set(existingReviews.map(r => r.booking.toString()));

    let sent = 0;
    for (const booking of bookingsWithoutReview) {
      if (reviewedBookingIds.has(booking._id.toString())) continue;
      
      try {
        await createNotification({
          recipient: booking.customer._id,
          type: 'review_reminder',
          title: 'Leave a Review',
          message: `How was your experience with "${booking.service.title}"? Share your feedback!`,
          data: { bookingId: booking._id, serviceId: booking.service._id }
        });
        sent++;
      } catch (e) { /* non-critical */ }
    }

    res.json({ success: true, data: { remindersSent: sent } });
  } catch (error) {
    console.error('Review reminders error:', error);
    res.status(500).json({ success: false, message: 'Failed to send reminders' });
  }
});

module.exports = router;
