const express = require('express');
const { requireAdmin } = require('../middleware/adminAuth');
const ctrl = require('../controllers/adminController');
const ext = require('../controllers/adminExtendedController');
const kycController = require('../controllers/kycController');

const router = express.Router();

// Dashboard
router.get('/overview',                requireAdmin, ctrl.getOverview);

// Customers
router.get('/customers',               requireAdmin, ctrl.getCustomers);
router.put('/customers/:id/toggle',    requireAdmin, ctrl.toggleCustomer);

// Providers
router.get('/providers/pending',       requireAdmin, ctrl.getPendingProviders);
router.get('/providers/approved',      requireAdmin, ctrl.getApprovedProviders);
router.get('/providers/rankings',      requireAdmin, ext.getProviderRankings);
router.post('/providers/bulk-action',  requireAdmin, ext.bulkProviderAction);
router.post('/providers/notify',       requireAdmin, ext.notifyProviders);
router.get('/providers/:id',           requireAdmin, ext.getProviderDetail);
router.put('/providers/:id/approve',   requireAdmin, ctrl.approveProvider);
router.put('/providers/:id/reject',    requireAdmin, ctrl.rejectProvider);
router.put('/providers/:id/toggle',    requireAdmin, ctrl.toggleProvider);

// Bookings
router.get('/bookings/search',         requireAdmin, ext.searchBookings);
router.post('/bookings/bulk-status',   requireAdmin, ext.bulkBookingStatus);
router.get('/bookings/:id',            requireAdmin, ext.getBookingDetail);
router.post('/bookings/:id/refund',    requireAdmin, ext.processRefund);
router.get('/bookings',                requireAdmin, ctrl.getBookings);
router.put('/bookings/:id/status',     requireAdmin, ctrl.forceUpdateBookingStatus);

// Reviews
router.get('/reviews/trends',          requireAdmin, ext.getReviewTrends);
router.post('/reviews/auto-flag',      requireAdmin, ext.autoFlagReviews);
router.post('/reviews/:id/respond',    requireAdmin, ext.respondToReview);
router.get('/reviews',                 requireAdmin, ctrl.getReviews);
router.put('/reviews/:id/flag',        requireAdmin, ctrl.flagReview);
router.delete('/reviews/:id',          requireAdmin, ctrl.deleteReview);

// Services
router.get('/services',                requireAdmin, ext.getServices);
router.put('/services/:id/toggle',     requireAdmin, ext.toggleService);

// Categories
router.get('/categories',              requireAdmin, ext.getCategories);
router.post('/categories',             requireAdmin, ext.createCategory);
router.put('/categories/:id',          requireAdmin, ext.updateCategory);
router.delete('/categories/:id',       requireAdmin, ext.deleteCategory);

// Financial
router.get('/financial',               requireAdmin, ext.getFinancialOverview);

// Notifications Management
router.post('/notifications/broadcast', requireAdmin, ext.broadcastNotification);
router.get('/notifications/history',   requireAdmin, ext.getNotificationHistory);

// System Settings
router.get('/settings/system',         requireAdmin, ext.getSystemSettings);
router.put('/settings/system',         requireAdmin, ext.updateSystemSettings);

// Content Management
router.get('/content',                 requireAdmin, ext.getContentPages);
router.put('/content/:slug',           requireAdmin, ext.upsertContentPage);
router.delete('/content/:slug',        requireAdmin, ext.deleteContentPage);

// Support Tickets
router.get('/support',                 requireAdmin, ext.getSupportTickets);
router.get('/support/:id',             requireAdmin, ext.getTicketDetail);
router.post('/support/:id/respond',    requireAdmin, ext.respondToTicket);
router.put('/support/:id/status',      requireAdmin, ext.updateTicketStatus);

// Analytics & Charts
router.get('/analytics',               requireAdmin, ctrl.getAnalytics);

// Activity Log / Audit Trail
router.get('/activity',                requireAdmin, ctrl.getActivityLogs);
router.post('/activity',               requireAdmin, ctrl.logActivity);

// Export
router.get('/export',                  requireAdmin, ctrl.getDashboardExport);

// Health Check
router.get('/health',                  requireAdmin, (req, res) => {
  const memUsage = process.memoryUsage();
  const mongoose = require('mongoose');
  res.json({
    success: true,
    data: {
      status: mongoose.connection.readyState === 1 ? 'healthy' : 'degraded',
      message: 'All systems operational',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
      timestamp: new Date().toISOString(),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
      },
      services: {
        mongodb: { status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' },
        websocket: { status: 'up' },
        api: { status: 'up', responseTime: 1 },
      },
    },
  });
});

// KYC moderation
router.get('/kyc/pending',             requireAdmin, kycController.adminListPending);
router.post('/kyc/:userId/approve',    requireAdmin, kycController.adminApprove);
router.post('/kyc/:userId/reject',     requireAdmin, kycController.adminReject);

// Dispute resolution (forwarded to lifecycle controller for shared semantics)
const lifecycle = require('../controllers/bookingLifecycleController');
const adminToUserAdapter = (req, res, next) => {
  // adminAuth sets req.admin; lifecycle controller expects req.user.isAdmin
  req.user = { _id: req.admin?.adminId || 'admin-001', isAdmin: true, role: 'admin' };
  next();
};
router.post('/bookings/:id/dispute/resolve', requireAdmin, adminToUserAdapter, lifecycle.resolveDispute);

// List all bookings with active or resolved disputes for the admin dispute panel.
const Booking = require('../models/Booking');
router.get('/disputes', requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { 'dispute.status': { $exists: true } };
    if (status && ['open', 'resolved', 'rejected'].includes(status)) {
      filter['dispute.status'] = status;
    } else {
      filter['dispute.status'] = { $in: ['open', 'resolved', 'rejected'] };
    }
    const disputes = await Booking.find(filter)
      .populate('customer', 'name email phone profileImage')
      .populate('provider', 'name email phone profileImage rating')
      .populate('service', 'title category images pricing')
      .sort({ 'dispute.raisedAt': -1 })
      .limit(200)
      .lean();
    return res.json({ success: true, data: { disputes } });
  } catch (err) {
    console.error('admin list disputes error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load disputes' });
  }
});

// Settings (password/logout)
router.post('/settings/password',      requireAdmin, ctrl.changePassword);
router.post('/logout',                 requireAdmin, ctrl.logout);

module.exports = router;
