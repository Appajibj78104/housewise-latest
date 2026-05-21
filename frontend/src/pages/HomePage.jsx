import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  motion, useScroll, useTransform, useSpring, useInView,
  useMotionValue, useMotionValueEvent, AnimatePresence,
} from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, ArrowUp, Star, Shield, Clock, Heart,
  Sparkles, ChevronRight, ChevronDown, Users, MapPin, Search,
  Send, CheckCircle, Zap, Award, TrendingUp,
  MessageCircle, X, Play, ChevronUp,
  Mail, Phone, ExternalLink, CheckCircle2,
} from 'lucide-react';
import CountUp from 'react-countup';
import { useInView as useInViewIO } from 'react-intersection-observer';
import Tilt from 'react-parallax-tilt';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/* ════════════════════════════════════════════════
   DATA
   ════════════════════════════════════════════════ */

const landingServices = [
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

/* steps data removed — now inline in HowItWorks */

const statsData = [
  { value: 15000, start: 12000, suffix: '+', label: 'Happy Customers', icon: Users, iconGrad: 'from-pink-500/20 to-rose-500/20 border-pink-500/30', iconColor: 'text-pink-400', growth: '↑ +2,300 this month', growthColor: 'text-emerald-400' },
  { value: 2500, start: 2200, suffix: '+', label: 'Verified Providers', icon: Shield, iconGrad: 'from-purple-500/20 to-blue-500/20 border-purple-500/30', iconColor: 'text-purple-400', growth: '↑ +180 new providers', growthColor: 'text-emerald-400' },
  { value: 98, start: 94, suffix: '%', label: 'Satisfaction Rate', icon: Star, iconGrad: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30', iconColor: 'text-yellow-400', growth: 'Based on 15K+ reviews', growthColor: 'text-gray-500' },
  { value: 50, start: 40, suffix: '+', label: 'Cities Covered', icon: MapPin, iconGrad: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30', iconColor: 'text-teal-400', growth: '↑ 8 new cities in 2026', growthColor: 'text-emerald-400' },
];

const testimonials = [
  { name: 'Anita Desai', role: 'Senior Citizen, Mumbai', rating: 5, text: "The elderly care service has been a blessing. The caregiver is like family now — compassionate, punctual, and so attentive to every need.", avatar: 'AD', service: 'Elderly Care', grad: 'from-emerald-500 to-teal-500' },
  { name: 'Priya Sharma', role: 'Working Mother, Delhi', rating: 5, text: "HouseWise completely transformed how I manage my home. The cooking service delivers authentic, healthy meals every single day! The provider is always on time and the food quality is outstanding.", avatar: 'PS', service: 'Home Cooking', grad: 'from-orange-500 to-amber-500' },
  { name: 'Rajesh Kumar', role: 'IT Professional, Bangalore', rating: 5, text: "I've never had my apartment look this good. The deep cleaning team is thorough, professional, and incredibly efficient.", avatar: 'RK', service: 'Deep Cleaning', grad: 'from-blue-500 to-cyan-500' },
  { name: 'Meena Iyer', role: 'Homemaker, Chennai', rating: 5, text: "The tutoring service for my kids is outstanding. Their grades have improved so much and they actually enjoy learning now. The tutor is patient, knowledgeable, and makes every session engaging.", avatar: 'MI', service: 'Home Tutoring', grad: 'from-purple-500 to-violet-500' },
  { name: 'Amit Patel', role: 'Business Owner, Ahmedabad', rating: 5, text: "From laundry to gardening, every service on HouseWise delivers real quality. It's become indispensable for our family.", avatar: 'AP', service: 'Laundry & Ironing', grad: 'from-pink-500 to-rose-500' },
  { name: 'Sunita Reddy', role: 'New Mother, Hyderabad', rating: 5, text: "Finding a reliable babysitter used to be my biggest challenge. HouseWise matched me with an incredible caregiver who treats my daughter like her own. The background verification gives me complete peace of mind.", avatar: 'SR', service: 'Childcare', grad: 'from-rose-500 to-pink-500' },
];

const faqs = [
  { q: 'How are service providers verified?', a: 'Every provider undergoes a 3-step process: government ID verification, skill assessment test, and background check via third-party agency. Only 1 in 5 applicants are approved.' },
  { q: 'Can I reschedule or cancel a booking?', a: 'Yes, free rescheduling up to 2 hours before the scheduled time. Cancellations within 2 hours incur a 10% fee. You can manage everything from your dashboard.' },
  { q: "What if I'm not satisfied with the service?", a: "We offer a 100% satisfaction guarantee. Report within 24 hours and we'll re-do the service free or issue a full refund — no questions asked." },
  { q: 'Which cities are currently supported?', a: "We currently serve 50+ cities including Mumbai, Delhi, Bangalore, Chennai, Hyderabad, Pune, Kolkata, and more. New cities added monthly — check the app for availability." },
  { q: 'How do I become a HouseWise provider?', a: "Click 'Apply Now' in the About section. Our team reviews your application within 48 hours and onboards you with free training, insurance coverage, and your first booking." },
];

const footerLinks = [
  { title: 'Platform', links: ['Services', 'How It Works', 'Pricing', 'Careers'] },
  { title: 'Resources', links: ['Help Center', 'Blog', 'Community', 'API'] },
  { title: 'Company', links: ['About Us', 'Press', 'Partners', 'Contact'] },
  { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Licenses'] },
];

const marqueeItems = [
  '98% Satisfaction Rate', '24/7 Customer Support', 'Same-Day Service Available',
  '100% Satisfaction Guarantee', 'Trusted by 15,000+ Families', '⭐ 4.9 Average Rating',
  '50+ Cities in India', '2,500+ Verified Providers',
];

/* ════════════════════════════════════════════════
   SHARED COMPONENTS
   ════════════════════════════════════════════════ */

const Section = memo(({ children, className = '', id }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref} id={id}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={`relative ${className}`}
    >{children}</motion.section>
  );
});
Section.displayName = 'Section';

const SectionLabel = ({ children }) => (
  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500 mb-6">
    <span className="w-1.5 h-1.5 rounded-full bg-brand-orange pulse-dot" />
    {children}
  </div>
);

const SectionHeading = ({ children, sub }) => (
  <div className="max-w-2xl">
    <h2 className="text-[clamp(36px,5vw,64px)] font-display font-bold text-white leading-[1.1] tracking-tight mb-4">{children}</h2>
    {sub && <p className="text-base sm:text-lg text-gray-400 leading-relaxed max-w-xl">{sub}</p>}
  </div>
);

const Divider = () => <div className="section-glow-divider w-full" />;

/* ════════════════════════════════════════════════
   CUSTOM CURSOR
   ════════════════════════════════════════════════ */

const CustomCursor = memo(() => {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;
    let mx = 0, my = 0, rx = 0, ry = 0;
    const move = (e) => { mx = e.clientX; my = e.clientY; };
    const over = (e) => {
      const interactive = e.target.closest('a, button, [role="button"], input, textarea');
      dot.classList.toggle('hovering', !!interactive);
      ring.classList.toggle('hovering', !!interactive);
    };
    let raf;
    const loop = () => {
      rx += (mx - rx) * 0.15;
      ry += (my - ry) * 0.15;
      dot.style.transform = `translate(${mx - 6}px, ${my - 6}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseover', over);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('mousemove', move); window.removeEventListener('mouseover', over); };
  }, []);
  return <><div ref={dotRef} className="custom-cursor" /><div ref={ringRef} className="custom-cursor-ring" /></>;
});
CustomCursor.displayName = 'CustomCursor';

/* ════════════════════════════════════════════════
   PAGE ENTRANCE
   ════════════════════════════════════════════════ */

const PageEntrance = ({ onComplete }) => {
  useEffect(() => { const t = setTimeout(onComplete, 1400); return () => clearTimeout(t); }, [onComplete]);
  return (
    <motion.div className="page-entrance-overlay" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 0.4, delay: 1.1 }}>
      <div className="logo-anim flex items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-pink to-brand-purple flex items-center justify-center shadow-xl shadow-brand-pink/30">
          <span className="text-white font-extrabold text-2xl">H</span>
        </div>
        <span className="text-white font-display font-bold text-3xl tracking-tight">HouseWise</span>
      </div>
    </motion.div>
  );
};

/* ════════════════════════════════════════════════
   FANNED CARD STACK — Playing-cards inspired layout
   ════════════════════════════════════════════════ */

const fannedCards = [
  {
    id: 0, icon: Sparkles, title: 'Deep Cleaning', price: '₹499',
    desc: 'Professional sanitization & deep cleaning for every corner of your space.',
    rating: '4.9', reviews: '128', gradient: 'from-brand-pink to-brand-purple',
    provider: { initials: 'PS', name: 'Priya S.', gradient: 'from-brand-purple/60 to-brand-pink/60' },
    location: 'Chennai', time: 'Today, 3:00 PM',
    badge: { text: 'Confirmed', color: 'emerald', icon: CheckCircle },
    meta: 'Booking #HW-1847',
    tags: ['Eco-friendly', 'Same-day', 'Licensed'],
    progress: { label: 'Service in progress', value: 65 },
    satisfaction: '100% Satisfaction Guarantee',
  },
  {
    id: 1, icon: Heart, title: 'Home Cooking', price: '₹299',
    desc: 'Authentic home-cooked meals by skilled housewives — fresh, healthy, daily.',
    rating: '4.8', reviews: '94', gradient: 'from-brand-purple to-brand-blue',
    provider: { initials: 'MR', name: 'Meena R.', gradient: 'from-brand-blue/60 to-brand-purple/60' },
    location: '2.3 km away', time: '30 min arrival',
    badge: { text: 'Available Now', color: 'emerald', live: true },
    meta: 'Verified ✓',
    tags: ['Custom Menu', 'Diet-specific', 'Fresh'],
    liveDot: true,
    customers: '2,400+ orders this month',
  },
  {
    id: 2, icon: Shield, title: 'Elderly Care', price: '₹599',
    desc: 'Compassionate companionship and attentive care for senior family members.',
    rating: '5.0', reviews: '76', gradient: 'from-brand-blue to-brand-pink',
    provider: { initials: 'AD', name: 'Anita D.', gradient: 'from-brand-blue to-brand-pink', role: 'Caregiver' },
    location: 'Mumbai', time: 'Tomorrow, 10 AM',
    badge: { text: 'Scheduled', color: 'blue', icon: Clock },
    meta: 'Booking #HW-2103',
    tags: ['Trained', 'Health Monitor', 'Flexible Hrs'],
    review: '"Exceptional care — like having family!"',
    reviewBy: 'Anita D., Senior Citizen',
  },
];

/* Per-card fan geometry: rotation, translateX, scale, z-index, opacity, transform-origin */
const fanPositions = [
  { rotate: -12, tx: -140, scale: 0.94, z: 10, opacity: 0.82, origin: 'right bottom' },
  { rotate: 0,   tx: 0,    scale: 1.05, z: 30, opacity: 1,    origin: 'center bottom' },
  { rotate: 12,  tx: 140,  scale: 0.94, z: 10, opacity: 0.82, origin: 'left bottom' },
];
const fanHover = { rotate: 0, scale: 1.07, z: 40, opacity: 1 };

const FannedCard = memo(({ card, pos, index, isDark }) => {
  const [hovered, setHovered] = useState(false);
  const active = hovered ? fanHover : pos;
  const Icon = card.icon;
  const BadgeIcon = card.badge?.icon;

  const isFront = index === 1;
  const accentGradients = [
    'linear-gradient(to right, #ff3cac, #784ba0, #7c3aed)',
    'linear-gradient(to right, #fb923c, #ec4899, #f43f5e)',
    'linear-gradient(to right, #2dd4bf, #22d3ee, #60a5fa)',
  ];
  const iconStyles = [
    { background: 'rgba(255, 60, 172, 0.15)', border: '1px solid rgba(255, 60, 172, 0.20)', borderRadius: '12px' },
    { background: 'rgba(251, 146, 60, 0.15)', border: '1px solid rgba(251, 146, 60, 0.20)', borderRadius: '12px' },
    { background: 'linear-gradient(135deg, rgba(45,212,191,0.25), rgba(96,165,250,0.25))', border: '1px solid rgba(45, 212, 191, 0.25)', borderRadius: '12px' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, rotate: pos.rotate }}
      animate={{
        opacity: active.opacity,
        rotate: active.rotate,
        scale: active.scale,
        x: active === fanHover ? (index === 0 ? -160 : index === 2 ? 160 : 0) : pos.tx,
      }}
      transition={{ type: 'spring', stiffness: 120, damping: 18, delay: index * 0.15 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="absolute cursor-default"
      style={{
        zIndex: active.z,
        left: '50%',
        top: '50%',
        marginLeft: '-170px',
        marginTop: '-260px',
        transformOrigin: hovered ? 'center bottom' : pos.origin,
      }}
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3 + index * 0.7, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
      >
        <div
          className="w-[340px] p-5 pb-4 cursor-default select-none transition-shadow duration-300"
          style={{
            borderRadius: '20px',
            background: isDark
              ? (isFront ? 'rgba(15, 15, 24, 0.65)' : 'rgba(12, 12, 20, 0.45)')
              : (isFront ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.65)'),
            backdropFilter: isFront ? 'blur(20px) saturate(180%)' : 'blur(14px) saturate(160%)',
            WebkitBackdropFilter: isFront ? 'blur(20px) saturate(180%)' : 'blur(14px) saturate(160%)',
            border: isDark
              ? (isFront ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)')
              : (isFront ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(0, 0, 0, 0.05)'),
            boxShadow: isDark
              ? (hovered
                ? '0 12px 60px rgba(255,60,172,0.15), 0 4px 20px rgba(0,0,0,0.3)'
                : isFront
                  ? '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.4), 0 0 60px rgba(255,60,172,0.10), inset 0 1px 0 rgba(255,255,255,0.09)'
                  : '0 4px 16px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)')
              : (hovered
                ? '0 12px 40px rgba(236,72,153,0.1), 0 4px 16px rgba(0,0,0,0.06)'
                : isFront
                  ? '0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)'
                  : '0 4px 16px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.03)'),
          }}
        >
          {/* Top accent bar */}
          <div style={{ height: '3px', background: accentGradients[index], width: 'calc(100% + 40px)', borderRadius: '20px 20px 0 0', margin: '-20px -20px 16px -20px' }} />

          {/* Title + Price */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 flex items-center justify-center shadow-lg" style={iconStyles[index]}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-[15px] leading-tight">{card.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-brand-orange text-[11px]">★</span>
                  <span className="text-[12px] text-gray-300">{card.rating}</span>
                  <span className="text-[10px] text-gray-500">({card.reviews} reviews)</span>
                </div>
              </div>
            </div>
            <span className="text-brand-pink font-bold text-[18px] tracking-tight">{card.price}</span>
          </div>

          {/* Description */}
          <p className="text-[11px] text-gray-400 leading-relaxed mb-3">{card.desc}</p>

          {/* Tags */}
          {card.tags && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {card.tags.map((tag, ti) => (
                <span key={ti} className="fanned-card-tag" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', color: isDark ? 'rgba(200,200,220,0.85)' : '#4b5563', fontSize: '11px', padding: '3px 10px' }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: isDark ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent)' : 'linear-gradient(to right, transparent, rgba(0,0,0,0.06), transparent)', width: '100%', margin: '8px 0' }} />

          {/* Provider */}
          <div className="flex items-center gap-2.5 mb-2.5" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '8px 10px' }}>
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${card.provider.gradient} flex items-center justify-center text-white text-[10px] font-bold shrink-0 ring-1 ring-white/10`}>
              {card.provider.initials}
            </div>
            <span className="text-[12px] text-gray-200 font-medium">{card.provider.name}</span>
            <span className="text-[10px] text-gray-600">•</span>
            <span className="text-[10px] text-gray-500">{card.provider.role || 'Provider'}</span>
          </div>

          {/* Location & Time */}
          <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
            <span className="flex items-center gap-1">
              {card.liveDot && (
                <span className="relative flex h-2 w-2 mr-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              )}
              <MapPin size={10} className="text-gray-500" /> {card.location}
            </span>
            <span className="flex items-center gap-1"><Clock size={10} className="text-gray-500" /> {card.time}</span>
          </div>

          {/* Review quote */}
          {card.review && (
            <div className="mb-3">
              <p className="text-[11px] text-gray-400 italic leading-relaxed border-l-2 border-brand-pink/30 pl-3">{card.review}</p>
              {card.reviewBy && <p className="text-[9px] text-gray-600 mt-1 pl-3">— {card.reviewBy}</p>}
            </div>
          )}

          {/* Status Row */}
          <div className="flex items-center justify-between mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold ${
              card.badge.color === 'emerald' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-brand-blue/10 text-brand-blue'
            }`}>
              {card.badge.live ? (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
              ) : BadgeIcon ? (
                <BadgeIcon size={10} />
              ) : null}
              {card.badge.text}
            </span>
            <span className="text-[10px] text-gray-600">{card.meta}</span>
          </div>

          {/* Progress bar */}
          {card.progress && (
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-gray-500">{card.progress.label}</span>
                <span className="text-[10px] text-gray-500">{card.progress.value}%</span>
              </div>
              <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-pink to-brand-purple transition-all" style={{ width: `${card.progress.value}%` }} />
              </div>
            </div>
          )}

          {/* Bottom extra info */}
          {card.satisfaction && (
            <div className="flex items-center gap-1.5 pt-2" style={{ borderTop: '1px solid transparent', borderImage: isDark ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent) 1' : 'linear-gradient(to right, transparent, rgba(0,0,0,0.06), transparent) 1' }}>
              <Shield size={10} className="text-emerald-400" />
              <span className="text-[9px] text-gray-500 font-medium">{card.satisfaction}</span>
            </div>
          )}
          {card.customers && (
            <div className="flex items-center gap-1.5 pt-2" style={{ borderTop: '1px solid transparent', borderImage: isDark ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent) 1' : 'linear-gradient(to right, transparent, rgba(0,0,0,0.06), transparent) 1' }}>
              <TrendingUp size={10} className="text-brand-orange" />
              <span className="text-[9px] text-gray-500 font-medium">{card.customers}</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
});
FannedCard.displayName = 'FannedCard';

const FannedCardStack = () => {
  const { isDark } = useTheme();
  return (
  <>
    {/* Desktop */}
    <div className="hidden lg:flex items-center justify-center relative h-[580px] -ml-40">
      {/* Glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-brand-pink/15 blur-[120px] pointer-events-none" />
      {fannedCards.map((card, i) => (
        <FannedCard key={card.id} card={card} pos={fanPositions[i]} index={i} isDark={isDark} />
      ))}
    </div>
    {/* Mobile — single center card */}
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.6 }}
      className="lg:hidden mt-8"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="mx-auto max-w-[340px] rounded-[22px] p-5 bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
          <div className="h-[3px] w-full bg-gradient-to-r from-brand-purple to-brand-blue rounded-t-[22px] -mt-5 -mx-5 mb-4" style={{ width: 'calc(100% + 40px)' }} />
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center shadow-lg">
                <Heart size={18} className="text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-[15px]">Home Cooking</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-brand-orange text-[11px]">★</span>
                  <span className="text-[12px] text-gray-300">4.8</span>
                  <span className="text-[10px] text-gray-500">(94 reviews)</span>
                </div>
              </div>
            </div>
            <span className="text-brand-pink font-bold text-[18px]">₹299</span>
          </div>
          <div className="h-px w-full bg-white/[0.06] mb-3" />
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue/60 to-brand-purple/60 flex items-center justify-center text-white text-[10px] font-bold shrink-0 ring-1 ring-white/10">MR</div>
            <span className="text-[12px] text-gray-200 font-medium">Meena R.</span>
            <span className="text-[10px] text-gray-600">•</span>
            <span className="text-[10px] text-gray-500">Provider</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span>
              <MapPin size={10} className="text-gray-500" /> 2.3 km away
            </span>
            <span className="flex items-center gap-1"><Clock size={10} className="text-gray-500" /> 30 min arrival</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-[10px] font-semibold">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span>
              Available Now
            </span>
            <span className="text-[10px] text-gray-600">Verified ✓</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  </>
  );
};

/* ════════════════════════════════════════════════
   1. HERO SECTION — Cinematic Full-Screen
   ════════════════════════════════════════════════ */

const HeroSection = () => {
  const navigate = useNavigate();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const yText = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacityText = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const { scrollYProgress: pageProgress } = useScroll();
  const progressHeight = useTransform(pageProgress, [0, 1], ['0%', '100%']);
  const prefersReduced = useMemo(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  , []);

  return (
    <section ref={ref} className="relative min-h-screen flex items-start overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0 bg-brand-dark" />
      <div className="absolute inset-0 grid-overlay opacity-30" />
      {/* Animated mesh gradient orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 rounded-full bg-purple-600/20 blur-3xl mesh-orb-1" />
      <div className="absolute bottom-[-15%] left-[5%] w-64 h-64 rounded-full bg-pink-500/15 blur-3xl mesh-orb-2" />
      <div className="absolute top-[30%] right-[15%] w-80 h-80 rounded-full bg-blue-500/10 blur-3xl mesh-orb-3" />
      {/* Noise grain texture */}
      <div className="absolute inset-0 hero-noise z-[1]" />

      <motion.div style={{ y: yText, opacity: opacityText }} className="relative z-10 w-full max-w-[1200px] mx-auto px-5 sm:px-6 pt-[72px] pb-12">
        <div className="grid lg:grid-cols-[55%_45%] gap-12 items-center">
          {/* Left — content */}
          <div className="self-start pt-2 relative">
            {/* Dot grid pattern overlay */}
            <div className="absolute inset-0 dot-grid-pattern pointer-events-none opacity-40" style={{ zIndex: -1 }} />
            {/* Trust badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full glass-card mb-2"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-[12px] text-gray-400 font-medium">Trusted by 15,000+ families across India</span>
            </motion.div>

            {/* Headline */}
            <div className="mb-2">
              {['Home', 'Services'].map((word, i) => (
                <div key={i} className="overflow-hidden">
                  <motion.h1
                    initial={{ y: '100%' }} animate={{ y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                    className="font-display font-extrabold text-white leading-[0.95] tracking-tight hero-headline"
                  >{word}</motion.h1>
                </div>
              ))}
              <div className="overflow-hidden">
                <motion.h1
                  initial={{ y: '100%' }} animate={{ y: 0 }}
                  transition={{ duration: 0.8, delay: 0.44, ease: [0.22, 1, 0.36, 1] }}
                  className="font-display font-extrabold leading-[0.95] tracking-tight hero-headline"
                >
                  <span className="gradient-shift-text">Redefined</span>
                  <span className="text-brand-orange">.</span>
                  <span className="blink-cursor text-brand-pink font-thin ml-0.5">|</span>
                </motion.h1>
              </div>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="text-base sm:text-lg text-gray-400 max-w-lg mb-4 leading-relaxed"
            >
              Connect with verified, skilled housewives for cleaning, cooking, eldercare, tutoring, and more — all at your fingertips.
            </motion.p>

            {/* CTA buttons */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-start gap-4"
            >
              <button onClick={() => navigate('/register')}
                className="group relative px-8 py-4 rounded-full bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue text-white text-[15px] font-semibold shadow-lg shadow-brand-pink/20 hover:shadow-brand-pink/40 transition-all btn-shimmer cta-glow"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Get Started Free
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <button
                onClick={() => { const el = document.getElementById('how-it-works'); if (el) window.__lenis ? window.__lenis.scrollTo(el, { offset: -80 }) : el.scrollIntoView({ behavior: 'smooth' }); }}
                className="flex items-center gap-3 px-6 py-4 rounded-full text-[15px] font-medium text-gray-400 hover:text-white border border-white/[0.08] hover:border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.04] transition-all"
              >
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}
                  className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                  <Play size={12} className="text-white ml-0.5" />
                </motion.div>
                See How It Works
              </button>
            </motion.div>

            {/* Mobile-only stats strip */}
            <div className="flex items-center gap-3 mt-4 md:hidden">
              <span className="text-xs font-medium text-gray-400">15K+ Families</span>
              <span className="text-gray-600">·</span>
              <span className="text-xs font-medium text-gray-400">98% Rating</span>
              <span className="text-gray-600">·</span>
              <span className="text-xs font-medium text-gray-400">50+ Cities</span>
            </div>

            {/* Keyboard shortcut hint */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
              className="hidden sm:block text-xs text-gray-600 mt-4"
            >
              Press ⌨ G to get started · ⌨ W to watch demo
            </motion.p>
          </div>

          {/* Right — Fanned Card Stack */}
          <FannedCardStack />
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 text-gray-600"
          >
            <span className="text-[10px] uppercase tracking-widest">Scroll</span>
            <ChevronDown size={16} />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Vertical scroll progress indicator */}
      <div className="scroll-progress-vertical hidden lg:block">
        <motion.div className="scroll-progress-vertical-fill" style={{ height: progressHeight }} />
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brand-dark to-transparent z-[2]" />
    </section>
  );
};

/* ════════════════════════════════════════════════
   2. MARQUEE TRUST BAR
   ════════════════════════════════════════════════ */

const MarqueeRow = ({ items, reverse }) => (
  <div className="overflow-hidden">
    <div className={reverse ? 'marquee-track-reverse' : 'marquee-track'}>
      {items.map((item, i) => (
        <span key={`a${i}`} className="inline-flex items-center gap-4 px-6 text-[13px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap shrink-0">
          {item}
          <span className="text-brand-pink text-[8px]">◆</span>
        </span>
      ))}
      {items.map((item, i) => (
        <span key={`b${i}`} className="inline-flex items-center gap-4 px-6 text-[13px] font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap shrink-0">
          {item}
          <span className="text-brand-pink text-[8px]">◆</span>
        </span>
      ))}
    </div>
  </div>
);

const MarqueeBar = () => (
  <div className="py-6 overflow-hidden marquee-mask border-y border-white/[0.03]">
    <MarqueeRow items={marqueeItems} reverse={false} />
    <div className="mt-3">
      <MarqueeRow items={marqueeItems} reverse={true} />
    </div>
  </div>
);

/* ════════════════════════════════════════════════
   3. HOW IT WORKS — Premium Timeline Redesign
   ════════════════════════════════════════════════ */

/* ── Animated check mark ── */
const AnimCheck = ({ delay = 0 }) => (
  <motion.span
    initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }} transition={{ delay, type: 'spring', stiffness: 300 }}
    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-pink/15 shrink-0"
  >
    <CheckCircle size={12} className="text-brand-pink" />
  </motion.span>
);

/* ── Mockup: Browse Services search UI ── */
const BrowseMockup = () => {
  const results = [
    { emoji: '🧹', label: 'Deep Cleaning', price: '₹499' },
    { emoji: '🍳', label: 'Home Cooking', price: '₹299' },
    { emoji: '👴', label: 'Elderly Care', price: '₹599' },
  ];
  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] mb-4">
        <Search size={14} className="text-gray-500 shrink-0" />
        <motion.span
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
          viewport={{ once: true }} transition={{ delay: 0.3 }}
          className="text-[13px] text-gray-500"
        >Deep Cleaning in Chennai...</motion.span>
      </div>
      {/* Results */}
      <div className="space-y-2">
        {results.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.5 + i * 0.15 }}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-brand-pink/20 transition-colors"
          >
            <span className="flex items-center gap-2.5 text-[13px] text-gray-300">
              <span className="text-base">{r.emoji}</span>{r.label}
            </span>
            <span className="text-[12px] font-semibold text-brand-pink">{r.price}</span>
          </motion.div>
        ))}
      </div>
      {/* Footer stat */}
      <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-2 text-[11px] text-gray-500">
        <Zap size={10} className="text-brand-orange" /> Showing 127 providers near you
      </div>
    </div>
  );
};

/* ── Mockup: Calendar booking UI ── */
const BookingMockup = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = 3; // Thursday
  const slots = [
    { time: '10:00 AM', available: true },
    { time: '2:00 PM', available: true, selected: true },
    { time: '4:00 PM', available: false },
  ];
  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
      {/* Week strip */}
      <div className="flex gap-1.5 mb-4">
        {days.map((d, i) => (
          <motion.div
            key={d}
            initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.05 }}
            className={`flex-1 text-center py-2 rounded-lg text-[11px] font-medium transition-all ${
              i === today
                ? 'bg-gradient-to-br from-brand-pink to-brand-purple text-white shadow-lg shadow-brand-pink/20'
                : 'bg-white/[0.03] text-gray-500 border border-white/[0.05]'
            }`}
          >
            {d}
            <div className="text-[9px] mt-0.5 opacity-70">{18 + i}</div>
          </motion.div>
        ))}
      </div>
      {/* Time slots */}
      <div className="space-y-2 mb-4">
        {slots.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.5 + i * 0.12 }}
            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
              s.selected
                ? 'bg-brand-pink/10 border-brand-pink/30 shadow-lg shadow-brand-pink/10'
                : s.available
                  ? 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
                  : 'bg-white/[0.02] border-white/[0.04] opacity-40'
            }`}
          >
            <span className={`text-[13px] ${s.selected ? 'text-white font-semibold' : s.available ? 'text-gray-300' : 'text-gray-600 line-through'}`}>{s.time}</span>
            {s.selected ? (
              <span className="text-[10px] font-semibold text-brand-pink flex items-center gap-1"><CheckCircle size={10} /> Selected</span>
            ) : s.available ? (
              <span className="text-[10px] text-emerald-400">Available</span>
            ) : (
              <span className="text-[10px] text-gray-600">Booked</span>
            )}
          </motion.div>
        ))}
      </div>
      {/* Animated cursor dot */}
      <motion.div
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
        viewport={{ once: true }} transition={{ delay: 1 }}
      >
        <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 text-center text-[12px] font-semibold text-white shadow-lg shadow-emerald-500/20">
          Confirm Booking →
        </div>
      </motion.div>
    </div>
  );
};

