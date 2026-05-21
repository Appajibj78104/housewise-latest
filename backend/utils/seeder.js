const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/housewife-services');
    console.log('MongoDB connected for seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedCategories = async () => {
  try {
    console.log('Seeding categories...');
    
    const categories = [
      {
        name: 'cooking',
        displayName: 'Cooking',
        description: 'Home cooking, meal preparation, and catering services',
        icon: '🍳',
        color: '#F59E0B',
        subcategories: [
          { name: 'daily_meals', displayName: 'Daily Meals', description: 'Regular home-cooked meals' },
          { name: 'special_occasions', displayName: 'Special Occasions', description: 'Festival and celebration cooking' },
          { name: 'tiffin_service', displayName: 'Tiffin Service', description: 'Regular meal delivery service' },
          { name: 'party_catering', displayName: 'Party Catering', description: 'Small party and event catering' }
        ],
        tags: ['food', 'meals', 'catering', 'kitchen', 'homemade'],
        sortOrder: 1
      },
      {
        name: 'tailoring',
        displayName: 'Tailoring',
        description: 'Clothing alterations, stitching, and custom garments',
        icon: '✂️',
        color: '#8B5CF6',
        subcategories: [
          { name: 'alterations', displayName: 'Alterations', description: 'Clothing adjustments and fitting' },
          { name: 'custom_stitching', displayName: 'Custom Stitching', description: 'Made-to-order garments' },
          { name: 'embroidery', displayName: 'Embroidery', description: 'Decorative needlework' },
          { name: 'repairs', displayName: 'Repairs', description: 'Clothing repair and mending' }
        ],
        tags: ['sewing', 'clothes', 'fashion', 'alterations', 'stitching'],
        sortOrder: 2
      },
      {
        name: 'tuition',
        displayName: 'Tuition',
        description: 'Home tutoring and educational support',
        icon: '📚',
        color: '#10B981',
        subcategories: [
          { name: 'primary_education', displayName: 'Primary Education', description: 'Classes 1-5 tutoring' },
          { name: 'secondary_education', displayName: 'Secondary Education', description: 'Classes 6-12 tutoring' },
          { name: 'language_classes', displayName: 'Language Classes', description: 'Local and foreign language teaching' },
          { name: 'skill_development', displayName: 'Skill Development', description: 'Computer skills, arts, and crafts' }
        ],
        tags: ['education', 'teaching', 'learning', 'academic', 'homework'],
        sortOrder: 3
      },
      {
        name: 'beauty',
        displayName: 'Beauty Services',
        description: 'Beauty treatments, grooming, and wellness services',
        icon: '💄',
        color: '#EC4899',
        subcategories: [
          { name: 'hair_styling', displayName: 'Hair Styling', description: 'Hair cutting, styling, and treatment' },
          { name: 'makeup', displayName: 'Makeup', description: 'Bridal and occasion makeup' },
          { name: 'skincare', displayName: 'Skincare', description: 'Facial treatments and skincare' },
          { name: 'nail_care', displayName: 'Nail Care', description: 'Manicure and pedicure services' }
        ],
        tags: ['beauty', 'grooming', 'makeup', 'wellness', 'skincare'],
        sortOrder: 4
      },
      {
        name: 'cleaning',
        displayName: 'Cleaning',
        description: 'House cleaning and maintenance services',
        icon: '🧹',
        color: '#06B6D4',
        subcategories: [
          { name: 'regular_cleaning', displayName: 'Regular Cleaning', description: 'Daily and weekly house cleaning' },
          { name: 'deep_cleaning', displayName: 'Deep Cleaning', description: 'Thorough cleaning and sanitization' },
          { name: 'laundry', displayName: 'Laundry', description: 'Washing, ironing, and folding clothes' },
          { name: 'organization', displayName: 'Organization', description: 'Home organization and decluttering' }
        ],
        tags: ['cleaning', 'housekeeping', 'maintenance', 'hygiene', 'laundry'],
        sortOrder: 5
      },
      {
        name: 'childcare',
        displayName: 'Childcare',
        description: 'Babysitting and child supervision services',
        icon: '👶',
        color: '#F97316',
        subcategories: [
          { name: 'babysitting', displayName: 'Babysitting', description: 'Temporary child supervision' },
          { name: 'daycare', displayName: 'Daycare', description: 'Regular childcare during working hours' },
          { name: 'activity_supervision', displayName: 'Activity Supervision', description: 'Supervised play and activities' },
          { name: 'homework_help', displayName: 'Homework Help', description: 'Academic support for children' }
        ],
        tags: ['childcare', 'babysitting', 'kids', 'supervision', 'activities'],
        sortOrder: 6
      },
      {
        name: 'eldercare',
        displayName: 'Eldercare',
        description: 'Care and assistance for elderly family members',
        icon: '👵',
        color: '#6B7280',
        subcategories: [
          { name: 'companionship', displayName: 'Companionship', description: 'Social interaction and emotional support' },
          { name: 'medication_reminder', displayName: 'Medication Reminder', description: 'Help with medication schedules' },
          { name: 'mobility_assistance', displayName: 'Mobility Assistance', description: 'Help with walking and movement' },
          { name: 'meal_preparation', displayName: 'Meal Preparation', description: 'Cooking for elderly individuals' }
        ],
        tags: ['eldercare', 'seniors', 'assistance', 'companionship', 'health'],
        sortOrder: 7
      },
      {
        name: 'handicrafts',
        displayName: 'Handicrafts',
        description: 'Traditional crafts and handmade items',
        icon: '🎨',
        color: '#7C3AED',
        subcategories: [
          { name: 'pottery', displayName: 'Pottery', description: 'Clay work and ceramic items' },
          { name: 'jewelry_making', displayName: 'Jewelry Making', description: 'Handmade jewelry and accessories' },
          { name: 'textile_crafts', displayName: 'Textile Crafts', description: 'Knitting, crocheting, and weaving' },
          { name: 'decorative_items', displayName: 'Decorative Items', description: 'Home decor and gift items' }
        ],
        tags: ['handicrafts', 'handmade', 'traditional', 'crafts', 'art'],
        sortOrder: 8
      }
    ];

    for (const categoryData of categories) {
      const existingCategory = await Category.findOne({ name: categoryData.name });
      if (!existingCategory) {
        await Category.create(categoryData);
        console.log(`Created category: ${categoryData.displayName}`);
      } else {
        console.log(`Category already exists: ${categoryData.displayName}`);
      }
    }

    console.log('Categories seeded successfully!');
  } catch (error) {
    console.error('Error seeding categories:', error);
  }
};

