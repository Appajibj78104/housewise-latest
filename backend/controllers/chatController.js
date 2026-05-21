const Booking = require('../models/Booking');
const { emitToBooking, emitToUser } = require('../config/socket');
const { createNotification } = require('../utils/notifications');
const { uploadToCloudinary } = require('../middleware/upload');

/**
 * Authorize the current user against the booking and return the populated booking.
 * Allowed: customer, provider, admin (read-only for admin).
 */
async function loadBookingForUser(bookingId, user) {
  const booking = await Booking.findById(bookingId)
    .populate('customer', 'name profileImage')
    .populate('provider', 'name profileImage');
  if (!booking) return { error: 'Booking not found', status: 404 };

  const uid = String(user._id);
  const isCustomer = String(booking.customer._id) === uid;
  const isProvider = String(booking.provider._id) === uid;
  const isAdmin = !!user.isAdmin;

  if (!isCustomer && !isProvider && !isAdmin) {
    return { error: 'Forbidden', status: 403 };
  }
  return { booking, isCustomer, isProvider, isAdmin };
}

/**
 * GET /chat/:bookingId
 * Returns chat messages from booking.communication[]
 */
exports.getMessages = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { since } = req.query;

    const { booking, error, status } = await loadBookingForUser(bookingId, req.user);
    if (error) return res.status(status).json({ success: false, message: error });

    let messages = (booking.communication || []).map((m) => ({
      _id: m._id,
      from: m.from,
      message: m.message,
      timestamp: m.timestamp,
      type: m.type,
      photos: m.photos || [],
      readBy: m.readBy || []
    }));

    if (since) {
      const sinceDate = new Date(since);
      messages = messages.filter((m) => new Date(m.timestamp) > sinceDate);
    }

    return res.json({
      success: true,
      data: {
        bookingId,
        participants: {
          customer: booking.customer,
          provider: booking.provider
        },
        messages
      }
    });
  } catch (err) {
    console.error('chat.getMessages error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load chat' });
  }
};

/**
 * POST /chat/:bookingId
 * Body: { message, type? } or multipart with image
 * Persists message and emits chat:message to booking room
 */
exports.sendMessage = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { message, type = 'message' } = req.body;
    const file = req.file;

    if (!message && !file) {
      return res.status(400).json({ success: false, message: 'Message or image required' });
    }

    const { booking, error, status, isAdmin } = await loadBookingForUser(bookingId, req.user);
    if (error) return res.status(status).json({ success: false, message: error });
    if (isAdmin) {
      return res.status(403).json({ success: false, message: 'Admins cannot send chat messages' });
    }

    // Upload optional photo
    let photos = [];
    if (file) {
      try {
        const result = await uploadToCloudinary(file.buffer, 'housewife-services/chat');
        photos.push(result.secure_url);
      } catch (e) {
        return res.status(500).json({ success: false, message: 'Image upload failed' });
      }
    }

    const entry = {
      from: req.user._id,
      message: message || '',
      type,
      photos,
      timestamp: new Date(),
      readBy: [req.user._id]
    };

    booking.communication.push(entry);
    await booking.save();

    const saved = booking.communication[booking.communication.length - 1];
    const payload = {
      bookingId: String(booking._id),
      _id: saved._id,
      from: saved.from,
      message: saved.message,
      photos: saved.photos,
      timestamp: saved.timestamp,
      type: saved.type
    };

    // Emit to booking room
    emitToBooking(String(booking._id), 'chat:message', payload);

    // Notify the OTHER participant via personal channel + persisted notification
    const recipient = String(booking.customer._id) === String(req.user._id)
      ? booking.provider._id
      : booking.customer._id;
    emitToUser(String(recipient), 'chat:message', payload);
    createNotification({
      recipient,
      type: 'chat_message',
      title: 'New message',
      message: message ? message.slice(0, 80) : 'Sent a photo',
      data: { bookingId: booking._id, fromUser: req.user._id }
    });

    return res.json({ success: true, data: payload });
  } catch (err) {
    console.error('chat.sendMessage error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

/**
 * POST /chat/:bookingId/read
 * Mark all chat messages as read by current user, emit chat:read
 */
exports.markRead = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { booking, error, status } = await loadBookingForUser(bookingId, req.user);
    if (error) return res.status(status).json({ success: false, message: error });

    const uid = String(req.user._id);
    let changed = 0;
    booking.communication.forEach((m) => {
      const readBy = (m.readBy || []).map(String);
      if (!readBy.includes(uid)) {
        m.readBy = [...readBy, req.user._id];
        changed += 1;
      }
    });
    if (changed) await booking.save();

    emitToBooking(String(booking._id), 'chat:read', {
      bookingId: String(booking._id),
      userId: uid,
      at: new Date().toISOString()
    });

    return res.json({ success: true, data: { marked: changed } });
  } catch (err) {
    console.error('chat.markRead error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark read' });
  }
};

/**
 * GET /chat/threads — list a user's recent chats (one per booking with messages)
 */
exports.listThreads = async (req, res) => {
  try {
    const uid = req.user._id;
    const isProvider = req.user.role === 'housewife';
    const filter = isProvider ? { provider: uid } : { customer: uid };
    const bookings = await Booking.find({
      ...filter,
      'communication.0': { $exists: true }
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate('customer', 'name profileImage')
      .populate('provider', 'name profileImage')
      .populate('service', 'title category')
      .lean();

    const threads = bookings.map((b) => {
      const last = b.communication[b.communication.length - 1] || {};
      const unread = (b.communication || []).filter((m) => {
        const readBy = (m.readBy || []).map(String);
        return String(m.from) !== String(uid) && !readBy.includes(String(uid));
      }).length;
      const counterpart = isProvider ? b.customer : b.provider;
      return {
        bookingId: b._id,
        bookingCode: b.bookingId,
        status: b.status,
        service: b.service,
        counterpart,
        lastMessage: {
          message: last.message,
          timestamp: last.timestamp,
          from: last.from
        },
        unread
      };
    });

    return res.json({ success: true, data: { threads } });
  } catch (err) {
    console.error('chat.listThreads error:', err);
    return res.status(500).json({ success: false, message: 'Failed to list threads' });
  }
};