/* ── Mockup: Review & rating UI ── */
const ReviewMockup = () => (
  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
    {/* Provider row */}
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple/60 to-brand-pink/60 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/10">PS</div>
      <div>
        <p className="text-[13px] text-white font-semibold">Priya S.</p>
        <p className="text-[11px] text-gray-500">Deep Cleaning · Chennai</p>
      </div>
      <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-[10px] font-semibold">
        <CheckCircle size={10} /> Completed
      </span>
    </div>
    {/* Stars */}
    <div className="flex items-center gap-1 mb-3">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.12, type: 'spring', stiffness: 300 }}
        >
          <Star size={18} className="text-yellow-400 fill-yellow-400" />
        </motion.div>
      ))}
      <span className="text-[12px] text-gray-400 ml-2">5.0</span>
    </div>
    {/* Review bubble */}
    <motion.div
      initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ delay: 0.9 }}
      className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 mb-4"
    >
      <p className="text-[12px] text-gray-300 italic leading-relaxed">"Excellent work! The house has never been this clean. Priya was thorough, professional, and so friendly. Highly recommend!"</p>
    </motion.div>
    {/* Payment row */}
    <motion.div
      initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
      viewport={{ once: true }} transition={{ delay: 1.1 }}
      className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-400/5 border border-emerald-400/15"
    >
      <span className="text-[12px] text-gray-400">Total Paid</span>
      <span className="text-[13px] font-bold text-emerald-400 flex items-center gap-1.5">₹499 <CheckCircle size={12} /></span>
    </motion.div>
  </div>
);

