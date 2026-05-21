const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    lowercase: true
  },
  displayName: {
    type: String,
    required: [true, 'Display name is required'],
    trim: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  icon: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#6B7280'
  },
  subcategories: [{
    name: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    displayName: {
      type: String,
      required: true,
      trim: true
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  serviceCount: {
    type: Number,
    default: 0
  },
  popularityScore: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  seoData: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
}, {
  timestamps: true
});

// Indexes
// 'name' field already has unique: true constraint which creates an index
categorySchema.index({ isActive: 1, sortOrder: 1 });
categorySchema.index({ popularityScore: -1 });

// Virtual for active subcategories
categorySchema.virtual('activeSubcategories').get(function() {
  return this.subcategories.filter(sub => sub.isActive);
});

// Method to add subcategory
categorySchema.methods.addSubcategory = function(subcategoryData) {
  this.subcategories.push(subcategoryData);
  return this.save();
};

// Method to update service count
categorySchema.methods.updateServiceCount = async function() {
  const Service = mongoose.model('Service');
  const count = await Service.countDocuments({ 
    category: this.name, 
    isActive: true, 
    isApproved: true 
  });
  this.serviceCount = count;
  return this.save();
};

// Static method to get popular categories
categorySchema.statics.getPopular = function(limit = 6) {
  return this.find({ isActive: true })
    .sort({ popularityScore: -1, serviceCount: -1 })
    .limit(limit);
};

// Static method to initialize default categories
categorySchema.statics.initializeDefaults = async function() {
  const defaultCategories = [
    {
      name: 'cooking',
      displayName: 'Cooking',
      description: 'Home cooking, meal preparation, and catering services',
      icon: '🍳',
      color: '#F59E0B',
      subcategories: [
        { name: 'daily_meals', displayName: 'Daily Meals' },
        { name: 'special_occasions', displayName: 'Special Occasions' },
        { name: 'tiffin_service', displayName: 'Tiffin Service' },
        { name: 'party_catering', displayName: 'Party Catering' }
      ],
      tags: ['food', 'meals', 'catering', 'kitchen']
    },
    {
      name: 'tailoring',
      displayName: 'Tailoring',
      description: 'Clothing alterations, stitching, and custom garments',
      icon: '✂️',
      color: '#8B5CF6',
      subcategories: [
        { name: 'alterations', displayName: 'Alterations' },
        { name: 'custom_stitching', displayName: 'Custom Stitching' },
        { name: 'embroidery', displayName: 'Embroidery' },
        { name: 'repairs', displayName: 'Repairs' }
      ],
      tags: ['sewing', 'clothes', 'fashion', 'alterations']
    },
    {
      name: 'tuition',
      displayName: 'Tuition',
      description: 'Home tutoring and educational support',
      icon: '📚',
      color: '#10B981',
      subcategories: [
        { name: 'primary_education', displayName: 'Primary Education' },
        { name: 'secondary_education', displayName: 'Secondary Education' },
        { name: 'language_classes', displayName: 'Language Classes' },
        { name: 'skill_development', displayName: 'Skill Development' }
      ],
      tags: ['education', 'teaching', 'learning', 'academic']
    },
    {
      name: 'beauty',
      displayName: 'Beauty Services',
      description: 'Beauty treatments, grooming, and wellness services',
      icon: '💄',
      color: '#EC4899',
      subcategories: [
        { name: 'hair_styling', displayName: 'Hair Styling' },
        { name: 'makeup', displayName: 'Makeup' },
        { name: 'skincare', displayName: 'Skincare' },
        { name: 'nail_care', displayName: 'Nail Care' }
      ],
      tags: ['beauty', 'grooming', 'makeup', 'wellness']
    },
    {
      name: 'cleaning',
      displayName: 'Cleaning',
      description: 'House cleaning and maintenance services',
      icon: '🧹',
      color: '#06B6D4',
      subcategories: [
        { name: 'regular_cleaning', displayName: 'Regular Cleaning' },
        { name: 'deep_cleaning', displayName: 'Deep Cleaning' },
        { name: 'laundry', displayName: 'Laundry' },
        { name: 'organization', displayName: 'Organization' }
      ],
      tags: ['cleaning', 'housekeeping', 'maintenance', 'hygiene']
    },
    {
      name: 'childcare',
      displayName: 'Childcare',
      description: 'Babysitting and child supervision services',
      icon: '👶',
      color: '#F97316',
      subcategories: [
        { name: 'babysitting', displayName: 'Babysitting' },
        { name: 'daycare', displayName: 'Daycare' },
        { name: 'activity_supervision', displayName: 'Activity Supervision' },
        { name: 'homework_help', displayName: 'Homework Help' }
      ],
      tags: ['childcare', 'babysitting', 'kids', 'supervision']
    }
  ];

  for (const categoryData of defaultCategories) {
    const existingCategory = await this.findOne({ name: categoryData.name });
    if (!existingCategory) {
      await this.create(categoryData);
    }
  }
};

// Ensure virtual fields are serialized
categorySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Category', categorySchema);
