const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Service = require('../models/Service');
const PDFDocument = require('pdfkit');

// GET /api/invoices/history/my - Get user's invoice history (MUST be before /:bookingId)
router.get('/history/my', authenticateToken, async (req, res) => {
  try {
    const query = { status: 'completed' };
    if (req.user.role === 'customer') {
      query.customer = req.user._id;
    } else if (req.user.role === 'housewife') {
      query.provider = req.user._id;
    }

    const bookings = await Booking.find(query)
      .populate('service', 'title category')
      .populate('customer', 'name')
      .populate('provider', 'name')
      .select('bookingId scheduledDate pricing status createdAt')
      .sort({ createdAt: -1 })
      .limit(50);

    const invoices = bookings.map(b => ({
      bookingId: b._id,
      invoiceId: `INV-${b.bookingId}`,
      date: b.scheduledDate,
      service: b.service?.title,
      category: b.service?.category,
      amount: b.pricing.agreedAmount,
      currency: b.pricing.currency || 'INR',
      customer: b.customer?.name,
      provider: b.provider?.name
    }));

    res.json({ success: true, data: { invoices } });
  } catch (error) {
    console.error('Invoice history error:', error);
    res.status(500).json({ success: false, message: 'Failed to get invoice history' });
  }
});

// GET /api/invoices/:bookingId - Generate PDF invoice data
router.get('/:bookingId', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('customer', 'name email phone address')
      .populate('provider', 'name email phone address')
      .populate('service', 'title category pricing');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Only customer, provider, or admin can access invoice
    const isOwner = booking.customer._id.toString() === req.user._id.toString() ||
                    booking.provider._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!['completed', 'resolved'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Invoice only available for completed or resolved bookings' });
    }

    const invoiceNumber = `INV-${booking.bookingId}-${Date.now().toString(36).toUpperCase()}`;
    const taxRate = 0.18; // GST 18%
    const subtotal = booking.pricing.agreedAmount;
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount;

    const invoice = {
      invoiceNumber,
      issueDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      status: 'paid',
      
      booking: {
        id: booking.bookingId,
        scheduledDate: booking.scheduledDate,
        scheduledTime: booking.scheduledTime,
        completedAt: booking.updatedAt,
        duration: booking.duration
      },
      
      customer: {
        name: booking.customer.name,
        email: booking.customer.email,
        phone: booking.customer.phone,
        address: booking.customer.address
      },
      
      provider: {
        name: booking.provider.name,
        email: booking.provider.email,
        phone: booking.provider.phone,
        address: booking.provider.address
      },
      
      service: {
        title: booking.service.title,
        category: booking.service.category,
        description: booking.customerNotes || ''
      },
      
      pricing: {
        subtotal,
        taxRate: taxRate * 100,
        taxAmount,
        total,
        currency: booking.pricing.currency || 'INR',
        paymentMethod: booking.pricing.paymentMethod,
        transactionId: booking.pricing.transactionId
      },
      
      company: {
        name: 'HouseWise Services',
        tagline: 'Professional Home Services',
        gstin: 'XXXXXXXXXXXXXXXXX',
        address: 'Mumbai, Maharashtra, India',
        email: 'billing@housewise.in',
        phone: '+91 XXXXXXXXXX'
      }
    };

    res.json({ success: true, data: { invoice } });
  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  }
});