/* ── Mockup: Provider listing / earnings UI ── */
const ProviderMockup = () => (
  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
    <div className="flex items-center justify-between mb-4">
      <span className="text-[13px] text-white font-semibold">Provider Dashboard</span>
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-[10px] font-semibold">
        <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" /></span>
        Online
      </span>
    </div>
    {/* Stats row */}
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[{ label: 'Bookings', val: '24' }, { label: 'Rating', val: '4.9★' }, { label: 'Earned', val: '₹14.8K' }].map((s, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.1 }}
          className="text-center py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <p className="text-[14px] text-white font-bold">{s.val}</p>
          <p className="text-[10px] text-gray-500">{s.label}</p>
        </motion.div>
      ))}
    </div>
    {/* Upcoming booking */}
    <motion.div initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.7 }}
      className="px-4 py-3 rounded-xl bg-brand-pink/5 border brand-pink/15 flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-pink/40 to-brand-purple/40 flex items-center justify-center shrink-0">
        <Clock size={12} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-white font-medium truncate">Next: Deep Cleaning — Raj K.</p>
        <p className="text-[10px] text-gray-500">Today, 4:00 PM · ₹499</p>
      </div>
      <ArrowRight size={12} className="text-gray-500 shrink-0" />
    </motion.div>
  </div>
);

/* ── Mockup: Provider service listing UI ── */
const ProviderServicesMockup = () => (
  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
    <div className="flex items-center justify-between mb-4">
      <span className="text-[13px] text-white font-semibold">My Services</span>
      <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-brand-pink to-brand-purple text-white text-[10px] font-semibold">+ Add New</span>
    </div>
    {[
      { name: 'Deep Cleaning', cat: '🧹 Cleaning', price: '₹499', status: 'Active', statusColor: 'emerald' },
      { name: 'Home Cooking', cat: '🍳 Cooking', price: '₹299', status: 'Active', statusColor: 'emerald' },
      { name: 'Elderly Care', cat: '🛡️ Care', price: '₹599', status: 'Paused', statusColor: 'yellow' },
    ].map((s, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.12 }}
        className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-2 hover:bg-white/[0.04] transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-white font-medium">{s.name}</p>
          <p className="text-[10px] text-gray-500">{s.cat} · {s.price}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${s.statusColor === 'emerald' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-yellow-400/10 text-yellow-400'}`}>{s.status}</span>
      </motion.div>
    ))}
  </div>
);