const seedAdminUser = async () => {
  try {
    console.log('Creating admin user...');
    
    const adminEmail = 'admin@housewife-services.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const adminUser = new User({
        name: 'System Administrator',
        email: adminEmail,
        password: 'admin123456', // This will be hashed by the pre-save middleware
        phone: '9999999999',
        role: 'admin',
        isActive: true,
        isVerified: true,
        address: {
          city: 'System',
          state: 'System',
          pincode: '000000'
        }
      });

      await adminUser.save();
      console.log('Admin user created successfully!');
      console.log('Email: admin@housewife-services.com');
      console.log('Password: admin123456');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

const seedSampleData = async () => {
  try {
    console.log('Creating sample housewife user...');
    
    const sampleEmail = 'priya.sharma@example.com';
    const existingSample = await User.findOne({ email: sampleEmail });
    
    if (!existingSample) {
      const sampleUser = new User({
        name: 'Priya Sharma',
        email: sampleEmail,
        password: 'password123',
        phone: '9876543210',
        role: 'housewife',
        isActive: true,
        isVerified: true,
        bio: 'Experienced home cook specializing in North Indian cuisine. I have been cooking for my family for over 10 years and love sharing my passion for food with others.',
        experience: 10,
        address: {
          street: '123 Main Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          coordinates: {
            latitude: 19.0760,
            longitude: 72.8777
          }
        },
        availability: {
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
          timeSlots: [
            { start: '09:00', end: '12:00' },
            { start: '14:00', end: '17:00' }
          ]
        },
        rating: {
          average: 4.5,
          count: 23
        }
      });

      await sampleUser.save();
      console.log('Sample housewife user created!');
      console.log('Email: priya.sharma@example.com');
      console.log('Password: password123');
    } else {
      console.log('Sample user already exists');
    }

    // Create sample customer
    const customerEmail = 'customer@example.com';
    const existingCustomer = await User.findOne({ email: customerEmail });
    
    if (!existingCustomer) {
      const customerUser = new User({
        name: 'Rahul Gupta',
        email: customerEmail,
        password: 'password123',
        phone: '9876543211',
        role: 'customer',
        isActive: true,
        isVerified: true,
        address: {
          street: '456 Park Avenue',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400002',
          coordinates: {
            latitude: 19.0760,
            longitude: 72.8777
          }
        }
      });

      await customerUser.save();
      console.log('Sample customer user created!');
      console.log('Email: customer@example.com');
      console.log('Password: password123');
    } else {
      console.log('Sample customer already exists');
    }

  } catch (error) {
    console.error('Error creating sample data:', error);
  }
};

const runSeeder = async () => {
  await connectDB();
  
  console.log('🌱 Starting database seeding...');
  
  await seedCategories();
  await seedAdminUser();
  await seedSampleData();
  
  console.log('✅ Database seeding completed!');
  console.log('\n📝 Login Credentials:');
  console.log('Admin: admin@housewife-services.com / admin123456');
  console.log('Housewife: priya.sharma@example.com / password123');
  console.log('Customer: customer@example.com / password123');
  
  process.exit(0);
};

// Run seeder if this file is executed directly
if (require.main === module) {
  runSeeder();
}

module.exports = { runSeeder, seedCategories, seedAdminUser, seedSampleData };
