const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200,
  },
  category: {
    type: String,
    enum: ['booking_issue', 'payment', 'provider_complaint', 'service_quality', 'account', 'technical', 'other'],
    default: 'other',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'awaiting_response', 'resolved', 'closed'],
    default: 'open',
  },
  relatedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
  },
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'admin'],
      required: true,
    },
    senderName: String,
    message: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    attachments: [{ url: String, name: String }],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  }],
  assignedTo: String,
  resolution: {
    summary: String,
    resolvedAt: Date,
    resolvedBy: String,
  },
  tags: [String],
}, { timestamps: true });

supportTicketSchema.pre('save', function(next) {
  if (!this.ticketId) {
    this.ticketId = 'TK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
  }
  next();
});

supportTicketSchema.index({ user: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
