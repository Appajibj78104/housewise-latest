/**
 * Recurring booking scheduler.
 *
 * Daily at 02:00 IST: for each parent booking where
 *   recurrence.isRecurring && recurrenceStatus === 'active'
 * spawn the next occurrence (`weekly | biweekly | monthly`) until `endDate`.
 * Skips a tick when `recurrence.skipNext === true` (and clears the flag).
 */

const cron = require('node-cron');
const Booking = require('../models/Booking');
const Service = require('../models/Service');
const { createNotification } = require('../utils/notifications');
const logger = require('../config/logger');

const FREQUENCY_DAYS = { weekly: 7, biweekly: 14 };

function nextOccurrenceDate(from, frequency) {
  const next = new Date(from);
  if (frequency === 'monthly') {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + (FREQUENCY_DAYS[frequency] || 7));
  }
  return next;
}

async function spawnNextOccurrence(parent) {
  const lastDate = parent.recurrence.lastSpawnedAt
    ? new Date(parent.recurrence.lastSpawnedAt)
    : new Date(parent.scheduledDate);
  const nextDate = nextOccurrenceDate(lastDate, parent.recurrence.frequency || 'weekly');

  if (parent.recurrence.endDate && nextDate > new Date(parent.recurrence.endDate)) {
    parent.recurrence.recurrenceStatus = 'ended';
    await parent.save();
    return null;
  }

  // Only spawn if next date is within next 24h (we run once a day)
  const now = new Date();
  const horizon = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  if (nextDate > horizon) return null;

  if (parent.recurrence.skipNext) {
    // Skip this occurrence; bump lastSpawnedAt and clear flag
    parent.recurrence.lastSpawnedAt = nextDate;
    parent.recurrence.skipNext = false;
    await parent.save();
    createNotification({
      recipient: parent.customer,
      type: 'recurring_skipped',
      title: 'Recurring booking skipped',
      message: `Skipped ${nextDate.toLocaleDateString('en-IN')} as requested`,
      data: { bookingId: parent._id }
    });
    return null;
  }

  // Verify service still active
  const service = await Service.findById(parent.service);
  if (!service || !service.isActive) {
    logger.warn(`recurring: parent ${parent._id} service inactive — pausing series`);
    parent.recurrence.recurrenceStatus = 'paused';
    await parent.save();
    return null;
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  const bookingCode = `RC${timestamp}${random}`.toUpperCase();

  const child = new Booking({
    bookingId: bookingCode,
    customer: parent.customer,
    provider: parent.provider,
    service: parent.service,
    scheduledDate: nextDate,
    scheduledTime: parent.scheduledTime,
    duration: parent.duration,
    pricing: { agreedAmount: parent.pricing?.agreedAmount || 0 },
    status: 'pending',
    customerNotes: parent.customerNotes,
    location: parent.location,
    selectedPackage: parent.selectedPackage,
    selectedAddOns: parent.selectedAddOns,
    recurrence: {
      isRecurring: false,
      parentBooking: parent._id,
      occurrenceIndex: (parent.recurrence.occurrenceIndex || 0) + 1
    },
    timeline: [{
      type: 'created',
      byRole: 'system',
      at: new Date(),
      message: `Auto-created from recurring series (occurrence #${(parent.recurrence.occurrenceIndex || 0) + 1})`,
      data: { parentBooking: parent._id }
    }]
  });
  await child.save();

  parent.recurrence.lastSpawnedAt = nextDate;
  parent.recurrence.occurrenceIndex = (parent.recurrence.occurrenceIndex || 0) + 1;
  await parent.save();

  // Notify customer + provider
  createNotification({
    recipient: parent.customer,
    type: 'recurring_created',
    title: 'Next recurring booking created',
    message: `Your recurring booking has been auto-scheduled for ${nextDate.toLocaleDateString('en-IN')}`,
    data: { bookingId: child._id }
  });
  createNotification({
    recipient: parent.provider,
    type: 'booking_new',
    title: 'New recurring booking',
    message: `Recurring booking auto-scheduled for ${nextDate.toLocaleDateString('en-IN')}`,
    data: { bookingId: child._id, serviceId: parent.service }
  });

  return child;
}

cron.schedule('0 2 * * *', async () => {
  try {
    const series = await Booking.find({
      'recurrence.isRecurring': true,
      'recurrence.recurrenceStatus': 'active'
    }).limit(500);

    let spawned = 0;
    for (const parent of series) {
      try {
        const child = await spawnNextOccurrence(parent);
        if (child) spawned += 1;
      } catch (err) {
        logger.error(`recurring spawn failed for ${parent._id}: ${err.message}`);
      }
    }
    if (spawned) logger.info(`Recurring scheduler spawned ${spawned} occurrence(s)`);
  } catch (err) {
    logger.error('Recurring scheduler failed: ' + err.message);
  }
});

logger.info('Recurring booking scheduler started (daily 02:00)');

module.exports = { spawnNextOccurrence };
