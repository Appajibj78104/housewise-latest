const mongoose = require('mongoose');

const adminActivityLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['login', 'logout', 'session_expired', 'page_view', 'api_action'],
  },
  adminEmail: {
    type: String,
    required: true,
  },
  ip: {
    type: String,
    default: 'unknown',
  },
  userAgent: {
    type: String,
    default: '',
  },
  details: {
    type: String,
    default: '',
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Auto-expire logs after 90 days
adminActivityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
adminActivityLogSchema.index({ adminEmail: 1, createdAt: -1 });
adminActivityLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AdminActivityLog', adminActivityLogSchema);
