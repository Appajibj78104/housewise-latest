/**
 * Unified Category Configuration (Frontend)
 * Mirror of backend/constants/categories.js — keep in sync.
 */

export const CATEGORIES = {
  cooking: {
    label: 'Cooking',
    emoji: '🍱',
    color: '#F59E0B',
    subcategories: [
      'North Indian', 'South Indian', 'Chinese', 'Continental',
      'Baking & Desserts', 'Meal Prep', 'Tiffin Service', 'Party Catering',
      'Diet & Health Food', 'Regional Specialty'
    ],
    smartFields: {
      cuisineType: {
        label: 'Cuisine Specialties',
        type: 'multi-select',
        options: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain', 'Eggetarian', 'Sugar-Free', 'Gluten-Free'],
        required: true,
      },
      mealType: {
        label: 'Meal Type',
        type: 'multi-select',
        options: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Full Day Meals'],
        required: false,
      },
      servingCapacity: {
        label: 'Maximum Servings (people)',
        type: 'number',
        min: 1, max: 100,
        placeholder: 'e.g., 4',
        required: true,
      },
    },
    addOns: [
      { id: 'premium_ingredients', label: 'Premium Ingredients', price: 200, description: 'Use organic/premium ingredients' },
      { id: 'extra_servings', label: 'Extra Servings (+2 people)', price: 150, description: 'Serve 2 additional people' },
      { id: 'dessert', label: 'Add Dessert', price: 100, description: 'One dessert item included' },
      { id: 'cleanup', label: 'Kitchen Cleanup', price: 100, description: 'Clean kitchen after cooking' },
    ],
    defaultDuration: 120,
    tips: 'Mention your signature dishes, years of experience, and any certifications.',
  },

  tailoring: {
    label: 'Tailoring',
    emoji: '✂️',
    color: '#EC4899',
    subcategories: [
      'Blouse Stitching', 'Dress Making', 'Alterations & Repairs',
      'Embroidery & Handwork', 'Curtains & Furnishing', 'Kids Clothing',
      'Lehenga/Sherwani', 'Uniform Stitching'
    ],
    smartFields: {
      garmentTypes: {
        label: 'Garment Types',
        type: 'multi-select',
        options: ['Blouses', 'Salwar/Churidar', 'Dresses', 'Lehengas', 'Shirts', 'Pants', 'Kids Wear', 'Curtains', 'Cushion Covers'],
        required: true,
      },
      measurementMode: {
        label: 'How do you take measurements?',
        type: 'select',
        options: ['I visit customer', 'Customer visits me', 'Customer sends measurements', 'Both visit & remote'],
        required: true,
      },
      turnaroundDays: {
        label: 'Typical Turnaround (days)',
        type: 'number',
        min: 1, max: 60,
        placeholder: 'e.g., 7',
        required: true,
      },
    },
    addOns: [
      { id: 'express_delivery', label: 'Express Delivery (2 days)', price: 300, description: 'Rush order surcharge' },
      { id: 'fabric_sourcing', label: 'Fabric Sourcing', price: 0, description: 'I can source fabric for you (cost separate)' },
      { id: 'embroidery', label: 'Embroidery/Handwork', price: 500, description: 'Custom embroidery work' },
      { id: 'trial_fitting', label: 'Extra Trial Fitting', price: 100, description: 'Additional fitting session' },
    ],
    defaultDuration: 60,
    tips: 'Include photos of past work. Mention specialties like embroidery, designer replicas, etc.',
  },

  tuition: {
    label: 'Tuition',
    emoji: '📚',
    color: '#3B82F6',
    subcategories: [
      'School Subjects', 'Board Exam Prep', 'Competitive Exams',
      'Language Classes', 'Music Lessons', 'Art & Craft Classes',
      'Computer Training', 'Spoken English', 'Yoga & Meditation'
    ],
    smartFields: {
      subjects: {
        label: 'Subjects / Skills Taught',
        type: 'tags',
        placeholder: 'e.g., Maths, English, Piano',
        required: true,
      },
      gradeLevel: {
        label: 'Grade / Level',
        type: 'multi-select',
        options: ['Pre-school', 'Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12', 'College', 'Adult Learners'],
        required: true,
      },
      teachingMode: {
        label: 'Teaching Mode',
        type: 'multi-select',
        options: ['In-person (at student home)', 'In-person (at my place)', 'Online (video call)', 'Hybrid'],
        required: true,
      },
      batchSize: {
        label: 'Maximum Batch Size',
        type: 'number',
        min: 1, max: 30,
        placeholder: 'e.g., 1 for private, 5 for group',
        required: true,
      },
    },
    addOns: [
      { id: 'study_material', label: 'Study Material Included', price: 200, description: 'Printed notes & worksheets' },
      { id: 'doubt_clearing', label: 'WhatsApp Doubt Clearing', price: 100, description: '24/7 doubt resolution via chat' },
      { id: 'progress_report', label: 'Monthly Progress Report', price: 0, description: 'Detailed performance analysis' },
      { id: 'extra_session', label: 'Extra Revision Session', price: 150, description: 'One additional session before exams' },
    ],
    defaultDuration: 60,
    tips: 'Mention qualifications, years of experience, and any student success stories.',
  },

  beauty: {
    label: 'Beauty',
    emoji: '💄',
    color: '#EC4899',
    subcategories: [
      'Hair Styling', 'Bridal Makeup', 'Facial & Skincare',
      'Mehendi/Henna', 'Manicure & Pedicure', 'Threading & Waxing',
      'Hair Color & Treatment', 'Party Makeup'
    ],
    smartFields: {
      serviceType: {
        label: 'Service Specialization',
        type: 'multi-select',
        options: ['Makeup', 'Hair', 'Skin Care', 'Nails', 'Mehendi', 'Waxing/Threading', 'Full Grooming Package'],
        required: true,
      },
      productsUsed: {
        label: 'Products / Brands Used',
        type: 'text',
        placeholder: 'e.g., MAC, Lakme, Organic products',
        required: false,
      },
      genderServed: {
        label: 'Serve',
        type: 'select',
        options: ['Women only', 'Men only', 'All genders'],
        required: true,
      },
    },
    addOns: [
      { id: 'premium_products', label: 'Premium Products Upgrade', price: 300, description: 'Use MAC/Bobbi Brown instead of standard' },
      { id: 'hair_accessory', label: 'Hair Accessories', price: 150, description: 'Decorative pins, flowers, etc.' },
      { id: 'draping', label: 'Saree/Dupatta Draping', price: 200, description: 'Professional draping service' },
      { id: 'touch_up_kit', label: 'Touch-up Kit', price: 100, description: 'Mini kit for event touch-ups' },
    ],
    defaultDuration: 90,
    tips: 'Include before/after photos. Mention brands you use and certifications.',
  },

  cleaning: {
    label: 'Cleaning',
    emoji: '🧹',
    color: '#10B981',
    subcategories: [
      'Regular House Cleaning', 'Deep Cleaning', 'Kitchen Cleaning',
      'Bathroom Cleaning', 'Post-Construction Cleanup', 'Office Cleaning',
      'Laundry & Ironing', 'Carpet & Sofa Cleaning'
    ],
    smartFields: {
      cleaningType: {
        label: 'Cleaning Type',
        type: 'multi-select',
        options: ['Sweeping & Mopping', 'Dusting', 'Kitchen Deep Clean', 'Bathroom Scrub', 'Window Cleaning', 'Laundry', 'Ironing', 'Organizing'],
        required: true,
      },
      propertySize: {
        label: 'Property Size Covered',
        type: 'select',
        options: ['1 BHK', '2 BHK', '3 BHK', '4+ BHK', 'Villa/Independent House', 'Office Space', 'Any size'],
        required: true,
      },
      suppliesIncluded: {
        label: 'Do you bring cleaning supplies?',
        type: 'select',
        options: ['Yes, all supplies included', 'Customer provides supplies', 'Basic included, specialty extra'],
        required: true,
      },
    },
    addOns: [
      { id: 'fridge_cleaning', label: 'Fridge Cleaning', price: 150, description: 'Inside-out fridge deep clean' },
      { id: 'balcony', label: 'Balcony Cleaning', price: 100, description: 'Include balcony/terrace' },
      { id: 'eco_products', label: 'Eco-Friendly Products', price: 100, description: 'Use all-natural cleaning products' },
      { id: 'organizing', label: 'Cupboard Organizing', price: 200, description: 'Organize and arrange cupboards' },
    ],
    defaultDuration: 120,
    tips: 'Specify what surfaces and rooms you cover. Mention if you bring your own equipment.',
  },

  childcare: {
    label: 'Childcare',
    emoji: '👶',
    color: '#8B5CF6',
    subcategories: [
      'Babysitting', 'After-School Care', 'Newborn Care',
      'Nanny Service', 'Homework Help', 'Activity & Play',
      'Special Needs Care', 'Night Care'
    ],
    smartFields: {
      ageGroup: {
        label: 'Age Group',
        type: 'multi-select',
        options: ['Infant (0-1 yr)', 'Toddler (1-3 yrs)', 'Preschool (3-5 yrs)', 'School-age (5-12 yrs)', 'Teenager (12+ yrs)'],
        required: true,
      },
      maxChildren: {
        label: 'Maximum Children at Once',
        type: 'number',
        min: 1, max: 10,
        placeholder: 'e.g., 2',
        required: true,
      },
      activities: {
        label: 'Activities Offered',
        type: 'multi-select',
        options: ['Storytelling', 'Art & Craft', 'Educational Games', 'Outdoor Play', 'Music', 'Homework Help', 'Meal Preparation', 'Bathing & Hygiene'],
        required: false,
      },
      certifications: {
        label: 'Certifications',
        type: 'tags',
        placeholder: 'e.g., First Aid, CPR, Montessori',
        required: false,
      },
    },
    addOns: [
      { id: 'meal_prep', label: 'Meal Preparation', price: 100, description: 'Prepare meals for the child' },
      { id: 'overnight', label: 'Overnight Care', price: 500, description: 'Stay overnight with the child' },
      { id: 'pickup_drop', label: 'School Pickup/Drop', price: 100, description: 'Pick up or drop child at school' },
      { id: 'activity_kit', label: 'Activity Kit', price: 150, description: 'Bring craft/activity materials' },
    ],
    defaultDuration: 180,
    tips: 'Parents trust experience and warmth. Mention your background and any childcare training.',
  },

  eldercare: {
    label: 'Elder Care',
    emoji: '🤝',
    color: '#6366F1',
    subcategories: [
      'Companionship', 'Medical Assistance', 'Mobility Help',
      'Meal & Nutrition', 'Exercise & Physiotherapy', 'Errands & Chores',
      'Night Attendant', 'Post-Surgery Care'
    ],
    smartFields: {
      careType: {
        label: 'Care Type',
        type: 'multi-select',
        options: ['Companionship', 'Meal Assistance', 'Medication Reminders', 'Mobility Support', 'Light Exercise', 'Bathing/Hygiene', 'Errands', 'Medical Monitoring'],
        required: true,
      },
      medicalTraining: {
        label: 'Medical Training',
        type: 'select',
        options: ['None - Companionship only', 'Basic First Aid', 'Nursing Assistant', 'Certified Nurse', 'Physiotherapy Trained'],
        required: true,
      },
      emergencyHandling: {
        label: 'Can you handle emergencies?',
        type: 'select',
        options: ['Basic first aid only', 'CPR trained', 'Full emergency response trained'],
        required: true,
      },
    },
    addOns: [
      { id: 'overnight', label: 'Overnight Stay', price: 800, description: 'Stay overnight with the elder' },
      { id: 'cooking', label: 'Meal Preparation', price: 150, description: 'Cook meals suited to dietary needs' },
      { id: 'hospital_visit', label: 'Hospital Accompaniment', price: 200, description: 'Accompany to hospital visits' },
      { id: 'report', label: 'Daily Health Report', price: 0, description: 'WhatsApp update to family members' },
    ],
    defaultDuration: 240,
    tips: 'Families need trust. Mention your experience, patience, and any medical training.',
  },

  handicrafts: {
    label: 'Handicrafts',
    emoji: '🎨',
    color: '#F97316',
    subcategories: [
      'Custom Jewelry', 'Home Decor', 'Gift Items',
      'Festival Decorations', 'Embroidery & Knitting', 'Pottery & Clay',
      'Candle & Soap Making', 'Wedding Favors'
    ],
    smartFields: {
      craftType: {
        label: 'Craft Specialization',
        type: 'multi-select',
        options: ['Jewelry', 'Embroidery', 'Knitting/Crochet', 'Pottery', 'Candles/Soaps', 'Painting', 'Woodwork', 'Paper Craft', 'Rangoli', 'Floral Arrangement'],
        required: true,
      },
      customization: {
        label: 'Customization Available',
        type: 'select',
        options: ['Fully customizable', 'Some customization', 'Fixed designs only'],
        required: true,
      },
      deliveryMode: {
        label: 'How do you deliver?',
        type: 'select',
        options: ['Home delivery', 'Customer picks up', 'Both options'],
        required: true,
      },
    },
    addOns: [
      { id: 'gift_wrap', label: 'Gift Wrapping', price: 50, description: 'Premium gift wrapping' },
      { id: 'rush_order', label: 'Rush Order (48 hrs)', price: 300, description: 'Priority completion' },
      { id: 'custom_design', label: 'Custom Design Consultation', price: 0, description: 'Free design discussion call' },
      { id: 'bulk_discount', label: 'Bulk Order (10+ items)', price: -100, description: 'Discount per item for bulk' },
    ],
    defaultDuration: 60,
    tips: 'Photos are everything here. Show your best work and mention if you teach workshops too.',
  },

  catering: {
    label: 'Catering',
    emoji: '🍽️',
    color: '#EF4444',
    subcategories: [
      'Birthday Parties', 'Wedding Catering', 'Office Events',
      'House Warming', 'Festival Special', 'Kitty Party',
      'Tiffin / Daily Meals', 'Outdoor / Picnic'
    ],
    smartFields: {
      eventTypes: {
        label: 'Event Types',
        type: 'multi-select',
        options: ['Birthday', 'Wedding', 'Corporate', 'House Warming', 'Festival', 'Kitty Party', 'Funeral/Prayer Meet', 'Any Event'],
        required: true,
      },
      cuisineOffered: {
        label: 'Cuisine Offered',
        type: 'multi-select',
        options: ['Vegetarian', 'Non-Vegetarian', 'Vegan', 'Jain', 'Multi-Cuisine', 'Regional Specialty'],
        required: true,
      },
      minGuests: {
        label: 'Minimum Guests',
        type: 'number',
        min: 5, max: 1000,
        placeholder: 'e.g., 10',
        required: true,
      },
      maxGuests: {
        label: 'Maximum Guests',
        type: 'number',
        min: 5, max: 1000,
        placeholder: 'e.g., 200',
        required: true,
      },
    },
    addOns: [
      { id: 'live_counter', label: 'Live Cooking Counter', price: 1000, description: 'Live chaat/dosa counter at event' },
      { id: 'dessert_table', label: 'Dessert Table', price: 500, description: 'Dedicated dessert spread' },
      { id: 'crockery', label: 'Crockery & Cutlery', price: 300, description: 'We provide all serving ware' },
      { id: 'cleanup_service', label: 'Post-Event Cleanup', price: 500, description: 'Full cleanup after the event' },
    ],
    defaultDuration: 300,
    tips: 'Mention per-plate pricing, sample menus, and past event photos.',
  },

  other: {
    label: 'Other',
    emoji: '⭐',
    color: '#6B7280',
    subcategories: [],
    smartFields: {},
    addOns: [],
    defaultDuration: 60,
    tips: 'Describe your service clearly since it doesn\'t fit standard categories.',
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);
