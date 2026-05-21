/**
 * Premium trust-badge evaluator.
 *
 * Hourly job that awards (and removes) provider badges based on rolling
 * performance. The `verified_kyc` badge is granted at KYC approval time
 * (see kycController.adminApprove).
 *
 * Rules:
 *  - top_rated:        rating.average >= 4.7 AND rating.count >= 30
 *  - quick_responder:  median accept time <= 15 min over last 20 confirmed bookings
 *  - on_time_pro:      >=95% of last 20 bookings have arrivedAt <= scheduledTime+5min
 *  - repeat_hero:      >=30% of last 30 bookings are from repeat customers
 *  - super_provider:   has all four of: verified_kyc, top_rated, quick_responder, on_time_pro
 */

const cron = require('node-cron');
const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { createNotification } = require('../utils/notifications');
const logger = require('../config/logger');

const BADGES = {
  top_rated: 'Top Rated',
  quick_responder: 'Quick Responder',
  on_time_pro: 'On-Time Pro',
  repeat_hero: 'Repeat Hero',
  super_provider: 'Super Provider'
};

function median(values) {
  if (!values.length) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

async function evaluateProvider(provider) {
  const earned = new Set(provider.earnedBadges || []);
  const newlyEarned = [];

  // top_rated
  const isTopRated = (provider.rating?.average || 0) >= 4.7 && (provider.rating?.count || 0) >= 30;
  if (isTopRated && !earned.has('top_rated')) {
    earned.add('top_rated'); newlyEarned.push('top_rated');
  } else if (!isTopRated && earned.has('top_rated')) {
    earned.delete('top_rated');
  }

  // Recent bookings (last 30 completed)
  const recent = await Booking.find({
    provider: provider._id,
    status: { $in: ['completed', 'in_progress', 'confirmed', 'cancelled', 'declined'] }
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .select('customer status createdAt updatedAt confirmedAt arrivedAt scheduledDate scheduledTime timeline')
    .lean();

  // quick_responder — accept latency on the latest 20
  const accepted = recent.slice(0, 20).filter(b => b.timeline?.some(t => t.type === 'confirmed'));
  const latencies = accepted.map(b => {
    const created = new Date(b.createdAt).getTime();
    const confirmedEvent = b.timeline.find(t => t.type === 'confirmed');
    if (!confirmedEvent) return null;
    return (new Date(confirmedEvent.at).getTime() - created) / (1000 * 60); // minutes
  }).filter(x => x != null && x >= 0);
  const isQuick = latencies.length >= 5 && median(latencies) <= 15;
  if (isQuick && !earned.has('quick_responder')) {
    earned.add('quick_responder'); newlyEarned.push('quick_responder');
  } else if (!isQuick && earned.has('quick_responder')) {
    earned.delete('quick_responder');
  }

  // on_time_pro
  const onTimePool = recent.slice(0, 20).filter(b => b.arrivedAt && b.scheduledDate);
  const onTime = onTimePool.filter(b => {
    const sched = new Date(b.scheduledDate);
    if (b.scheduledTime?.start) {
      const [h, m] = (b.scheduledTime.start || '00:00').split(':').map(Number);
      sched.setHours(h, m || 0, 0, 0);
    }
    const grace = sched.getTime() + 5 * 60 * 1000;
    return new Date(b.arrivedAt).getTime() <= grace;
  });
  const isOnTime = onTimePool.length >= 5 && (onTime.length / onTimePool.length) >= 0.95;
  if (isOnTime && !earned.has('on_time_pro')) {
    earned.add('on_time_pro'); newlyEarned.push('on_time_pro');
  } else if (!isOnTime && earned.has('on_time_pro')) {
    earned.delete('on_time_pro');
  }

  // repeat_hero — repeat customer rate over last 30 bookings
  if (recent.length >= 10) {
    const customerSet = new Map();
    recent.forEach(b => {
      const k = String(b.customer);
      customerSet.set(k, (customerSet.get(k) || 0) + 1);
    });
    const repeat = Array.from(customerSet.values()).filter(c => c > 1).reduce((a, b) => a + b, 0);
    const rate = repeat / recent.length;
    const isRepeatHero = rate >= 0.3;
    if (isRepeatHero && !earned.has('repeat_hero')) {
      earned.add('repeat_hero'); newlyEarned.push('repeat_hero');
    } else if (!isRepeatHero && earned.has('repeat_hero')) {
      earned.delete('repeat_hero');
    }
  }

  // super_provider — all of: verified_kyc, top_rated, quick_responder, on_time_pro
  const hasAll = ['verified_kyc', 'top_rated', 'quick_responder', 'on_time_pro']
    .every(b => earned.has(b));
  if (hasAll && !earned.has('super_provider')) {
    earned.add('super_provider'); newlyEarned.push('super_provider');
  } else if (!hasAll && earned.has('super_provider')) {
    earned.delete('super_provider');
  }

  if (newlyEarned.length || provider.earnedBadges?.length !== earned.size) {
    await User.findByIdAndUpdate(provider._id, { earnedBadges: Array.from(earned) });
  }

  for (const badgeId of newlyEarned) {
    createNotification({
      recipient: provider._id,
      type: 'badge_earned',
      title: 'New badge earned!',
      message: `You've earned the "${BADGES[badgeId]}" badge`,
      data: { badgeId }
    });
  }

  return newlyEarned.length;
}

async function evaluateAll() {
  try {
    const providers = await User.find({ role: 'housewife', isActive: true })
      .select('_id rating earnedBadges')
      .lean();
    let total = 0;
    for (const p of providers) {
      try {
        total += await evaluateProvider(p) || 0;
      } catch (err) {
        logger.error(`Badge eval failed for ${p._id}: ${err.message}`);
      }
    }
    if (total) logger.info(`Badge evaluator: awarded ${total} new badge(s)`);
  } catch (err) {
    logger.error(`Badge evaluator job failed: ${err.message}`);
  }
}

// Hourly at minute 5
cron.schedule('5 * * * *', evaluateAll);

logger.info('Badge evaluator scheduler started (hourly)');

module.exports = { evaluateProvider, evaluateAll };