/* ── Mockup: Provider booking management UI ── */
const ProviderBookingsMockup = () => (
  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
    <p className="text-[13px] text-white font-semibold mb-3">Incoming Requests</p>
    {[
      { customer: 'Raj K.', service: 'Deep Cleaning', time: 'Today, 4 PM', amount: '₹499', action: 'Accept' },
      { customer: 'Sneha M.', service: 'Cooking', time: 'Tomorrow, 10 AM', amount: '₹299', action: 'Accept' },
    ].map((b, i) => (
      <motion.div key={i} initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.15 }}
        className="px-3 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[12px] text-white font-medium">{b.customer} — {b.service}</p>
          <span className="text-[11px] text-brand-pink font-bold">{b.amount}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 flex items-center gap-1"><Clock size={9} /> {b.time}</span>
          <div className="flex gap-1.5">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold cursor-pointer">Accept</span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-gray-500 text-[10px] font-medium cursor-pointer">Decline</span>
          </div>
        </div>
      </motion.div>
    ))}
    {/* Completed today */}
    <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center gap-2">
      <CheckCircle size={12} className="text-emerald-400" />
      <span className="text-[11px] text-gray-400">3 bookings completed today · <span className="text-emerald-400 font-medium">₹1,397 earned</span></span>
    </div>
  </div>
);

/* ── Mockup: Provider earnings/reviews UI ── */
const ProviderEarningsMockup = () => (
  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
    <p className="text-[13px] text-white font-semibold mb-3">This Month</p>
    {/* Earnings bar */}
    <div className="grid grid-cols-2 gap-3 mb-4">
      {[{ label: 'Total Earned', val: '₹14,800', icon: '💰' }, { label: 'Avg. Rating', val: '4.9 ★', icon: '⭐' }].map((s, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.1 }}
          className="text-center py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <span className="text-base mb-1 block">{s.icon}</span>
          <p className="text-[14px] text-white font-bold">{s.val}</p>
          <p className="text-[10px] text-gray-500">{s.label}</p>
        </motion.div>
      ))}
    </div>
    {/* Mini chart placeholder */}
    <div className="mb-3">
      <p className="text-[10px] text-gray-500 mb-2">Weekly Earnings</p>
      <div className="flex items-end gap-1.5 h-12">
        {[40, 65, 55, 80, 70, 90, 60].map((h, i) => (
          <motion.div key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
            className="flex-1 rounded-sm bg-gradient-to-t from-brand-pink/40 to-brand-purple/30" />
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[8px] text-gray-600">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
      </div>
    </div>
    {/* Latest review */}
    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 1 }}
      className="px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
      <p className="text-[11px] text-gray-300 italic">"Amazing service! Will book again." — Raj K.</p>
      <div className="flex gap-0.5 mt-1">{[...Array(5)].map((_, i) => <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />)}</div>
    </motion.div>
  </div>
);

