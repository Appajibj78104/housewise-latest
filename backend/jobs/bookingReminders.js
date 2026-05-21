const cron = require('node-cron');
const Booking = require('../models/Booking');
const { createNotification } = require('../utils/notifications');
const logger = require('../config/logger');

/**
 * Booking Reminder Scheduler
 * - 24hr reminder: runs every hour, checks for bookings 23-24hrs away
 * - 2hr reminder: runs every 15min, checks for bookings 1.75-2hrs away
 */

// 24-hour reminder — runs every hour at minute 0
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const bookings = await Booking.find({
      scheduledDate: { $gte: in23h, $lte: in24h },
      status: { $in: ['confirmed'] },
      'reminders.customerReminded': false,
    }).populate('service', 'title').lean();

    for (const booking of bookings) {
      // Remind customer
      await createNotification({
        recipient: booking.customer,
        type: 'booking_reminder',
        title: 'Booking Tomorrow',
        message: `Your booking for "${booking.service?.title || 'service'}" is scheduled for tomorrow.`,
        relatedBooking: booking._id,
      });
      // Remind provider
      await createNotification({
        recipient: booking.provider,
        type: 'booking_reminder',
        title: 'Booking Tomorrow',
        message: `You have a booking for "${booking.service?.title || 'service'}" scheduled for tomorrow.`,
        relatedBooking: booking._id,
      });

      await Booking.findByIdAndUpdate(booking._id, {
        'reminders.customerReminded': true,
        'reminders.providerReminded': true,
        'reminders.reminderSentAt': new Date(),
      });
    }

    if (bookings.length > 0) {
      logger.info(`Sent 24hr reminders for ${bookings.length} bookings`);
    }
  } catch (error) {
    logger.error('24hr reminder job failed:', { error: error.message });
  }
});

// 2-hour reminder — runs every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try {
    const now = new Date();
    const in105min = new Date(now.getTime() + 105 * 60 * 1000); // 1h45m
    const in120min = new Date(now.getTime() + 120 * 60 * 1000); // 2h

    const bookings = await Booking.find({
      scheduledDate: { $gte: in105min, $lte: in120min },
      status: { $in: ['confirmed'] },
      'reminders.customerReminded': true, // Already got 24hr reminder
    }).populate('service', 'title').lean();

    for (const booking of bookings) {
      await createNotification({
        recipient: booking.customer,
        type: 'booking_reminder',
        title: 'Booking in 2 Hours',
        message: `Reminder: "${booking.service?.title || 'service'}" starts in about 2 hours.`,
        relatedBooking: booking._id,
      });
      await createNotification({
        recipient: booking.provider,
        type: 'booking_reminder',
        title: 'Booking in 2 Hours',
        message: `Reminder: "${booking.service?.title || 'service'}" starts in about 2 hours.`,
        relatedBooking: booking._id,
      });
    }

    if (bookings.length > 0) {
      logger.info(`Sent 2hr reminders for ${bookings.length} bookings`);
    }
  } catch (error) {
    logger.error('2hr reminder job failed:', { error: error.message });
  }
});

logger.info('Booking reminder scheduler started (24hr + 2hr)');
