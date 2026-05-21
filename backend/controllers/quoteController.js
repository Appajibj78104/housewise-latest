const Booking = require('../models/Booking');
const Service = require('../models/Service');
const User = require('../models/User');
const { createNotification } = require('../utils/notifications');
const { emitToBooking, emitToUser } = require('../config/socket');

/**
 * POST /quotes/request — customer requests a quote on a negotiable service.
 * Creates a Booking with status='quote_pending'.
 *
 * Body: { serviceId, scheduledDate, scheduledTime, customerNotes, location, requestedBudget, requestedMessage }
 */
exports.requestQuote = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Customer role required' });
    }

    const {
      serviceId, scheduledDate, scheduledTime, customerNotes,
      location, requestedBudget, requestedMessage
    } = req.body;

    if (!serviceId || !scheduledDate || !scheduledTime?.start) {
      return res.status(400).json({
        success: false,
        message: 'serviceId, scheduledDate and scheduledTime.start are required'
      });
    }

    const service = await Service.findOne({
      _id: serviceId,
      isActive: true,
      isApproved: true
    }).populate('provider', 'name phone');

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found or not available' });
    }
    if (service.pricing?.type !== 'negotiable') {
      return res.status(400).json({
        success: false,
        message: 'This service has a fixed price — please use the regular booking flow'
      });
    }
    if (String(service.provider._id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot quote your own service' });
    }

    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    const bookingCode = `QT${timestamp}${random}`.toUpperCase();

    let resolvedLocation = location || { type: 'customer_address', address: req.user.address };
    if (resolvedLocation.address && typeof resolvedLocation.address === 'string') {
      resolvedLocation = { ...resolvedLocation, address: { street: resolvedLocation.address } };
    }

    const booking = new Booking({
      bookingId: bookingCode,
      customer: req.user._id,
      provider: service.provider._id,
      service: serviceId,
      scheduledDate: new Date(scheduledDate),
      scheduledTime: {
        start: scheduledTime.start,
        ...(scheduledTime.end ? { end: scheduledTime.end } : {})
      },
      duration: { estimated: service.duration?.estimated || 0 },
      pricing: { agreedAmount: 0 },
      status: 'quote_pending',
      customerNotes,
      location: resolvedLocation,
      quote: {
        requestedBudget: requestedBudget != null ? Number(requestedBudget) : null,
        requestedMessage: requestedMessage || '',
        offers: [],
        finalAmount: null
      },
      timeline: [{
        type: 'quote_request',
        by: req.user._id,
        byRole: 'customer',
        at: new Date(),
        message: requestedMessage || 'Quote requested',
        data: { requestedBudget: requestedBudget != null ? Number(requestedBudget) : null }
      }]
    });
    await booking.save();

    const populated = await Booking.findById(booking._id)
      .populate('service', 'title category pricing')
      .populate('provider', 'name phone profileImage')
      .populate('customer', 'name phone');

    createNotification({
      recipient: booking.provider,
      type: 'quote_received',
      title: 'New quote request',
      message: `${req.user.name || 'A customer'} requested a quote on "${populated.service?.title || 'your service'}"`,
      data: { bookingId: booking._id, serviceId: booking.service, fromUser: booking.customer }
    });
    emitToUser(String(booking.provider), 'quote:request', {
      bookingId: String(booking._id),
      bookingCode: booking.bookingId,
      requestedBudget: booking.quote.requestedBudget,
      requestedMessage: booking.quote.requestedMessage
    });

    return res.status(201).json({ success: true, data: { booking: populated } });
  } catch (err) {
    console.error('quotes.requestQuote error:', err);
    return res.status(500).json({ success: false, message: 'Failed to request quote' });
  }
};

/**
 * POST /quotes/:bookingId/offer — provider OR customer adds a counter offer.
 * Body: { amount, message }
 */
exports.addOffer = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { amount, message } = req.body;

    if (amount == null || isNaN(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ success: false, message: 'A non-negative amount is required' });
    }

    const booking = await Booking.findById(bookingId)
      .populate('service', 'title')
      .populate('customer', 'name')
      .populate('provider', 'name');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'quote_pending') {
      return res.status(400).json({ success: false, message: 'Booking is not in quote phase' });
    }

    const uid = String(req.user._id);
    const isCustomer = String(booking.customer._id) === uid;
    const isProvider = String(booking.provider._id) === uid;
    if (!isCustomer && !isProvider) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const offer = {
      by: req.user._id,
      byRole: isCustomer ? 'customer' : 'housewife',
      amount: Number(amount),
      message: message || '',
      at: new Date(),
      accepted: false
    };
    booking.quote.offers.push(offer);
    booking.timeline.push({
      type: 'quote_offer',
      by: req.user._id,
      byRole: isCustomer ? 'customer' : 'housewife',
      at: new Date(),
      message: message || `Offered ₹${offer.amount}`,
      data: { amount: offer.amount }
    });
    await booking.save();

    const recipient = isCustomer ? booking.provider._id : booking.customer._id;
    createNotification({
      recipient,
      type: 'quote_offer',
      title: 'New quote offer',
      message: `${req.user.name || 'They'} offered ₹${offer.amount}`,
      data: { bookingId: booking._id, fromUser: req.user._id }
    });
    emitToBooking(String(booking._id), 'quote:offer', { bookingId: String(booking._id), offer });
    emitToUser(String(recipient), 'quote:offer', { bookingId: String(booking._id), offer });

    return res.json({ success: true, data: { offer, offers: booking.quote.offers } });
  } catch (err) {
    console.error('quotes.addOffer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to add offer' });
  }
};