/* ── Mockup: Customer list / match UI ── */
const CustomerMatchMockup = () => (
  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
    <p className="text-[13px] text-white font-semibold mb-3">Matched Providers Near You</p>
    {[
      { name: 'Priya S.', initials: 'PS', service: 'Deep Cleaning', dist: '1.2 km', rating: '4.9', grad: 'from-brand-pink/60 to-brand-purple/60' },
      { name: 'Meena R.', initials: 'MR', service: 'Home Cooking', dist: '2.5 km', rating: '4.8', grad: 'from-brand-purple/60 to-brand-blue/60' },
      { name: 'Anita D.', initials: 'AD', service: 'Elderly Care', dist: '0.8 km', rating: '5.0', grad: 'from-brand-blue/60 to-brand-pink/60' },
    ].map((p, i) => (
      <motion.div key={i}
        initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.15 }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors mb-1.5"
      >
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${p.grad} flex items-center justify-center text-white text-[10px] font-bold ring-1 ring-white/10 shrink-0`}>{p.initials}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-white font-medium truncate">{p.name} · {p.service}</p>
          <p className="text-[10px] text-gray-500">{p.dist} · ★ {p.rating}</p>
        </div>
        <ChevronRight size={12} className="text-gray-600 shrink-0" />
      </motion.div>
    ))}
  </div>
);

/* ── Timeline step node ── */
const nodeColors = ['from-blue-500 to-purple-500', 'from-pink-500 to-orange-500', 'from-yellow-500 to-orange-500', 'from-emerald-500 to-blue-500', 'from-purple-500 to-pink-500', 'from-rose-500 to-orange-500', 'from-cyan-500 to-blue-500', 'from-amber-500 to-yellow-500'];

const TimelineNode = ({ num, colorIdx }) => (
  <div className="relative flex items-center justify-center">
    <span className="absolute animate-ping w-12 h-12 rounded-full bg-white/5" />
    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${nodeColors[colorIdx]} flex items-center justify-center shadow-lg z-10`}>
      <span className="text-white font-bold text-sm">{num}</span>
    </div>
  </div>
);

/* ── Main HowItWorks component ── */
const HowItWorks = () => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const spineScale = useTransform(scrollYProgress, [0.1, 0.9], [0, 1]);
  const [activeRole, setActiveRole] = useState('customer');

  /* All 5 steps with dual customer/provider tracks */
  const timeline = [
    {
      num: '01', title: 'Browse & Discover Services',
      desc: 'Explore a curated catalog of 20+ verified home services — from deep cleaning to elderly care — across 50+ cities.',
      icon: '🔍',
      iconGrad: 'from-blue-500/20 to-purple-500/20 border-blue-500/30',
      checks: ['Filter by category, city, and price', 'View real-time provider availability', 'Read verified customer reviews'],
      mockup: <BrowseMockup />,
      side: 'left',
      who: 'customer',
      colorIdx: 0,
    },
    {
      num: '02', title: 'Book a Provider Instantly',
      desc: 'Choose your preferred time slot and get instant booking confirmation — no calls, no waiting.',
      icon: '📅',
      iconGrad: 'from-pink-500/20 to-orange-500/20 border-pink-500/30',
      checks: ['Real-time calendar slot picker', 'Instant SMS + email confirmation', 'Free rescheduling up to 2 hours before'],
      mockup: <BookingMockup />,
      side: 'right',
      who: 'customer',
      colorIdx: 1,
    },
    {
      num: '03', title: 'Enjoy the Experience',
      desc: 'Sit back while background-verified experts handle everything. Track progress in real time from your phone.',
      icon: '✨',
      iconGrad: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
      checks: ['Live provider tracking on your phone', 'In-app messaging with your provider', '100% satisfaction guarantee or full refund'],
      mockup: <CustomerMatchMockup />,
      side: 'left',
      who: 'customer',
      colorIdx: 2,
    },
    {
      num: '04', title: 'Review & Feedback',
      desc: 'After every service, rate your provider, write a review, and help other families make better choices.',
      icon: '⭐',
      iconGrad: 'from-emerald-500/20 to-blue-500/20 border-emerald-500/30',
      checks: ['5-star rating with detailed feedback', 'Verified reviews visible to all customers', 'Earn loyalty credits for reviewing'],
      mockup: <ReviewMockup />,
      side: 'right',
      who: 'customer',
      colorIdx: 3,
    },
    {
      num: '05', title: 'Register & List Your Services',
      desc: 'Sign up as a verified provider, create your service listings with pricing and availability, and go live instantly.',
      icon: '📋',
      iconGrad: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
      checks: ['Quick profile setup with ID verification', 'List multiple services with custom pricing', 'Set your own working hours & service area'],
      mockup: <ProviderServicesMockup />,
      side: 'left',
      who: 'provider',
      colorIdx: 4,
    },
    {
      num: '06', title: 'Receive & Manage Bookings',
      desc: 'Get notified instantly when customers book you. Accept, reschedule, or manage all your bookings from one dashboard.',
      icon: '📱',
      iconGrad: 'from-rose-500/20 to-orange-500/20 border-rose-500/30',
      checks: ['Instant push notifications for new bookings', 'Accept or decline with one tap', 'In-app chat with customers before the visit'],
      mockup: <ProviderBookingsMockup />,
      side: 'right',
      who: 'provider',
      colorIdx: 5,
    },
    {
      num: '07', title: 'Deliver & Build Reputation',
      desc: 'Complete services, collect reviews, and build your reputation. Higher ratings mean more visibility and more bookings.',
      icon: '⭐',
      iconGrad: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
      checks: ['Verified badges for top-rated providers', 'Profile highlighted in search results', 'Priority matching with nearby customers'],
      mockup: <ProviderMockup />,
      side: 'left',
      who: 'provider',
      colorIdx: 6,
    },
    {
      num: '08', title: 'Track Earnings & Grow',
      desc: 'Monitor your weekly earnings, view analytics, read customer feedback, and scale your home services business.',
      icon: '📊',
      iconGrad: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30',
      checks: ['Detailed earnings breakdown with charts', 'Weekly & monthly performance analytics', 'Withdraw earnings directly to your bank'],
      mockup: <ProviderEarningsMockup />,
      side: 'right',
      who: 'provider',
      colorIdx: 7,
    },
  ];

  const filteredTimeline = timeline
    .filter(s => s.who === activeRole)
    .map((s, i) => ({ ...s, num: String(i + 1).padStart(2, '0'), colorIdx: activeRole === 'provider' ? i + 4 : i }));

  return (
    <Section id="how-it-works" className="py-16 px-5">
      <div ref={sectionRef} className="max-w-[1200px] mx-auto">
        {/* ── Header ── */}
        <div className="text-center mb-6">
          <SectionLabel>Process</SectionLabel>
          <SectionHeading sub="From browsing to booking to review — here's how HouseWise works for customers and providers.">
            How It <span className="gradient-shift-text">Works</span>
          </SectionHeading>
        </div>

        {/* Stat pills row */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {['⚡ Takes 2 minutes', '📅 Book same-day', '✅ No hidden charges'].map((pill, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }}
              className="px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 font-medium"
            >{pill}</motion.span>
          ))}
        </div>

        {/* Helper text */}
        <p className="text-center text-sm text-gray-500 mb-8">
          Select a tab below to see how it works — for <span className="text-gray-300">customers booking a service</span> or <span className="text-gray-300">providers growing their business</span>.
        </p>

        {/* ── Role toggle tabs ── */}
        <div className="flex justify-center gap-3 mb-16">
          {[
            { key: 'customer', label: '🏠 For Customers', sub: '4 easy steps', grad: 'from-brand-pink to-brand-purple' },
            { key: 'provider', label: '💼 For Providers', sub: '4 easy steps', grad: 'from-brand-purple to-brand-blue' },
          ].map((r) => {
            const isActive = activeRole === r.key;
            return (
              <motion.button key={r.key} onClick={() => setActiveRole(r.key)}
                initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                className={`relative text-center px-7 py-3.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-white/[0.06] border-white/[0.15] shadow-[0_0_30px_rgba(255,60,172,0.1)]'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]'
                }`}>
                {isActive && (
                  <motion.div layoutId="roleIndicator" className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${r.grad} opacity-[0.07]`}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <p className={`text-[13px] font-semibold relative z-10 ${isActive ? 'text-white' : 'text-gray-400'}`}>{r.label}</p>
                <p className={`text-[10px] mt-0.5 relative z-10 ${isActive ? 'text-gray-300' : 'text-gray-600'}`}>{r.sub}</p>
              </motion.button>
            );
          })}
        </div>

        {/* ── Desktop zigzag timeline ── */}
        <div className="relative hidden lg:block">
          {/* Animated spine */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
            <div className="absolute inset-0 border-l-2 border-dashed border-white/[0.06]" />
            <motion.div style={{ scaleY: spineScale, transformOrigin: 'top' }}
              className="absolute inset-0 w-0.5 bg-gradient-to-b from-brand-pink via-brand-purple to-brand-blue" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeRole} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
              {filteredTimeline.map((step, i) => {
                const isLeft = step.side === 'left';
                return (
                  <div key={i} className="relative grid grid-cols-[1fr_80px_1fr] gap-0 mb-24 last:mb-0 items-center">
                    {/* Left column */}
                    <motion.div
                      initial={{ opacity: 0, x: isLeft ? -60 : 0 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-80px' }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      className={isLeft ? '' : 'flex justify-end'}
                    >
                      {isLeft ? (
                        <StepContent step={step} />
                      ) : (
                        <div className="w-full max-w-[420px]">
                          <motion.div initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, delay: 0.2 }}>
                            {step.mockup}
                          </motion.div>
                        </div>
                      )}
                    </motion.div>

                    {/* Center node */}
                    <div className="flex justify-center">
                      <TimelineNode num={step.num} colorIdx={step.colorIdx} />
                    </div>

                    {/* Right column */}
                    <motion.div
                      initial={{ opacity: 0, x: isLeft ? 0 : 60 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: '-80px' }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      className={isLeft ? '' : ''}
                    >
                      {isLeft ? (
                        <div className="max-w-[420px]">
                          <motion.div initial={{ opacity: 0, scale: 0.92 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, delay: 0.2 }}>
                            {step.mockup}
                          </motion.div>
                        </div>
                      ) : (
                        <StepContent step={step} />
                      )}
                    </motion.div>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Mobile vertical stepper ── */}
        <div className="lg:hidden relative pl-10">
          {/* Left accent line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-0.5">
            <div className="absolute inset-0 bg-gradient-to-b from-brand-pink via-brand-purple to-brand-blue opacity-30" />
            <motion.div style={{ scaleY: spineScale, transformOrigin: 'top' }}
              className="absolute inset-0 bg-gradient-to-b from-brand-pink via-brand-purple to-brand-blue" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={activeRole} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.4 }}>
              {filteredTimeline.map((step, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="relative mb-16 last:mb-0"
                >
                  {/* Node on the line */}
                  <div className="absolute -left-10 top-0">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${nodeColors[step.colorIdx]} flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-bold text-xs">{step.num}</span>
                    </div>
                  </div>

                  <StepContent step={step} />

                  {/* Mockup below on mobile */}
                  <div className="mt-4">{step.mockup}</div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
};

/* ── Step content panel (reused desktop + mobile) ── */
const StepContent = ({ step }) => (
  <div className="relative">
    {/* Watermark number */}
    <span className="absolute -top-6 -left-2 text-8xl font-black text-white/[0.03] select-none pointer-events-none leading-none">{step.num}</span>

    {/* Role badge */}
    {step.who === 'provider' && (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-purple/10 border border-brand-purple/20 text-[10px] font-semibold text-brand-purple mb-3">
        <Award size={10} /> Provider Flow
      </span>
    )}

    {/* Icon pill */}
    <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br ${step.iconGrad} border mb-4 text-xl`}>
      {step.icon}
    </div>

    <h3 className="text-2xl font-display font-bold text-white mb-2 leading-tight">{step.title}</h3>
    <p className="text-[14px] text-gray-400 leading-relaxed mb-4 max-w-md">{step.desc}</p>

    {/* Check list */}
    <ul className="space-y-2.5">
      {step.checks.map((c, ci) => (
        <li key={ci} className="flex items-center gap-2.5 text-[13px] text-gray-300">
          <AnimCheck delay={ci * 0.1} /> {c}
        </li>
      ))}
    </ul>
  </div>
);

/* ════════════════════════════════════════════════
   4. SERVICES — Premium Filtered Masonry Grid
   ════════════════════════════════════════════════ */

const serviceCategories = ['All', 'Cleaning', 'Cooking', 'Care', 'Education', 'Beauty', 'Tailoring', 'Childcare', 'Handicrafts', 'Catering'];

/* ── Service Detail Modal ── */
const ServiceModal = memo(({ service, onClose }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState(2);
  if (!service) return null;
  const dates = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri'];
  const times = ['10 AM', '12 PM', '2 PM', '4 PM', '6 PM'];
  const providers = [
    { initials: 'PS', name: 'Priya S.', rating: '4.9', grad: 'from-brand-pink/60 to-brand-purple/60' },
    { initials: 'MR', name: 'Meena R.', rating: '4.8', grad: 'from-brand-purple/60 to-brand-blue/60' },
    { initials: 'AD', name: 'Anita D.', rating: '5.0', grad: 'from-brand-blue/60 to-brand-pink/60' },
  ];
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-end lg:items-center justify-center p-0 lg:p-6"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full lg:max-w-lg max-h-[90vh] overflow-y-auto bg-[#0f0f17] border border-white/10 rounded-t-3xl lg:rounded-3xl z-10"
        >
          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
          {/* Image */}
          {service.image && (
            <div className="relative h-48 overflow-hidden rounded-t-3xl">
              <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f17] via-transparent to-transparent" />
            </div>
          )}
          {!service.image && (
            <div className="h-48 rounded-t-3xl bg-gradient-to-br from-teal-900/50 to-blue-900/50 flex items-center justify-center">
              <span className="text-5xl">{service.icon}</span>
            </div>
          )}
          <div className="p-6 pt-4">
            {/* Title row */}
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{service.icon}</span>
                <h3 className="text-xl font-display font-bold text-white">{service.name}</h3>
              </div>
              <div className="flex items-center gap-1.5 text-yellow-400">
                <Star size={14} className="fill-yellow-400" />
                <span className="text-sm font-semibold">{service.rating}</span>
                <span className="text-xs text-gray-500">({service.reviews})</span>
              </div>
            </div>
            <p className="text-brand-pink font-bold text-lg mb-4">From ₹{service.price}</p>
            {/* About */}
            <p className="text-sm text-gray-400 leading-relaxed mb-5">{service.desc}</p>
            {/* Includes */}
            {service.includes && (
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What's included</p>
                <div className="grid grid-cols-2 gap-2">
                  {service.includes.map((item, i) => (
                    <span key={i} className="flex items-center gap-2 text-[13px] text-gray-300">
                      <CheckCircle size={12} className="text-brand-pink shrink-0" /> {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Providers */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Available providers ({providers.length})</p>
              <div className="flex gap-3">
                {providers.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${p.grad} flex items-center justify-center text-white text-[9px] font-bold`}>{p.initials}</div>
                    <div>
                      <p className="text-[12px] text-white font-medium">{p.name}</p>
                      <p className="text-[10px] text-gray-500">★ {p.rating}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Date & Time */}
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Select date & time</p>
              <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
                {dates.map((d, i) => (
                  <button key={i} onClick={() => setSelectedDate(i)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                      i === selectedDate ? 'bg-gradient-to-r from-brand-pink to-brand-purple text-white shadow-lg shadow-brand-pink/20' : 'bg-white/[0.04] border border-white/[0.06] text-gray-400 hover:border-white/[0.12]'
                    }`}>{d}</button>
                ))}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {times.map((t, i) => (
                  <button key={i} onClick={() => setSelectedTime(i)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                      i === selectedTime ? 'bg-gradient-to-r from-brand-pink to-brand-purple text-white shadow-lg shadow-brand-pink/20' : 'bg-white/[0.04] border border-white/[0.06] text-gray-400 hover:border-white/[0.12]'
                    }`}>{t}</button>
                ))}
              </div>
            </div>
            {/* CTA */}
            <button onClick={() => { onClose(); navigate('/register'); }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue text-white font-semibold text-sm shadow-lg shadow-brand-pink/20 hover:shadow-brand-pink/40 transition-shadow flex items-center justify-center gap-2"
            >
              Book Now — ₹{service.price} <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
ServiceModal.displayName = 'ServiceModal';

/* ── Individual Service Card ── */
const ServiceCard = memo(({ service, index }) => {
  const [hovered, setHovered] = useState(false);
  const isGradient = service.size === 'gradient';
  const isLarge = service.size === 'large';
  const isTall = service.size === 'tall';
  const isWide = service.size === 'wide';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: isLarge ? -30 : (isTall || isWide) ? 30 : 0 }}
      whileInView={{ opacity: 1, scale: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.06 }}
      layout
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500 ${
        hovered ? 'shadow-[0_0_0_1px_rgba(255,60,172,0.5),0_20px_60px_rgba(255,60,172,0.12)]' : 'border border-white/[0.06]'
      }`}
      style={{ height: isLarge ? '100%' : isTall ? '100%' : isGradient ? '100%' : undefined, minHeight: isLarge ? 380 : isTall ? 380 : isGradient ? 340 : isWide ? 280 : 280 }}
    >
      {/* Background */}
      {isGradient ? (
        <div className="absolute inset-0 bg-gradient-to-br from-teal-900/50 to-blue-900/50" />
      ) : (
        <>
          <img src={service.image} alt={service.name} loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </>
      )}

      {/* Top row */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10">
        <div className="flex flex-col gap-2">
          {service.badge && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-brand-pink to-brand-purple text-white text-[10px] font-bold shadow-lg w-fit">
              {service.badge}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-[10px] uppercase tracking-widest text-gray-300 font-medium w-fit">
            {service.category}
          </span>
        </div>
        <span className="px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-[12px] font-semibold text-white shrink-0">
          From ₹{service.price}
        </span>
      </div>

      {/* Gradient card center content */}
      {isGradient && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 z-10">
          <motion.div animate={hovered ? { scale: 1.1 } : { scale: 1 }} transition={{ duration: 0.3 }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500/30 to-blue-500/30 border border-teal-500/20 flex items-center justify-center text-3xl mb-4 shadow-lg">
            {service.icon}
          </motion.div>
          <h3 className="text-xl font-display font-bold text-white mb-2 text-center">{service.name}</h3>
          <p className="text-[12px] text-gray-400 text-center leading-relaxed mb-4 max-w-[260px]">{service.desc}</p>
          {/* Trust items */}
          {service.trustItems && (
            <div className="space-y-2.5 mb-4 w-full max-w-[240px]">
              {service.trustItems.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-2.5 text-[12px] text-gray-300">
                  <CheckCircle size={14} className="text-teal-400 shrink-0" /> {t}
                </motion.div>
              ))}
            </div>
          )}
          {/* Provider avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {['PS', 'MR', 'AD'].map((init, i) => (
                <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500/50 to-blue-500/50 flex items-center justify-center text-white text-[9px] font-bold ring-2 ring-[#0f0f17]">{init}</div>
              ))}
            </div>
            <span className="text-[11px] text-gray-500">12 providers available</span>
          </div>
        </div>
      )}

      {/* Bottom content */}
      {!isGradient && (
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          {/* Always visible */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2.5">
              <span className="text-lg">{service.icon}</span>
              <h3 className="text-lg font-display font-bold text-white">{service.name}</h3>
            </div>
            <motion.div animate={hovered ? { rotate: 45 } : { rotate: 0 }} transition={{ duration: 0.3 }}
              className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center shrink-0">
              <ArrowUpRight size={14} className="text-white" />
            </motion.div>
          </div>
          <p className={`text-[13px] text-gray-400 leading-relaxed ${hovered ? 'line-clamp-2' : 'line-clamp-1'}`}>{service.desc}</p>

          {/* Hover-reveal content */}
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, y: 15, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 15, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
                  {service.tags.map((tag, ti) => (
                    <span key={ti} className="px-2 py-0.5 rounded-md bg-white/[0.06] text-[10px] text-gray-400 border border-white/[0.06] font-medium">{tag}</span>
                  ))}
                </div>
                <div className="h-px w-full bg-white/[0.08] mb-3" />
                {/* Stats row */}
                <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-3">
                  <span className="flex items-center gap-1"><Star size={10} className="text-yellow-400 fill-yellow-400" /> {service.rating}</span>
                  <span>•</span>
                  <span>{service.bookings.toLocaleString()}+ bookings</span>
                  {service.availableToday && <><span>•</span><span className="text-emerald-400">Available Today</span></>}
                </div>
                {/* Laundry process timeline */}
                {service.hasProcess && (
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-3 px-1">
                    {['📦 Pickup', '🧺 Wash', '👔 Iron', '🚚 Deliver'].map((step, si) => (
                      <span key={si} className="flex items-center gap-1">
                        {step}
                        {si < 3 && <span className="text-gray-600 mx-0.5">→</span>}
                      </span>
                    ))}
                  </div>
                )}
                {/* Book button */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-pink to-brand-purple text-center text-[12px] font-semibold text-white shadow-lg shadow-brand-pink/20">
                    Book Now →
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
});
ServiceCard.displayName = 'ServiceCard';

/* ── Main ServicesGrid ── */
const ServicesGrid = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState(null);

  const filtered = useMemo(() => {
    let result = landingServices;
    if (activeTab !== 'All') result = result.filter(s => s.category === activeTab);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || s.tags.some(t => t.toLowerCase().includes(q)));
    }
    return result;
  }, [activeTab, searchQuery]);

  return (
    <Section id="services" className="py-16 px-5">
      <div className="max-w-[1200px] mx-auto">
        {/* ── Header ── */}
        <div className="text-center mb-6">
          <SectionLabel>Services</SectionLabel>
          <SectionHeading sub="Expert home care services tailored to your lifestyle — from cleaning to catering.">
            Everything Your Home <span className="gradient-shift-text">Needs</span>
          </SectionHeading>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {['🧹 10 Services Available', '📍 50+ Cities', '⚡ Book in 2 min'].map((pill, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.08 }}
              className="px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 font-medium"
            >{pill}</motion.span>
          ))}
        </div>

        {/* Search bar */}
        <motion.div initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
          className="max-w-lg mx-auto mb-10">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] focus-within:ring-2 focus-within:ring-brand-pink/30 focus-within:border-brand-pink/40 transition-all">
            <Search size={16} className="text-gray-500 shrink-0" />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search services... (e.g. "deep cleaning" or "cooking")'
              className="w-full bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Category filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-10 scrollbar-none">
          {serviceCategories.map((cat, i) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }} transition={{ delay: 0.05 * i }}
              onClick={() => setActiveTab(cat)}
              className={`px-5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all duration-300 shrink-0 ${
                activeTab === cat
                  ? 'bg-gradient-to-r from-brand-pink to-brand-purple text-white shadow-lg shadow-brand-pink/20'
                  : 'bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:border-brand-pink/30 hover:text-gray-200'
              }`}
            >{cat}</motion.button>
          ))}
        </div>

        {/* Grid */}
        <AnimatePresence mode="wait">
          {filtered.length > 0 ? (
            <motion.div key={activeTab + searchQuery}
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3 }}
            >
              {/* Desktop masonry — using CSS grid with named areas */}
              <div className="hidden lg:grid gap-4" style={{
                gridTemplateColumns: 'repeat(4, 1fr)',
                gridTemplateRows: 'auto',
                gridAutoRows: 'minmax(280px, auto)',
              }}>
                {filtered.map((s, i) => {
                  let span = {};
                  if (s.size === 'large') span = { gridColumn: 'span 2', gridRow: 'span 2' };
                  else if (s.size === 'wide') span = { gridColumn: 'span 2', gridRow: 'span 1' };
                  else if (s.size === 'tall') span = { gridColumn: 'span 1', gridRow: 'span 2' };
                  else if (s.size === 'gradient') span = { gridColumn: 'span 1', gridRow: 'span 2' };
                  else span = { gridColumn: 'span 1', gridRow: 'span 1' };
                  return (
                    <div key={s.id} style={span} onClick={() => setSelectedService(s)}>
                      <ServiceCard service={s} index={i} />
                    </div>
                  );
                })}
              </div>
              {/* Mobile / Tablet — single column */}
              <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filtered.map((s, i) => (
                  <div key={s.id} onClick={() => setSelectedService(s)} style={{ minHeight: 280 }}>
                    <ServiceCard service={s} index={i} />
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-20"
            >
              <div className="text-5xl mb-4">🔍</div>
              <h4 className="text-lg font-display font-bold text-white mb-2">No services found</h4>
              <p className="text-sm text-gray-500 mb-6">Try a different search term or category.</p>
              <button onClick={() => { setSearchQuery(''); setActiveTab('All'); }}
                className="px-6 py-2.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-sm text-gray-300 hover:text-white transition-colors">
                Clear filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Service detail modal */}
      {selectedService && <ServiceModal service={selectedService} onClose={() => setSelectedService(null)} />}
    </Section>
  );
};

/* ════════════════════════════════════════════════
   5. STATS — Immersive Full-Width Counters
   ════════════════════════════════════════════════ */

const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad'];

const StatCard = memo(({ stat, index, inView }) => {
  const [countDone, setCountDone] = useState(false);
  const Icon = stat.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="relative bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-7 sm:p-8 transition-all duration-300 hover:bg-white/[0.06] hover:border-brand-pink/20 hover:shadow-[0_0_40px_rgba(255,60,172,0.1)] group"
    >
      {/* Icon */}
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br ${stat.iconGrad} border flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
        <Icon size={20} className={stat.iconColor} />
      </div>

      {/* Counter */}
      <div className="mb-1">
        <span className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tabular-nums">
          {inView ? (
            <CountUp start={stat.start} end={stat.value} duration={2.5} separator="," onEnd={() => setCountDone(true)} />
          ) : stat.start.toLocaleString()}
        </span>
        <span className="text-2xl sm:text-3xl font-bold text-brand-pink ml-0.5">{stat.suffix}</span>
      </div>

      {/* Label */}
      <p className="text-sm text-gray-400 font-medium mb-4">{stat.label}</p>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-3" />

      {/* Growth tag */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={countDone ? { opacity: 1 } : {}}
        transition={{ duration: 0.4 }}
        className={`text-xs font-medium ${stat.growthColor}`}
      >
        {stat.growth}
      </motion.p>
    </motion.div>
  );
});
StatCard.displayName = 'StatCard';

const StatsSection = () => {
  const { ref, inView } = useInViewIO({ triggerOnce: true, threshold: 0.3 });

  return (
    <Section className="relative py-14 px-5 overflow-hidden">
      {/* Background mesh gradients */}
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 20% 50%, rgba(255,60,172,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(43,134,197,0.08) 0%, transparent 60%)',
      }} />
      {/* Top & bottom border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-white/[0.06]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-white/[0.06]" />

      <div ref={ref} className="relative z-10 max-w-[1200px] mx-auto">
        {/* Stat cards with separators */}
        <div className="grid grid-cols-2 gap-4 lg:hidden mb-10">
          {statsData.map((stat, i) => (
            <StatCard key={i} stat={stat} index={i} inView={inView} />
          ))}
        </div>
        <div className="hidden lg:flex items-stretch gap-0 mb-10">
          {statsData.map((stat, i) => (
            <React.Fragment key={i}>
              <div className="flex-1">
                <StatCard stat={stat} index={i} inView={inView} />
              </div>
              {i < statsData.length - 1 && (
                <div className="flex items-center px-2">
                  <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Cities banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white/[0.02] border border-white/[0.06] rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        >
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-xl">🇮🇳</span>
            <span className="text-sm text-gray-300 font-medium">Serving families across India</span>
          </div>
          <div className="flex flex-wrap gap-2 overflow-x-auto scrollbar-none">
            {cities.map((city, i) => (
              <motion.span key={city}
                initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.5 + i * 0.06 }}
                className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 font-medium whitespace-nowrap shrink-0"
              >{city}</motion.span>
            ))}
            <span className="px-3 py-1 rounded-full text-xs font-medium gradient-shift-text whitespace-nowrap shrink-0 cursor-pointer">+42 more →</span>
          </div>
        </motion.div>
      </div>
    </Section>
  );
};

/* ════════════════════════════════════════════════
   6. TESTIMONIALS — Asymmetric Masonry Grid
   ════════════════════════════════════════════════ */

const TestimonialsSection = () => (
  <Section className="py-16 px-5">
    <div className="max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <SectionLabel>Testimonials</SectionLabel>
        <SectionHeading sub="">
          Loved by <span className="gradient-shift-text">Thousands</span>
        </SectionHeading>
      </div>

      {/* Live rating strip */}
      <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="flex items-center justify-center gap-3 text-sm text-gray-400 mb-16 flex-wrap">
        <span className="text-amber-400">⭐ 4.9 average</span>
        <span className="text-white/10">·</span>
        <span>15,000+ reviews</span>
        <span className="text-white/10">·</span>
        <span className="flex items-center gap-1"><Shield size={12} className="text-emerald-400" /> Verified on Google</span>
      </motion.div>

      {/* Masonry grid */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-5 space-y-5">
        {testimonials.map((t, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: i % 2 === 0 ? 30 : -30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            whileHover={{ y: -6 }}
            className="break-inside-avoid group bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] rounded-3xl p-7 hover:border-pink-500/30 hover:shadow-[0_8px_40px_rgba(255,60,172,0.08)] transition-all duration-300"
          >
            {/* Service tag */}
            <span className="inline-block px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-medium mb-4">{t.service}</span>
            {/* Opening quote */}
            <span className="block text-6xl text-pink-500/20 font-serif leading-none -mb-4 select-none">"</span>
            {/* Quote text */}
            <p className="text-gray-300 text-base leading-relaxed italic mb-6">{t.text}</p>
            {/* Star row */}
            <div className="flex gap-0.5 mb-4">
              {Array.from({ length: t.rating }, (_, ri) => (
                <span key={ri} className="text-amber-400 text-sm">★</span>
              ))}
            </div>
            {/* Author */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.grad} flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white/5`}>{t.avatar}</div>
              <div>
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Logo trust bar */}
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="mt-16 pt-10 border-t border-white/[0.04]">
        <p className="text-center text-xs text-gray-600 uppercase tracking-widest mb-5">As seen in</p>
        <div className="flex items-center justify-center gap-8 flex-wrap">
          {['YourStory', 'Inc42', 'Economic Times', 'Entrepreneur India'].map((name, i) => (
            <span key={i} className="text-gray-600 font-bold text-sm hover:text-gray-300 transition-colors cursor-default">{name}</span>
          ))}
        </div>
      </motion.div>
    </div>
  </Section>
);

/* ════════════════════════════════════════════════
   7. ABOUT / PROVIDER SPOTLIGHT
   ════════════════════════════════════════════════ */

const AboutSection = () => (
  <Section id="about-us" className="py-16 px-5">
    <div className="max-w-[1100px] mx-auto">

      {/* Part A — Mission statement banner */}
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="relative bg-gradient-to-r from-pink-500/[0.04] via-purple-500/[0.04] to-blue-500/[0.04] border-y border-white/[0.06] py-14 px-8 rounded-3xl mb-20 overflow-hidden">
        <span className="absolute top-4 left-6 text-8xl text-pink-500/10 font-serif leading-none select-none pointer-events-none">"</span>
        <span className="absolute bottom-4 right-6 text-8xl text-pink-500/10 font-serif leading-none select-none pointer-events-none rotate-180">"</span>
        <p className="relative text-2xl font-light text-gray-300 text-center max-w-3xl mx-auto leading-relaxed z-10">
          Our mission is to make quality home services accessible to every Indian family — while creating <span className="text-white font-medium">dignified livelihoods</span> for skilled women.
        </p>
      </motion.div>

      {/* Part B — Split layout */}
      <div className="grid lg:grid-cols-[58%_42%] gap-16 items-start">
        {/* Left column */}
        <div>
          <SectionLabel>About Us</SectionLabel>
          <SectionHeading sub="We're building the most trusted network of home-service professionals in India.">
            Empowering <span className="gradient-shift-text">Skilled Women</span>
          </SectionHeading>

          {/* Feature rows */}
          <div className="mt-10 space-y-5">
            {[
              { icon: Shield, title: 'Verified & Background-Checked', desc: 'Every provider passes multi-step identity and skill verification.', color: 'from-brand-pink' },
              { icon: Zap, title: 'Instant Booking & Payouts', desc: 'Seamless booking for customers, instant earnings for providers.', color: 'from-brand-purple' },
              { icon: Heart, title: 'Community-First Approach', desc: 'Fair wages, training programs, and real career growth for every provider.', color: 'from-brand-blue' },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }} className="flex gap-4">
                <div className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${item.color} to-transparent/0 bg-opacity-10 border border-white/[0.06] flex items-center justify-center`}>
                  <item.icon size={18} className="text-brand-pink" />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-white mb-1">{item.title}</h4>
                  <p className="text-[14px] text-gray-400 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right column — Become a Provider card */}
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative">
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
            <div className="rounded-3xl p-px bg-gradient-to-br from-pink-500/30 via-purple-500/20 to-blue-500/30 border-rotate-glow">
              <div className="bg-[#0c0c14] rounded-3xl p-8 space-y-5">
                {/* Avatar stack + header */}
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {['PS', 'MR', 'AK', 'SD'].map((init, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold ring-2 ring-[#0c0c14]">{init}</div>
                    ))}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Become a Provider</p>
                    <p className="text-gray-500 text-[12px]">Join 2,500+ skilled professionals</p>
                  </div>
                </div>

                {/* Checklist */}
                {['Set your own schedule', 'Earn competitive rates', 'Get training & certification', 'Insurance coverage included'].map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.08 }} className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-green-400 shrink-0" />
                    <span className="text-[14px] text-gray-400">{item}</span>
                  </motion.div>
                ))}

                {/* Earnings preview */}
                <div className="bg-green-500/[0.08] border border-green-500/20 rounded-xl px-4 py-3">
                  <p className="text-sm text-green-400 font-medium">💰 Avg. monthly earnings: <span className="text-white font-semibold">₹18,000–₹35,000</span></p>
                </div>

                {/* CTA */}
                <button onClick={() => { window.location.href = '/register'; }}
                  className="w-full mt-1 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[14px] font-semibold hover:shadow-lg hover:shadow-pink-500/25 transition-all flex items-center justify-center gap-2 btn-shimmer">
                  Apply Now <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </motion.div>
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-pink/[0.06] blur-[60px] float-slow pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-brand-purple/[0.05] blur-[50px] float-slower pointer-events-none" />
        </motion.div>
      </div>

      {/* Founder card — full width below split layout */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.3 }}
        whileHover={{ y: -3 }}
        className="relative mt-16"
      >
        {/* Background glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/5 to-purple-500/5 blur-2xl rounded-3xl -z-10" />

        <div className="relative bg-gradient-to-r from-white/[0.04] via-white/[0.03] to-white/[0.02] backdrop-blur-sm border border-white/[0.08] rounded-3xl p-8 overflow-hidden hover:border-pink-500/30 transition-colors duration-300">
          {/* Left pink accent bar */}
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl bg-gradient-to-b from-pink-500 to-purple-500" />

          <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
            {/* Left — Photo + info */}
            <div className="flex flex-col items-center lg:items-start gap-4 lg:min-w-[280px] shrink-0">
              <motion.img
                initial={{ scale: 0.85, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5, duration: 0.5 }}
                src="/AppajiB.jpg" alt="Appaji B"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-pink-500/50 ring-offset-2 ring-offset-[#0a0a0f]"
              />
              <div className="text-center lg:text-left">
                <div className="flex items-center gap-2 justify-center lg:justify-start mb-1">
                  <h4 className="text-2xl font-bold text-white">Appaji B</h4>
                  <span className="px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 text-xs font-medium">Founder & CEO</span>
                </div>
                <p className="text-pink-400 text-sm font-medium mb-1">Founder & CEO, HouseWise</p>
                <p className="flex items-center gap-1.5 text-xs text-gray-500 justify-center lg:justify-start">
                  <MapPin size={12} /> Bengaluru, India
                </p>
              </div>
              <div className="flex gap-2">
                <a href="#" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors">
                  <ExternalLink size={10} /> LinkedIn
                </a>
                <a href="#" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 text-xs font-medium hover:text-white transition-colors">
                  <ExternalLink size={10} /> Twitter
                </a>
              </div>
            </div>

            {/* Vertical divider (desktop only) */}
            <div className="hidden lg:block w-px self-stretch bg-gradient-to-b from-transparent via-white/10 to-transparent mx-2" />

            {/* Right — Quote */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex-1 border-l-2 border-pink-500/40 pl-6"
            >
              <span className="block text-7xl text-pink-500/20 font-serif leading-none mb-2 select-none">"</span>
              <p className="text-gray-300 text-lg italic leading-relaxed">
                Built to empower skilled women and bring trusted care to every Indian home. We believe every family deserves access to quality services, and every skilled woman deserves a platform to thrive.
              </p>
              <p className="text-xs text-gray-600 mt-4">— Appaji B, on founding HouseWise in 2025</p>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  </Section>
);

/* ════════════════════════════════════════════════
   8. CONTACT + FAQ — 3-Column Premium Layout
   ════════════════════════════════════════════════ */

const ContactSection = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [formState, setFormState] = useState({ name: '', email: '', subject: 'Book a Service', message: '' });
  const [formStatus, setFormStatus] = useState('idle'); // idle | sending | success
  const [focused, setFocused] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormStatus('sending');
    setTimeout(() => {
      setFormStatus('success');
      setTimeout(() => { setFormStatus('idle'); setFormState({ name: '', email: '', subject: 'Book a Service', message: '' }); }, 3000);
    }, 1500);
  };

  return (
    <Section id="contact" className="py-16 px-5">
      <div className="max-w-[1200px] mx-auto">
        <div className="text-center mb-16">
          <SectionLabel>Contact</SectionLabel>
          <SectionHeading sub="Got questions? We'd love to hear from you.">
            Get in <span className="gradient-shift-text">Touch</span>
          </SectionHeading>
        </div>

        <div className="grid lg:grid-cols-[25%_40%_35%] gap-6">
          {/* Left — Contact Info card */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 self-start">
            {/* Online status */}
            <div className="flex items-center gap-2 mb-6">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-xs text-emerald-400 font-medium">Online now</span>
            </div>

            <div className="space-y-4 mb-6">
              {[
                { icon: Mail, text: 'hello@housewise.in', color: 'text-pink-400' },
                { icon: Phone, text: '1800-123-4567', color: 'text-pink-400' },
                { icon: Clock, text: 'Mon–Sat 9AM–8PM', color: 'text-pink-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <item.icon size={16} className={item.color} />
                  <span className="text-sm text-gray-300">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.06] pt-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">Response time:</p>
              <p className="text-sm text-white font-medium">⚡ Usually &lt; 2 hrs</p>
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-xs text-gray-500 mb-3">Also reach us on:</p>
              <div className="flex gap-2">
                <button className="flex-1 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-medium hover:bg-green-500/15 transition-colors">WhatsApp</button>
                <button className="flex-1 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-400 text-xs font-medium hover:text-white transition-colors">Twitter / X</button>
              </div>
            </div>
          </motion.div>

          {/* Middle — Contact Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.08] rounded-3xl p-8">
            <AnimatePresence mode="wait">
              {formStatus === 'success' ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                    <CheckCircle size={32} className="text-emerald-400" />
                  </div>
                  <p className="text-xl font-bold text-white mb-2">Message Sent!</p>
                  <p className="text-gray-400 text-sm">We'll get back to you within 24 hours.</p>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={handleSubmit} className="space-y-5">
                  {/* Name & Email with floating labels */}
                  {[
                    { id: 'name', label: 'Full Name', type: 'text' },
                    { id: 'email', label: 'Email Address', type: 'email' },
                  ].map((field) => (
                    <div key={field.id} className="relative">
                      <input type={field.type} required id={field.id}
                        value={formState[field.id]}
                        onChange={(e) => setFormState({ ...formState, [field.id]: e.target.value })}
                        onFocus={() => setFocused({ ...focused, [field.id]: true })}
                        onBlur={() => setFocused({ ...focused, [field.id]: false })}
                        className="peer w-full px-4 pt-5 pb-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm placeholder-transparent focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all"
                        placeholder={field.label}
                      />
                      <label htmlFor={field.id}
                        className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                          formState[field.id] || focused[field.id]
                            ? 'top-1.5 text-[10px] text-pink-400 font-semibold'
                            : 'top-3.5 text-sm text-gray-500'
                        }`}>{field.label}</label>
                    </div>
                  ))}

                  {/* Subject select */}
                  <div className="relative">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">I want to:</label>
                    <select value={formState.subject} onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all appearance-none cursor-pointer">
                      {['Book a Service', 'Report an Issue', 'Become a Provider', 'General Query'].map(opt => (
                        <option key={opt} value={opt} className="bg-[#0c0c14] text-white">{opt}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-[38px] text-gray-500 pointer-events-none" />
                  </div>

                  {/* Message textarea */}
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Message</label>
                    <textarea required rows={4} maxLength={500}
                      value={formState.message}
                      onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                      placeholder="How can we help?"
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all resize-none"
                    />
                    <p className="text-right text-xs text-gray-600 mt-1">{formState.message.length}/500</p>
                  </div>

                  {/* Submit button with states */}
                  <button type="submit" disabled={formStatus === 'sending'}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-pink-500/20 transition-all disabled:opacity-70">
                    {formStatus === 'sending' ? (
                      <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending...</>
                    ) : (
                      <>Send Message <Send size={14} /></>
                    )}
                  </button>

                  <p className="text-xs text-gray-600 text-center flex items-center justify-center gap-1">
                    <Shield size={10} /> Your information is private and never shared.
                  </p>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right — FAQ Accordion */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="self-start">
            <div className="mb-6">
              <h3 className="text-xl font-display font-bold text-white">Frequently Asked</h3>
              <p className="text-gray-500 text-sm">Questions</p>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}
                    className={`bg-white/[0.02] rounded-2xl overflow-hidden border transition-all duration-300 ${
                      isOpen ? 'bg-white/[0.05] border-pink-500/30 border-l-[3px] border-l-pink-500' : 'border-white/[0.06]'
                    }`}>
                    <button onClick={() => setOpenFaq(isOpen ? null : i)} className="w-full flex items-center justify-between px-5 py-4 text-left">
                      <span className="text-[14px] font-medium text-white pr-3">{faq.q}</span>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="shrink-0">
                        <ChevronDown size={16} className={isOpen ? 'text-pink-400' : 'text-gray-500'} />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="overflow-hidden">
                          <p className="px-5 pb-4 text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
};

/* ════════════════════════════════════════════════
   9. CTA SECTION — Animated Gradient Mesh
   ════════════════════════════════════════════════ */

const CTASection = () => {
  const navigate = useNavigate();
  return (
    <Section className="py-16 px-5 relative z-[1]">
      <div className="max-w-[1100px] mx-auto">
        <div className="relative rounded-3xl p-12 sm:p-16 overflow-hidden cta-mesh-bg">
          {/* Noise overlay */}
          <div className="absolute inset-0 opacity-[0.04] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWx0ZXI9InVybCgjYSkiIG9wYWNpdHk9IjAuMDUiLz48L3N2Zz4=')] pointer-events-none" />
          {/* Floating orbs */}
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-pink-500/15 blur-[80px] cta-pulse-orb pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-48 h-48 rounded-full bg-blue-500/15 blur-[80px] cta-pulse-orb-delay pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-10 items-center">
            {/* Left content */}
            <div className="text-center lg:text-left">
              {/* Pill */}
              <motion.span initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs text-white font-medium mb-6">
                🎉 Limited Time — First Booking Free
              </motion.span>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-black text-white mb-4 leading-tight">
                Ready to Transform<br />Your Home Life?
              </h2>
              <p className="text-white/70 text-[15px] mb-5 max-w-lg">
                Join 15,000+ satisfied families across India. No commitment required.
              </p>

              {/* Trust micro-points */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-8 justify-center lg:justify-start text-white/50 text-sm">
                <span>✓ No credit card needed</span>
                <span className="text-white/20">·</span>
                <span>✓ Cancel anytime</span>
                <span className="text-white/20">·</span>
                <span>✓ First booking free</span>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
                <button onClick={() => navigate('/register')}
                  className="group px-8 py-4 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 text-white text-[15px] font-bold hover:shadow-lg hover:shadow-pink-500/25 transition-all flex items-center gap-2 btn-shimmer">
                  Start Free Today <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => navigate('/login')}
                  className="px-7 py-4 rounded-full text-[15px] font-medium text-white/80 hover:text-white border border-white/30 hover:border-white/50 transition-all">
                  Sign In
                </button>
              </div>

              {/* Avatar stack */}
              <div className="flex items-center gap-3 mt-8 justify-center lg:justify-start">
                <div className="flex -space-x-2.5">
                  {['AR', 'SK', 'PM', 'NJ', 'VR'].map((init, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/80 to-purple-500/80 flex items-center justify-center text-white text-[9px] font-bold ring-2 ring-black/40">{init}</div>
                  ))}
                </div>
                <span className="text-white/50 text-xs">Join 15,000+ happy families</span>
              </div>
            </div>

            {/* Right — Floating booking confirmation mockup (desktop only) */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="hidden lg:block"
            >
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 min-w-[240px] shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={16} className="text-emerald-400" />
                  <span className="text-white text-sm font-semibold">Booking Confirmed</span>
                </div>
                <p className="text-white font-bold mb-1">Deep Cleaning</p>
                <p className="text-white/60 text-sm mb-3">Today, 3:00 PM</p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-white text-[8px] font-bold">PS</div>
                  <span className="text-white/80 text-sm">Priya S. · Chennai</span>
                </div>
                <div className="pt-3 border-t border-white/10">
                  <span className="text-emerald-400 text-sm font-semibold">₹499 Paid ✓</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </Section>
  );
};

/* ════════════════════════════════════════════════
   10. FOOTER — Premium Redesign
   ════════════════════════════════════════════════ */

const FooterSection = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) { setSubscribed(true); setEmail(''); setTimeout(() => setSubscribed(false), 3000); }
  };

  return (
    <footer className="bg-[#060609] pt-0 pb-8 px-5 relative">
      {/* Gradient top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-pink-500/30 to-transparent" />

      {/* Newsletter strip */}
      <div className="max-w-[1100px] mx-auto py-10 border-b border-white/[0.06]">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400 shrink-0">
            <Mail size={16} className="text-pink-400" />
            <span>Get home care tips & exclusive offers</span>
          </div>
          <form onSubmit={handleSubscribe} className="flex-1 flex gap-2 w-full sm:w-auto">
            <input type="email" required placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-500/50 transition-all" />
            <button type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-pink-500/20 transition-all shrink-0">
              {subscribed ? '✓ Subscribed' : 'Subscribe →'}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto pt-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
          {/* Logo column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-pink to-brand-purple flex items-center justify-center group-hover:shadow-lg group-hover:shadow-pink-500/20 transition-all logo-shimmer-once">
                <span className="text-white font-extrabold text-[12px]">H</span>
              </div>
              <span className="text-white font-display font-bold text-base">HouseWise</span>
            </div>
            <p className="text-[13px] text-gray-600 leading-relaxed mb-1">
              Premium home services,<br />trusted by families across India.
            </p>
            <p className="text-xs text-gray-700 mb-5">Made with ❤️ for Indian families</p>
            <div className="flex gap-2.5">
              {[
                { label: '𝕏', hover: 'hover:text-white' },
                { label: 'in', hover: 'hover:text-blue-400' },
                { label: 'Ig', hover: 'hover:text-pink-400' },
                { label: 'Wa', hover: 'hover:text-green-400' },
              ].map((s, i) => (
                <a key={i} href="#"
                  className={`w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-gray-600 text-[11px] font-bold ${s.hover} hover:bg-white/[0.06] hover:border-white/[0.12] transition-all`}
                >{s.label}</a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {footerLinks.map((group) => (
            <div key={group.title}>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gray-500 mb-4">{group.title}</p>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link}>
                    <span className="text-sm text-gray-500 hover:text-white hover:pl-1 transition-all duration-200 cursor-pointer inline-block">{link}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-700">© {new Date().getFullYear()} HouseWise. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {['Privacy', 'Terms', 'Cookies'].map((link, i) => (
              <span key={i} className="text-xs text-gray-600 hover:text-gray-300 cursor-pointer transition-colors">{link}</span>
            ))}
          </div>
          <p className="text-xs text-gray-700">Built with care in India 🇮🇳</p>
        </div>
      </div>
    </footer>
  );
};

/* ════════════════════════════════════════════════
   GLOBAL — Chat Widget + Scroll-to-Top + Back-to-Top
   ════════════════════════════════════════════════ */

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.95 }}
            className="mb-3 w-80 glass-card rounded-3xl overflow-hidden shadow-2xl shadow-black/60 border border-white/[0.06]"
          >
            <div className="px-6 py-5 bg-gradient-to-r from-brand-pink to-brand-purple">
              <p className="text-white font-bold text-[15px]">Support</p>
              <p className="text-white/70 text-[12px]">We usually reply in minutes</p>
            </div>
            <div className="p-5">
              <div className="bg-white/[0.03] rounded-2xl p-4 mb-4">
                <p className="text-[13px] text-gray-400">Hi! 👋 How can we help you today?</p>
              </div>
              <div className="flex gap-2">
                <input type="text" placeholder="Type a message..."
                  className="glow-input flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[13px] text-white placeholder:text-gray-600 focus:outline-none" />
                <button className="w-10 h-10 rounded-xl bg-gradient-to-r from-brand-pink to-brand-purple flex items-center justify-center shrink-0">
                  <Send size={14} className="text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(!open)}
        className="relative w-14 h-14 rounded-full bg-gradient-to-r from-brand-pink to-brand-purple flex items-center justify-center shadow-lg shadow-brand-pink/30 hover:shadow-brand-pink/50 transition-shadow pulse-glow"
      >
        {open ? <X size={20} className="text-white" /> : <MessageCircle size={20} className="text-white" />}
      </motion.button>
    </div>
  );
};

const BackToTop = () => {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);
  useMotionValueEvent(scrollY, 'change', (y) => setVisible(y > 400));
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => window.__lenis ? window.__lenis.scrollTo(0, { duration: 1.5 }) : window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 left-6 z-50 w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 shadow-lg shadow-pink-500/20 flex items-center justify-center text-white hover:shadow-pink-500/40 transition-all"
        ><ArrowUp size={16} /></motion.button>
      )}
    </AnimatePresence>
  );
};

/* ════════════════════════════════════════════════
   HOME PAGE — MAIN EXPORT
   ════════════════════════════════════════════════ */

const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showEntrance, setShowEntrance] = useState(true);
  const handleEntranceComplete = useCallback(() => setShowEntrance(false), []);

  useEffect(() => {
    if (isAuthenticated) return;
    window.scrollTo(0, 0);
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-white mb-4">Welcome back!</h1>
          <p className="text-gray-400 mb-6">Head to your dashboard to manage your account.</p>
          <button onClick={() => navigate('/customer/dashboard')}
            className="px-7 py-3.5 rounded-full bg-gradient-to-r from-brand-pink to-brand-purple text-white text-sm font-semibold"
          >Go to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {showEntrance && <PageEntrance onComplete={handleEntranceComplete} />}
      </AnimatePresence>
      <CustomCursor />
      <div className={`bg-brand-dark min-h-screen noise-overlay ${showEntrance ? '' : ''}`}>
        <HeroSection />
        <MarqueeBar />
        <Divider />
        <ServicesGrid />
        <Divider />
        <HowItWorks />
        <StatsSection />
        <Divider />
        <TestimonialsSection />
        <Divider />
        <AboutSection />
        <Divider />
        <ContactSection />
        <CTASection />
        <FooterSection />
        <ChatWidget />
        <BackToTop />
      </div>
    </>
  );
};

export default HomePage;