// GET /api/invoices/:bookingId/download - Download PDF invoice
router.get('/:bookingId/download', authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId)
      .populate('customer', 'name email phone address')
      .populate('provider', 'name email phone address')
      .populate('service', 'title category pricing');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isOwner = booking.customer._id.toString() === req.user._id.toString() ||
                    booking.provider._id.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (!['completed', 'resolved'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Invoice only available for completed or resolved bookings' });
    }

    const invoiceNumber = `INV-${booking.bookingId}-${Date.now().toString(36).toUpperCase()}`;
    const taxRate = 0.18;
    const subtotal = booking.pricing.agreedAmount;
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount;

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoiceNumber}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('HouseWise Services', 50, 50);
    doc.fontSize(9).font('Helvetica').text('Professional Home Services', 50, 75);
    doc.fontSize(9).text('Mumbai, Maharashtra, India', 50, 88);
    doc.fontSize(9).text('GSTIN: XXXXXXXXXXXXXXXXX', 50, 101);

    // Invoice title
    doc.fontSize(16).font('Helvetica-Bold').fillColor('#FF6B4A').text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(9).font('Helvetica').fillColor('#333').text(`#${invoiceNumber}`, 400, 72, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 400, 85, { align: 'right' });
    doc.fontSize(10).fillColor('#10B981').text('PAID', 400, 100, { align: 'right' });

    // Horizontal line
    doc.moveTo(50, 125).lineTo(545, 125).stroke('#ddd');

    // Bill To / Provider
    doc.fillColor('#333');
    doc.fontSize(9).font('Helvetica-Bold').text('BILL TO', 50, 140);
    doc.fontSize(10).font('Helvetica').text(booking.customer.name, 50, 155);
    doc.fontSize(9).text(booking.customer.email || '', 50, 170);
    doc.text(booking.customer.phone || '', 50, 183);

    doc.fontSize(9).font('Helvetica-Bold').text('SERVICE PROVIDER', 300, 140);
    doc.fontSize(10).font('Helvetica').text(booking.provider.name, 300, 155);
    doc.text(booking.provider.email || '', 300, 170);
    doc.text(booking.provider.phone || '', 300, 183);

    // Table header
    const tableTop = 220;
    doc.moveTo(50, tableTop).lineTo(545, tableTop).stroke('#ddd');
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('SERVICE', 50, tableTop + 8);
    doc.text('CATEGORY', 250, tableTop + 8);
    doc.text('DATE', 350, tableTop + 8);
    doc.text('AMOUNT', 470, tableTop + 8, { align: 'right' });
    doc.moveTo(50, tableTop + 25).lineTo(545, tableTop + 25).stroke('#ddd');

    // Table row
    doc.fontSize(10).font('Helvetica');
    doc.text(booking.service.title, 50, tableTop + 35);
    doc.fontSize(9).text(booking.service.category, 250, tableTop + 35);
    doc.text(new Date(booking.scheduledDate).toLocaleDateString('en-IN'), 350, tableTop + 35);
    doc.fontSize(10).text(`₹${subtotal.toLocaleString('en-IN')}`, 470, tableTop + 35, { align: 'right' });

    // Totals
    const totalsTop = tableTop + 75;
    doc.moveTo(350, totalsTop).lineTo(545, totalsTop).stroke('#ddd');
    doc.fontSize(9).font('Helvetica').text('Subtotal', 350, totalsTop + 10);
    doc.text(`₹${subtotal.toLocaleString('en-IN')}`, 470, totalsTop + 10, { align: 'right' });
    doc.text('Tax (GST 18%)', 350, totalsTop + 28);
    doc.text(`₹${taxAmount.toLocaleString('en-IN')}`, 470, totalsTop + 28, { align: 'right' });
    doc.moveTo(350, totalsTop + 45).lineTo(545, totalsTop + 45).stroke('#ddd');
    doc.fontSize(11).font('Helvetica-Bold').text('Total', 350, totalsTop + 55);
    doc.fillColor('#FF6B4A').text(`₹${total.toLocaleString('en-IN')}`, 470, totalsTop + 55, { align: 'right' });

    // Footer
    doc.fillColor('#999').fontSize(8).font('Helvetica');
    doc.text('Thank you for using HouseWise Services!', 50, 700, { align: 'center' });
    doc.text('billing@housewise.in | +91 XXXXXXXXXX', 50, 713, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('PDF invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF invoice' });
  }
});

module.exports = router;
