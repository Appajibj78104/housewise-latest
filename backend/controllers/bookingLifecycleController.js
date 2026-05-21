/**
 * Premium booking lifecycle endpoints:
 * ETA / on-the-way / arrived / start / timeline / checklist / tip /
 * customer-rating (provider->customer) / dispute / dispute resolve / rebook.
 *
 * Mounted under `/api/bookings/:id/...` via routes/bookings.js
 */

const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { createNotification } = require('../utils/notifications');
const { emitToUser, emitToBooking, getIO } = require('../config/socket');
const { uploadToCloudinary } = require('../middleware/upload');

/* ── helpers ──────────────────────────────────────────────────────── */

async function loadBooking(req, res, opts = {}) {
  const booking = await Booking.findById(req.params.id)
    .populate('service', 'title category pricing')
    .populate('provider', 'name profileImage phone')
    .populate('customer', 'name profileImage phone');
  if (!booking) {
    res.status(404).json({ success: false, message: 'Booking not found' });
    return null;
  }
  const uid = String(req.user._id);
  const isCustomer = String(booking.customer._id) === uid;
  const isProvider = String(booking.provider._id) === uid;
  const isAdmin = !!req.user.isAdmin || req.user.role === 'admin';
  if (opts.role === 'provider' && !(isProvider || isAdmin)) {
    res.status(403).json({ success: false, message: 'Provider access required' });
    return null;
  }
  if (opts.role === 'customer' && !(isCustomer || isAdmin)) {
    res.status(403).json({ success: false, message: 'Customer access required' });
    return null;
  }
  if (!opts.role && !(isCustomer || isProvider || isAdmin)) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return null;
  }
  return { booking, isCustomer, isProvider, isAdmin };
}

function pushTimeline(booking, type, by, byRole, message, data = {}, photos = []) {
  booking.timeline = booking.timeline || [];
  booking.timeline.push({ type, by, byRole, at: new Date(), message, data, photos });
}

/* ── ETA / on the way / arrived / start ───────────────────────────── */

/**
 * PUT /bookings/:id/eta
 * Body: { etaMinutes? , etaAt? } — provider sets ETA & flips subStatus to on_the_way
 */
