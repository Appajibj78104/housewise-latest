import { Users, Shield, Star, MapPin } from 'lucide-react';

export const landingServices = [
  { id: 'cleaning', name: 'Deep Cleaning', category: 'Cleaning', icon: '✨', price: 499, rating: 4.9, reviews: 128, bookings: 3200, badge: '🔥 Most Popular', tags: ['Eco-friendly', 'Same-day', 'Licensed'], desc: 'Professional sanitization & deep cleaning for every corner of your space.', includes: ['Kitchen deep clean', 'Bathroom scrub', 'Floor mopping', 'Window cleaning', 'Furniture dusting', 'Sanitization'], image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80', size: 'large', availableToday: true },
  { id: 'cooking', name: 'Home Cooking', category: 'Cooking', icon: '🍳', price: 299, rating: 4.8, reviews: 94, bookings: 2400, badge: '⭐ Top Rated', tags: ['Custom Menu', 'Diet-specific', 'Fresh'], desc: 'Authentic home-cooked meals by skilled housewives — fresh, healthy, daily.', includes: ['Breakfast prep', 'Lunch cooking', 'Dinner service', 'Tiffin packing', 'Special diets', 'Festival specials'], image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80', size: 'medium' },
  { id: 'tailoring', name: 'Tailoring & Stitching', category: 'Tailoring', icon: '✂️', price: 249, rating: 4.7, reviews: 68, bookings: 1500, tags: ['Custom Fit', 'Alterations', 'Blouse Work'], desc: 'Expert tailoring, stitching, and alteration services at your doorstep.', includes: ['Blouse stitching', 'Salwar/Churidar', 'Alterations', 'Embroidery', 'Curtain stitching', 'Dress design'], image: 'https://images.unsplash.com/photo-1612423284934-2850a4ea6b0f?w=800&q=80', size: 'medium' },
  { id: 'beauty', name: 'Beauty & Grooming', category: 'Beauty', icon: '💄', price: 399, rating: 4.8, reviews: 112, bookings: 2800, badge: '💎 Premium', tags: ['Bridal', 'Skincare', 'Hair'], desc: 'Professional beauty and grooming services — salon-quality care in the comfort of your home.', includes: ['Facial cleanup', 'Hair styling', 'Manicure/Pedicure', 'Waxing', 'Bridal makeup', 'Mehendi'], image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80', size: 'tall' },
  { id: 'childcare', name: 'Childcare & Babysitting', category: 'Childcare', icon: '👶', price: 349, rating: 4.9, reviews: 86, bookings: 1800, tags: ['Trained', 'Safe', 'Flexible'], desc: 'Trusted and trained caregivers for your little ones — safe, engaging, and nurturing.', includes: ['Infant care', 'Toddler activities', 'Homework help', 'Meal preparation', 'Bedtime routine', 'Safety monitoring'], image: 'https://images.unsplash.com/photo-1596464716127-f2a82984de30?w=800&q=80', size: 'medium' },
  { id: 'eldercare', name: 'Elderly Care', category: 'Care', icon: '🛡️', price: 599, rating: 5.0, reviews: 76, bookings: 1200, tags: ['Trained', 'Health Monitor', 'Flexible'], desc: 'Compassionate companionship and attentive care for senior family members.', includes: ['Daily assistance', 'Health monitoring', 'Medication reminders', 'Companionship', 'Light exercises', 'Doctor visits'], size: 'gradient', trustItems: ['Trained caregivers', 'Health monitoring', 'Flexible scheduling'] },
  { id: 'tuition', name: 'Home Tutoring', category: 'Education', icon: '📚', price: 399, rating: 4.7, reviews: 92, bookings: 2100, tags: ['All Subjects', 'Exam Prep', 'Progress Reports'], desc: 'Patient and effective home tutoring for children of all ages and boards.', includes: ['CBSE/ICSE/State', 'Math & Science', 'Languages', 'Competitive exams', 'Homework help', 'Report cards'], image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80', size: 'small' },
  { id: 'handicrafts', name: 'Handicrafts & Art', category: 'Handicrafts', icon: '🎨', price: 299, rating: 4.6, reviews: 45, bookings: 800, tags: ['Custom', 'Gifts', 'Decor'], desc: 'Handmade crafts, art pieces, and creative décor — unique creations for your home.', includes: ['Wall art', 'Gift items', 'Home décor', 'Rangoli design', 'Pottery', 'Fabric art'], image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80', size: 'small' },
  { id: 'catering', name: 'Event Catering', category: 'Catering', icon: '🍽️', price: 799, rating: 4.8, reviews: 58, bookings: 950, badge: '🎉 Events', tags: ['Parties', 'Puja', 'Functions'], desc: 'Full-service catering for events, pujas, parties, and family gatherings.', includes: ['Menu planning', 'Bulk cooking', 'Serving staff', 'Cleanup', 'Setup', 'Customization'], image: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800&q=80', size: 'medium' },
  { id: 'laundry', name: 'Laundry & Ironing', category: 'Cleaning', icon: '👔', price: 199, rating: 4.7, reviews: 84, bookings: 1800, tags: ['Pickup & Delivery', 'Fabric-safe', '24hr'], desc: 'Premium fabric care with professional laundering and crisp ironing.', includes: ['Wash & fold', 'Ironing', 'Dry cleaning', 'Stain removal', 'Fabric care', 'Express service'], image: 'https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&q=80', size: 'wide', hasProcess: true },
];

export const statsData = [
  { value: 15000, start: 12000, suffix: '+', label: 'Happy Customers', icon: Users, iconGrad: 'from-pink-500/20 to-rose-500/20 border-pink-500/30', iconColor: 'text-pink-400', growth: '↑ +2,300 this month', growthColor: 'text-emerald-400' },
  { value: 2500, start: 2200, suffix: '+', label: 'Verified Providers', icon: Shield, iconGrad: 'from-purple-500/20 to-blue-500/20 border-purple-500/30', iconColor: 'text-purple-400', growth: '↑ +180 new providers', growthColor: 'text-emerald-400' },
  { value: 98, start: 94, suffix: '%', label: 'Satisfaction Rate', icon: Star, iconGrad: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30', iconColor: 'text-yellow-400', growth: 'Based on 15K+ reviews', growthColor: 'text-gray-500' },
  { value: 50, start: 40, suffix: '+', label: 'Cities Covered', icon: MapPin, iconGrad: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30', iconColor: 'text-teal-400', growth: '↑ 8 new cities in 2026', growthColor: 'text-emerald-400' },
];

export const testimonials = [
  { name: 'Anita Desai', role: 'Senior Citizen, Mumbai', rating: 5, text: "The elderly care service has been a blessing. The caregiver is like family now — compassionate, punctual, and so attentive to every need.", avatar: 'AD', service: 'Elderly Care', grad: 'from-emerald-500 to-teal-500' },
  { name: 'Priya Sharma', role: 'Working Mother, Delhi', rating: 5, text: "HouseWise completely transformed how I manage my home. The cooking service delivers authentic, healthy meals every single day! The provider is always on time and the food quality is outstanding.", avatar: 'PS', service: 'Home Cooking', grad: 'from-orange-500 to-amber-500' },
  { name: 'Rajesh Kumar', role: 'IT Professional, Bangalore', rating: 5, text: "I've never had my apartment look this good. The deep cleaning team is thorough, professional, and incredibly efficient.", avatar: 'RK', service: 'Deep Cleaning', grad: 'from-blue-500 to-cyan-500' },
  { name: 'Meena Iyer', role: 'Homemaker, Chennai', rating: 5, text: "The tutoring service for my kids is outstanding. Their grades have improved so much and they actually enjoy learning now. The tutor is patient, knowledgeable, and makes every session engaging.", avatar: 'MI', service: 'Home Tutoring', grad: 'from-purple-500 to-violet-500' },
  { name: 'Amit Patel', role: 'Business Owner, Ahmedabad', rating: 5, text: "From laundry to gardening, every service on HouseWise delivers real quality. It's become indispensable for our family.", avatar: 'AP', service: 'Laundry & Ironing', grad: 'from-pink-500 to-rose-500' },
  { name: 'Sunita Reddy', role: 'New Mother, Hyderabad', rating: 5, text: "Finding a reliable babysitter used to be my biggest challenge. HouseWise matched me with an incredible caregiver who treats my daughter like her own. The background verification gives me complete peace of mind.", avatar: 'SR', service: 'Childcare', grad: 'from-rose-500 to-pink-500' },
];

export const faqs = [
  { q: 'How are service providers verified?', a: 'Every provider undergoes a 3-step process: government ID verification, skill assessment test, and background check via third-party agency. Only 1 in 5 applicants are approved.' },
  { q: 'Can I reschedule or cancel a booking?', a: 'Yes, free rescheduling up to 2 hours before the scheduled time. Cancellations within 2 hours incur a 10% fee. You can manage everything from your dashboard.' },
  { q: "What if I'm not satisfied with the service?", a: "We offer a 100% satisfaction guarantee. Report within 24 hours and we'll re-do the service free or issue a full refund — no questions asked." },
  { q: 'Which cities are currently supported?', a: "We currently serve 50+ cities including Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune, Kolkata, and more. New cities added monthly — check the app for availability." },
  { q: 'How do I become a HouseWise provider?', a: "Click 'Apply Now' in the About section. Our team reviews your application within 48 hours and onboards you with free training, insurance coverage, and your first booking." },
];

export const footerLinks = [
  { title: 'Platform', links: ['Services', 'How It Works', 'Pricing', 'Careers'] },
  { title: 'Resources', links: ['Help Center', 'Blog', 'Community', 'API'] },
  { title: 'Company', links: ['About Us', 'Press', 'Partners', 'Contact'] },
  { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Licenses'] },
];

export const marqueeItems = [
  '98% Satisfaction Rate', '24/7 Customer Support', 'Same-Day Service Available',
  '100% Satisfaction Guarantee', 'Trusted by 15,000+ Families', '⭐ 4.9 Average Rating',
  '50+ Cities in India', '2,500+ Verified Providers',
];

export const serviceCategories = ['All', 'Cleaning', 'Cooking', 'Care', 'Education', 'Beauty', 'Tailoring', 'Childcare', 'Handicrafts', 'Catering'];

export const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad'];