/**
 * POST /quotes/:bookingId/accept — accept the latest offer.
 * Customer accepts → booking moves to 'pending'.
 * Provider accepts a customer offer → booking moves to 'confirmed'.
 */
exports.acceptOffer = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId)
      .populate('service', 'title')
      .populate('customer', 'name')
      .populate('provider', 'name');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'quote_pending') {
      return res.status(400).json({ success: false, message: 'Booking is not in quote phase' });
    }

    const uid = String(req.user._id);
    const isCustomer = String(booking.customer._id) === uid;
    const isProvider = String(booking.provider._id) === uid;
    if (!isCustomer && !isProvider) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const offers = booking.quote.offers || [];
    if (!offers.length) {
      return res.status(400).json({ success: false, message: 'No offers to accept' });
    }

    // Latest offer must have been made by the OTHER party
    const latest = offers[offers.length - 1];
    const latestByRole = latest.byRole;
    if ((isCustomer && latestByRole === 'customer') || (isProvider && latestByRole === 'housewife')) {
      return res.status(400).json({ success: false, message: 'You can only accept the other party\'s offer' });
    }

    latest.accepted = true;
    booking.quote.finalAmount = latest.amount;
    booking.pricing.agreedAmount = latest.amount;

    // Provider accepting customer's offer → directly confirmed
    // Customer accepting provider's offer → moves to pending (provider already wants this; we can also auto-confirm)
    booking.status = isProvider ? 'confirmed' : 'pending';

    booking.timeline.push({
      type: 'quote_accepted',
      by: req.user._id,
      byRole: isCustomer ? 'customer' : 'housewife',
      at: new Date(),
      message: `Accepted offer of ₹${latest.amount}`,
      data: { amount: latest.amount }
    });

    if (booking.status === 'confirmed') {
      booking.timeline.push({
        type: 'confirmed',
        by: req.user._id,
        byRole: 'housewife',
        at: new Date(),
        message: 'Booking confirmed via quote acceptance'
      });
    }

    await booking.save();

    const recipient = isCustomer ? booking.provider._id : booking.customer._id;
    createNotification({
      recipient,
      type: 'quote_accepted',
      title: 'Quote accepted',
      message: `Your offer of ₹${latest.amount} was accepted`,
      data: { bookingId: booking._id, fromUser: req.user._id }
    });
    emitToBooking(String(booking._id), 'quote:accepted', {
      bookingId: String(booking._id),
      finalAmount: latest.amount,
      newStatus: booking.status
    });

    return res.json({ success: true, data: { booking } });
  } catch (err) {
    console.error('quotes.acceptOffer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to accept offer' });
  }
};

/**
 * POST /quotes/:bookingId/reject — either party closes the negotiation.
 */
exports.rejectQuote = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate('customer', 'name')
      .populate('provider', 'name');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'quote_pending') {
      return res.status(400).json({ success: false, message: 'Booking is not in quote phase' });
    }

    const uid = String(req.user._id);
    const isCustomer = String(booking.customer._id) === uid;
    const isProvider = String(booking.provider._id) === uid;
    if (!isCustomer && !isProvider) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: req.user._id,
      reason: reason || 'Quote rejected',
      cancelledAt: new Date()
    };
    booking.timeline.push({
      type: 'quote_rejected',
      by: req.user._id,
      byRole: isCustomer ? 'customer' : 'housewife',
      at: new Date(),
      message: reason || 'Quote rejected'
    });
    await booking.save();

    const recipient = isCustomer ? booking.provider._id : booking.customer._id;
    createNotification({
      recipient,
      type: 'quote_rejected',
      title: 'Quote rejected',
      message: reason || 'The other party closed the negotiation',
      data: { bookingId: booking._id, fromUser: req.user._id }
    });
    emitToBooking(String(booking._id), 'quote:rejected', { bookingId: String(booking._id) });

    return res.json({ success: true, data: { booking } });
  } catch (err) {
    console.error('quotes.rejectQuote error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject quote' });
  }
};

/**
 * GET /quotes/:bookingId — fetch the quote thread.
 */
exports.getQuote = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await Booking.findById(bookingId)
      .populate('service', 'title category pricing')
      .populate('customer', 'name profileImage')
      .populate('provider', 'name profileImage');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const uid = String(req.user._id);
    const isParticipant = String(booking.customer._id) === uid || String(booking.provider._id) === uid || req.user.isAdmin;
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Forbidden' });

    return res.json({ success: true, data: { booking } });
  } catch (err) {
    console.error('quotes.getQuote error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch quote' });
  }
};
