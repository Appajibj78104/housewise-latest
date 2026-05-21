const Notification = require('../models/Notification');
const { emitToUser } = require('../config/socket');

/**
 * Create a notification for a user and emit via Socket.io.
 * Fails silently — never throws to avoid disrupting the main operation.
 */
async function createNotification({ user, recipient, type, title, message, data, relatedBooking }) {
  try {
    const targetUser = recipient || user;
    const notification = await Notification.create({
      user: targetUser,
      type,
      title,
      message,
      data: { ...data, relatedBooking },
    });

    // Emit real-time notification via Socket.io
    emitToUser(targetUser.toString(), 'notification:new', {
      _id: notification._id,
      type,
      title,
      message,
      read: false,
      createdAt: notification.createdAt,
    });
  } catch (err) {
    console.error('Failed to create notification:', err.message);
  }
}

module.exports = { createNotification };