exports.setEta = async (req, res) => {
  try {
    const ctx = await loadBooking(req, res, { role: 'provider' });
    if (!ctx) return;
    const { booking } = ctx;

    if (!['confirmed', 'on_the_way', 'arrived'].includes(booking.subStatus || booking.status)) {
      // We allow if booking is confirmed (no subStatus yet) or already on_the_way
    }
    if (booking.status !== 'confirmed' && booking.subStatus !== 'on_the_way') {
      return res.status(400).json({ success: false, message: 'Booking must be confirmed' });
    }

    const { etaMinutes, etaAt } = req.body;
    let etaDate = null;
    if (etaAt) etaDate = new Date(etaAt);
    else if (etaMinutes != null) etaDate = new Date(Date.now() + Number(etaMinutes) * 60 * 1000);
    if (!etaDate || isNaN(etaDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Provide etaMinutes or etaAt' });
    }

    booking.eta = etaDate;
    booking.etaSetAt = new Date();
    booking.subStatus = 'on_the_way';
    pushTimeline(booking, 'on_the_way', req.user._id, 'housewife',
      `On the way — ETA ${etaDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
      { eta: etaDate, etaMinutes });
    await booking.save();

    const payload = { bookingId: String(booking._id), eta: booking.eta, subStatus: 'on_the_way' };
    emitToBooking(String(booking._id), 'booking:eta', payload);
    emitToUser(String(booking.customer._id), 'booking:eta', payload);

    createNotification({
      recipient: booking.customer._id,
      type: 'booking_eta',
      title: 'Provider on the way',
      message: `${booking.provider?.name || 'Your provider'} is on the way`,
      data: { bookingId: booking._id, fromUser: req.user._id }
    });

    return res.json({ success: true, data: { booking } });
  } catch (err) {
    console.error('setEta error:', err);
    return res.status(500).json({ success: false, message: 'Failed to set ETA' });
  }
};

/** PUT /bookings/:id/arrived — provider marks they've arrived at the customer location */
exports.markArrived = async (req, res) => {
  try {
    const ctx = await loadBooking(req, res, { role: 'provider' });
    if (!ctx) return;
    const { booking } = ctx;

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Booking must be confirmed' });
    }

    booking.subStatus = 'arrived';
    booking.arrivedAt = new Date();
    pushTimeline(booking, 'arrived', req.user._id, 'housewife', 'Arrived at the customer location');
    await booking.save();

    emitToBooking(String(booking._id), 'booking:arrived', { bookingId: String(booking._id), arrivedAt: booking.arrivedAt });
    createNotification({
      recipient: booking.customer._id,
      type: 'booking_arrived',
      title: 'Provider arrived',
      message: `${booking.provider?.name || 'Your provider'} has arrived`,
      data: { bookingId: booking._id, fromUser: req.user._id }
    });

    return res.json({ success: true, data: { booking } });
  } catch (err) {
    console.error('markArrived error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark arrived' });
  }
};

/** PUT /bookings/:id/start — provider starts the job */
exports.startJob = async (req, res) => {
  try {
    const ctx = await loadBooking(req, res, { role: 'provider' });
    if (!ctx) return;
    const { booking } = ctx;

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Booking must be confirmed' });
    }

    booking.status = 'in_progress';
    booking.subStatus = 'working';
    booking.startedAt = new Date();
    pushTimeline(booking, 'started', req.user._id, 'housewife', 'Job started');
    await booking.save();

    emitToBooking(String(booking._id), 'booking:started', { bookingId: String(booking._id), startedAt: booking.startedAt });
    createNotification({
      recipient: booking.customer._id,
      type: 'booking_started',
      title: 'Service started',
      message: `${booking.provider?.name || 'Your provider'} has started the job`,
      data: { bookingId: booking._id, fromUser: req.user._id }
    });

    return res.json({ success: true, data: { booking } });
  } catch (err) {
    console.error('startJob error:', err);
    return res.status(500).json({ success: false, message: 'Failed to start job' });
  }
};

/* ── Timeline events (notes / before-after photos) ─────────────────── */

/**
 * POST /bookings/:id/timeline
 * Body: { type, message } + multipart 'photos' (max 5)
 * Provider posts a timeline entry (note / before / after / progress)
 */
exports.addTimelineEvent = async (req, res) => {
  try {
    const ctx = await loadBooking(req, res, { role: 'provider' });
    if (!ctx) return;
    const { booking } = ctx;

    const { type = 'progress', message } = req.body;
    const validTypes = ['note', 'before_photos', 'after_photos', 'progress'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid timeline type' });
    }
    if (!['confirmed', 'in_progress'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Booking must be confirmed or in progress' });
    }

    const photos = [];
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    for (const f of files) {
      try {
        const r = await uploadToCloudinary(f.buffer, 'housewife-services/booking-timeline');
        photos.push(r.secure_url);
      } catch (e) { /* skip failed upload */ }
    }
    if (!photos.length && !message) {
      return res.status(400).json({ success: false, message: 'Provide at least a message or photos' });
    }

    pushTimeline(booking, type, req.user._id, 'housewife', message || '', {}, photos);
    await booking.save();

    const payload = { bookingId: String(booking._id), type, message, photos, at: new Date() };
    emitToBooking(String(booking._id), 'booking:timeline', payload);
    return res.json({ success: true, data: payload });
  } catch (err) {
    console.error('addTimelineEvent error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add timeline event' });
  }
};

/* ── Checklist ─────────────────────────────────────────────────────── */

/** PUT /bookings/:id/checklist — provider replaces the checklist (used to seed it) */
exports.setChecklist = async (req, res) => {
  try {
    const ctx = await loadBooking(req, res, { role: 'provider' });
    if (!ctx) return;
    const { booking } = ctx;
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'items array required' });
    }
    booking.checklist = items.slice(0, 30).map((it) => ({
      label: typeof it === 'string' ? it : (it.label || ''),
      done: typeof it === 'object' ? !!it.done : false,
      doneAt: typeof it === 'object' && it.done ? new Date() : undefined,
      doneBy: typeof it === 'object' && it.done ? req.user._id : undefined
    })).filter((i) => i.label);
    await booking.save();

    emitToBooking(String(booking._id), 'booking:checklist', { bookingId: String(booking._id), checklist: booking.checklist });
    return res.json({ success: true, data: { checklist: booking.checklist } });
  } catch (err) {
    console.error('setChecklist error:', err);
    return res.status(500).json({ success: false, message: 'Failed to set checklist' });
  }
};

/** PUT /bookings/:id/checklist/:itemIndex — provider toggles an item */
exports.toggleChecklistItem = async (req, res) => {
  try {
    const ctx = await loadBooking(req, res, { role: 'provider' });
    if (!ctx) return;
    const { booking } = ctx;
    const idx = parseInt(req.params.itemIndex, 10);
    if (isNaN(idx) || idx < 0 || !booking.checklist || idx >= booking.checklist.length) {
      return res.status(400).json({ success: false, message: 'Invalid checklist index' });
    }
    const item = booking.checklist[idx];
    item.done = !item.done;
    item.doneAt = item.done ? new Date() : undefined;
    item.doneBy = item.done ? req.user._id : undefined;
    await booking.save();

    emitToBooking(String(booking._id), 'booking:checklist', { bookingId: String(booking._id), checklist: booking.checklist });
    return res.json({ success: true, data: { item, checklist: booking.checklist } });
  } catch (err) {
    console.error('toggleChecklistItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to toggle checklist item' });
  }
};

/* ── Tip (post-completion, metadata only) ─────────────────────────── */

/**
 * POST /bookings/:id/tip
 * Body: { amount, note? } — customer adds a tip after completion.
 */
exports.addTip = async (req, res) => {
  try {
    const ctx = await loadBooking(req, res, { role: 'customer' });
    if (!ctx) return;
    const { booking } = ctx;
    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Booking must be completed' });
    }
    const { amount, note } = req.body;
    if (amount == null || isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ success: false, message: 'Valid amount required' });
    }

    booking.tip = { amount: Number(amount), addedAt: new Date(), note: note || '' };
    pushTimeline(booking, 'tip_added', req.user._id, 'customer', note || `Tip ₹${Number(amount)} added`, { amount: Number(amount) });

    // Add to provider's earnings
    await User.findByIdAndUpdate(booking.provider._id, { $inc: { totalEarnings: Number(amount) } });

    await booking.save();

    createNotification({
      recipient: booking.provider._id,
      type: 'tip_received',
      title: 'You received a tip',
      message: `${booking.customer?.name || 'A customer'} tipped you ₹${Number(amount)}`,
      data: { bookingId: booking._id, fromUser: req.user._id }
    });
    emitToBooking(String(booking._id), 'booking:tip', { bookingId: String(booking._id), tip: booking.tip });

    return res.json({ success: true, data: { tip: booking.tip } });
  } catch (err) {
    console.error('addTip error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add tip' });
  }
};

/* ── Customer rating (provider->customer) ─────────────────────────── */

/**
 * POST /bookings/:id/customer-rating
 * Body: { rating (1-5), comment? } — provider rates the customer post-completion.
 */
exports.rateCustomer = async (req, res) => {
  try {
    const ctx = await loadBooking(req, res, { role: 'provider' });
    if (!ctx) return;
    const { booking } = ctx;
    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Booking must be completed' });
    }
    if (booking.customerRatedByProvider?.rating) {
      return res.status(400).json({ success: false, message: 'Customer already rated' });
    }
    const { rating, comment } = req.body;
    const num = Number(rating);
    if (isNaN(num) || num < 1 || num > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1–5' });
    }

    booking.customerRatedByProvider = { rating: num, comment: comment || '', ratedAt: new Date() };
    await booking.save();

    // Update customer aggregate rating
    const customer = await User.findById(booking.customer._id);
    if (customer) {
      const prevAvg = customer.customerRating?.average || 0;
      const prevCount = customer.customerRating?.count || 0;
      const newCount = prevCount + 1;
      const newAvg = (prevAvg * prevCount + num) / newCount;
      customer.customerRating = { average: Math.round(newAvg * 10) / 10, count: newCount };
      await customer.save();
    }

    createNotification({
      recipient: booking.customer._id,
      type: 'customer_rated',
      title: 'You were rated',
      message: `${booking.provider?.name || 'Your provider'} rated your booking ${num}★`,
      data: { bookingId: booking._id, fromUser: req.user._id }
    });

    return res.json({ success: true, data: { customerRatedByProvider: booking.customerRatedByProvider } });
  } catch (err) {
    console.error('rateCustomer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to rate customer' });
  }
};

/* ── Disputes ──────────────────────────────────────────────────────── */

/**
 * POST /bookings/:id/dispute
 * Multipart: photos[] + { reason }
 */
exports.raiseDispute = async (req, res) => {
  try {
    const ctx = await loadBooking(req, res, { role: 'customer' });
    if (!ctx) return;
    const { booking } = ctx;

    const { reason } = req.body;
    if (!reason || reason.trim().length < 10) {
      return res.status(400).json({ success: false, message: 'Reason (min 10 chars) required' });
    }
    if (!booking.canRaiseDispute()) {
      return res.status(400).json({ success: false, message: 'Cannot raise dispute on this booking (must be completed or no-show within 72h, no existing dispute)' });
    }

    const evidence = [];
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    for (const f of files) {
      try {
        const r = await uploadToCloudinary(f.buffer, 'housewife-services/disputes');
        evidence.push(r.secure_url);
      } catch (e) { /* skip */ }
    }

    booking.dispute = {
      raisedAt: new Date(),
      reason: reason.trim(),
      evidencePhotos: evidence,
      status: 'open',
      refundAmount: 0
    };
    booking.status = 'disputed';
    pushTimeline(booking, 'dispute_raised', req.user._id, 'customer', reason.trim(), {}, evidence);
    await booking.save();

    createNotification({
      recipient: booking.provider._id,
      type: 'dispute_raised',
      title: 'Dispute raised',
      message: `${booking.customer?.name || 'A customer'} raised a dispute`,
      data: { bookingId: booking._id, fromUser: req.user._id }
    });
    emitToBooking(String(booking._id), 'booking:dispute', { bookingId: String(booking._id), dispute: booking.dispute, status: booking.status });

    return res.json({ success: true, data: { dispute: booking.dispute, status: booking.status } });
  } catch (err) {
    console.error('raiseDispute error:', err);
    return res.status(500).json({ success: false, message: 'Failed to raise dispute' });
  }
};

/**
 * POST /bookings/:id/dispute/resolve
 * Admin only. Body: { decision: 'resolved' | 'rejected', resolution, refundAmount? }
 */
exports.resolveDispute = async (req, res) => {
  try {
    if (!req.user.isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }
    const ctx = await loadBooking(req, res);
    if (!ctx) return;
    const { booking } = ctx;
    if (booking.status !== 'disputed' || !booking.dispute || booking.dispute.status !== 'open') {
      return res.status(400).json({ success: false, message: 'No open dispute on this booking' });
    }

    const { decision = 'resolved', resolution = '', refundAmount = 0 } = req.body;
    if (!['resolved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: 'decision must be resolved or rejected' });
    }
    booking.dispute.status = decision;
    booking.dispute.resolution = resolution;
    booking.dispute.refundAmount = decision === 'resolved' ? Number(refundAmount) || 0 : 0;
    booking.dispute.resolvedAt = new Date();
    // resolvedBy expects an ObjectId; admin uses a string id, so only set if real
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(req.user._id)) {
      booking.dispute.resolvedBy = req.user._id;
    }
    booking.status = decision === 'resolved' ? 'resolved' : 'completed'; // rejected reverts to completed
    pushTimeline(booking,
      'dispute_resolved',
      mongoose.Types.ObjectId.isValid(req.user._id) ? req.user._id : null,
      'admin',
      `${decision} — ${resolution}`,
      { refundAmount: booking.dispute.refundAmount, decision });
    await booking.save();

    createNotification({
      recipient: booking.customer._id,
      type: decision === 'resolved' ? 'dispute_resolved' : 'dispute_rejected',
      title: decision === 'resolved' ? 'Dispute resolved' : 'Dispute rejected',
      message: resolution || (decision === 'resolved' ? 'Your dispute was resolved' : 'Your dispute was rejected'),
      data: { bookingId: booking._id }
    });
    createNotification({
      recipient: booking.provider._id,
      type: decision === 'resolved' ? 'dispute_resolved' : 'dispute_rejected',
      title: 'Dispute decision',
      message: resolution || `Dispute ${decision}`,
      data: { bookingId: booking._id }
    });
    emitToBooking(String(booking._id), 'booking:dispute', { bookingId: String(booking._id), dispute: booking.dispute, status: booking.status });

    // Emit real-time status change to both customer and provider for dashboard update
    const io = getIO();
    if (booking.customer?._id) {
      io.to(`user:${booking.customer._id}`).emit('booking:status-changed', {
        bookingId: booking._id,
        status: booking.status,
        previousStatus: 'disputed',
        message: `Dispute ${decision} - Booking status changed to ${booking.status}`
      });
    }
    if (booking.provider?._id) {
      io.to(`user:${booking.provider._id}`).emit('booking:status-changed', {
        bookingId: booking._id,
        status: booking.status,
        previousStatus: 'disputed',
        message: `Dispute ${decision} - Booking status changed to ${booking.status}`
      });
    }

    return res.json({ success: true, data: { dispute: booking.dispute, status: booking.status } });
  } catch (err) {
    console.error('resolveDispute error:', err);
    return res.status(500).json({ success: false, message: 'Failed to resolve dispute' });
  }
};

/* ── Rebook (1-click) ─────────────────────────────────────────────── */

/**
 * POST /bookings/:id/rebook
 * Body: { scheduledDate, scheduledTime } — clones service/package/add-ons/location.
 */
exports.rebook = async (req, res) => {
  try {
    const ctx = await loadBooking(req, res, { role: 'customer' });
    if (!ctx) return;
    const { booking: original } = ctx;

    const { scheduledDate, scheduledTime } = req.body;
    if (!scheduledDate || !scheduledTime?.start) {
      return res.status(400).json({ success: false, message: 'scheduledDate and scheduledTime.start required' });
    }

    const service = await Service.findById(original.service._id || original.service);
    if (!service || !service.isActive) {
      return res.status(400).json({ success: false, message: 'Original service no longer available' });
    }

    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const bookingCode = `BK${timestamp}${random}`.toUpperCase();

    const cloned = new Booking({
      bookingId: bookingCode,
      customer: req.user._id,
      provider: original.provider._id || original.provider,
      service: service._id,
      scheduledDate: new Date(scheduledDate),
      scheduledTime: {
        start: scheduledTime.start,
        ...(scheduledTime.end ? { end: scheduledTime.end } : {})
      },
      duration: original.duration,
      pricing: { agreedAmount: original.pricing?.agreedAmount || service.pricing?.amount || 0 },
      status: 'pending',
      customerNotes: original.customerNotes,
      location: original.location,
      ...(original.selectedPackage && { selectedPackage: original.selectedPackage }),
      ...(original.selectedAddOns?.length && { selectedAddOns: original.selectedAddOns }),
      timeline: [{
        type: 'created',
        by: req.user._id,
        byRole: 'customer',
        at: new Date(),
        message: 'Rebooked from previous service',
        data: { fromBooking: original._id }
      }]
    });
    await cloned.save();

    const populated = await Booking.findById(cloned._id)
      .populate('service', 'title category')
      .populate('provider', 'name phone profileImage')
      .populate('customer', 'name phone');

    createNotification({
      recipient: cloned.provider,
      type: 'booking_new',
      title: 'New (rebook) booking',
      message: `${req.user.name} rebooked "${service.title}"`,
      data: { bookingId: cloned._id, serviceId: service._id, fromUser: req.user._id }
    });

    return res.status(201).json({ success: true, data: { booking: populated } });
  } catch (err) {
    console.error('rebook error:', err);
    return res.status(500).json({ success: false, message: 'Failed to rebook' });
  }
};
