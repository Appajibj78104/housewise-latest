const mongoose = require('mongoose');

const contentPageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    maxlength: 200,
  },
  content: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['faq', 'terms', 'privacy', 'about', 'landing', 'help'],
    default: 'help',
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  updatedBy: String,
}, { timestamps: true });

contentPageSchema.index({ category: 1, sortOrder: 1 });

module.exports = mongoose.model('ContentPage', contentPageSchema);
