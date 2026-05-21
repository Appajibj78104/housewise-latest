import React, { useState, useRef, memo } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import { CheckCircle, Search, Zap, Clock, Star, MapPin, ArrowRight, TrendingUp, Award, ChevronRight } from 'lucide-react';
import { Section, SectionLabel, SectionHeading } from './SectionPrimitives';


/* â”€â”€ Animated check mark â”€â”€ */
const AnimCheck = ({ delay = 0 }) => (
  <motion.span
    initial={{ opacity: 0, scale: 0 }} whileInView={{ opacity: 1, scale: 1 }}
    viewport={{ once: true }} transition={{ delay, type: 'spring', stiffness: 300 }}
    className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-pink/15 shrink-0"
  >
    <CheckCircle size={12} className="text-brand-pink" />
  </motion.span>
);

/* â”€â”€ Mockup: Browse Services search UI â”€â”€ */
const BrowseMockup = () => {
  const results = [
    { emoji: 'ðŸ§¹', label: 'Deep Cleaning', price: 'â‚¹499' },
    { emoji: 'ðŸ³', label: 'Home Cooking', price: 'â‚¹299' },
    { emoji: 'ðŸ‘´', label: 'Elderly Care', price: 'â‚¹599' },
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

/* â”€â”€ Mockup: Calendar booking UI â”€â”€ */
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
          Confirm Booking â†’
        </div>
      </motion.div>
    </div>
  );
};

/* â”€â”€ Mockup: Review & rating UI â”€â”€ */
const ReviewMockup = () => (
  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
    {/* Provider row */}
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-purple/60 to-brand-pink/60 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/10">PS</div>
      <div>
        <p className="text-[13px] text-white font-semibold">Priya S.</p>
        <p className="text-[11px] text-gray-500">Deep Cleaning Â· Chennai</p>
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
      <span className="text-[13px] font-bold text-emerald-400 flex items-center gap-1.5">â‚¹499 <CheckCircle size={12} /></span>
    </motion.div>
  </div>
);

/* â”€â”€ Mockup: Provider listing / earnings UI â”€â”€ */
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
      {[{ label: 'Bookings', val: '24' }, { label: 'Rating', val: '4.9â˜…' }, { label: 'Earned', val: 'â‚¹14.8K' }].map((s, i) => (
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
        <p className="text-[12px] text-white font-medium truncate">Next: Deep Cleaning â€” Raj K.</p>
        <p className="text-[10px] text-gray-500">Today, 4:00 PM Â· â‚¹499</p>
      </div>
      <ArrowRight size={12} className="text-gray-500 shrink-0" />
    </motion.div>
  </div>
);

/* â”€â”€ Mockup: Provider service listing UI â”€â”€ */
const ProviderServicesMockup = () => (
  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
    <div className="flex items-center justify-between mb-4">
      <span className="text-[13px] text-white font-semibold">My Services</span>
      <span className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-brand-pink to-brand-purple text-white text-[10px] font-semibold">+ Add New</span>
    </div>
    {[
      { name: 'Deep Cleaning', cat: 'ðŸ§¹ Cleaning', price: 'â‚¹499', status: 'Active', statusColor: 'emerald' },
      { name: 'Home Cooking', cat: 'ðŸ³ Cooking', price: 'â‚¹299', status: 'Active', statusColor: 'emerald' },
      { name: 'Elderly Care', cat: 'ðŸ›¡ï¸ Care', price: 'â‚¹599', status: 'Paused', statusColor: 'yellow' },
    ].map((s, i) => (
      <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.12 }}
        className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-2 hover:bg-white/[0.04] transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-white font-medium">{s.name}</p>
          <p className="text-[10px] text-gray-500">{s.cat} Â· {s.price}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${s.statusColor === 'emerald' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-yellow-400/10 text-yellow-400'}`}>{s.status}</span>
      </motion.div>
    ))}
  </div>
);

/* â”€â”€ Mockup: Provider booking management UI â”€â”€ */
const ProviderBookingsMockup = () => (
  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
    <p className="text-[13px] text-white font-semibold mb-3">Incoming Requests</p>
    {[
      { customer: 'Raj K.', service: 'Deep Cleaning', time: 'Today, 4 PM', amount: 'â‚¹499', action: 'Accept' },
      { customer: 'Sneha M.', service: 'Cooking', time: 'Tomorrow, 10 AM', amount: 'â‚¹299', action: 'Accept' },
    ].map((b, i) => (
      <motion.div key={i} initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.15 }}
        className="px-3 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[12px] text-white font-medium">{b.customer} â€” {b.service}</p>
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
      <span className="text-[11px] text-gray-400">3 bookings completed today Â· <span className="text-emerald-400 font-medium">â‚¹1,397 earned</span></span>
    </div>
  </div>
);

/* â”€â”€ Mockup: Provider earnings/reviews UI â”€â”€ */
const ProviderEarningsMockup = () => (
  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5 shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
    <p className="text-[13px] text-white font-semibold mb-3">This Month</p>
    {/* Earnings bar */}
    <div className="grid grid-cols-2 gap-3 mb-4">
      {[{ label: 'Total Earned', val: 'â‚¹14,800', icon: 'ðŸ’°' }, { label: 'Avg. Rating', val: '4.9 â˜…', icon: 'â­' }].map((s, i) => (
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
      <p className="text-[11px] text-gray-300 italic">"Amazing service! Will book again." â€” Raj K.</p>
      <div className="flex gap-0.5 mt-1">{[...Array(5)].map((_, i) => <Star key={i} size={10} className="text-yellow-400 fill-yellow-400" />)}</div>
    </motion.div>
  </div>
);

/* â”€â”€ Mockup: Customer list / match UI â”€â”€ */
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
          <p className="text-[12px] text-white font-medium truncate">{p.name} Â· {p.service}</p>
          <p className="text-[10px] text-gray-500">{p.dist} Â· â˜… {p.rating}</p>
        </div>
        <ChevronRight size={12} className="text-gray-600 shrink-0" />
      </motion.div>
    ))}
  </div>
);

/* â”€â”€ Timeline step node â”€â”€ */
const nodeColors = ['from-blue-500 to-purple-500', 'from-pink-500 to-orange-500', 'from-yellow-500 to-orange-500', 'from-emerald-500 to-blue-500', 'from-purple-500 to-pink-500', 'from-rose-500 to-orange-500', 'from-cyan-500 to-blue-500', 'from-amber-500 to-yellow-500'];

const TimelineNode = ({ num, colorIdx }) => (
  <div className="relative flex items-center justify-center">
    <span className="absolute animate-ping w-12 h-12 rounded-full bg-white/5" />
    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${nodeColors[colorIdx]} flex items-center justify-center shadow-lg z-10`}>
      <span className="text-white font-bold text-sm">{num}</span>
    </div>
  </div>
);

/* â”€â”€ Main HowItWorks component â”€â”€ */
const HowItWorks = () => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const spineScale = useTransform(scrollYProgress, [0.1, 0.9], [0, 1]);
  const [activeRole, setActiveRole] = useState('customer');

  /* All 5 steps with dual customer/provider tracks */
  const timeline = [
    {
      num: '01', title: 'Browse & Discover Services',
      desc: 'Explore a curated catalog of 20+ verified home services â€” from deep cleaning to elderly care â€” across 50+ cities.',
      icon: 'ðŸ”',
      iconGrad: 'from-blue-500/20 to-purple-500/20 border-blue-500/30',
      checks: ['Filter by category, city, and price', 'View real-time provider availability', 'Read verified customer reviews'],
      mockup: <BrowseMockup />,
      side: 'left',
      who: 'customer',
      colorIdx: 0,
    },
    {
      num: '02', title: 'Book a Provider Instantly',
      desc: 'Choose your preferred time slot and get instant booking confirmation â€” no calls, no waiting.',
      icon: 'ðŸ“…',
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
      icon: 'âœ¨',
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
      icon: 'â­',
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
      icon: 'ðŸ“‹',
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
      icon: 'ðŸ“±',
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
      icon: 'â­',
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
      icon: 'ðŸ“Š',
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
        {/* â”€â”€ Header row: heading left, helper + tabs right â”€â”€ */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-16">
          {/* Left â€” label + heading */}
          <div>
            <SectionLabel>Process</SectionLabel>
            <SectionHeading sub="From browsing to booking to review â€” here's how HouseWise works for customers and providers.">
              How It <span className="gradient-shift-text">Works</span>
            </SectionHeading>
          </div>

          {/* Right â€” helper text + role toggle tabs */}
          <div className="flex flex-col items-end gap-5 pt-2 shrink-0">
            <p className="text-gray-400 text-sm max-w-xs text-right ml-auto">
              Select a tab below to see how it works â€” for{' '}
              <strong className="text-white">customers booking a service</strong>
              {' '}or{' '}
              <strong className="text-white">providers growing their business</strong>.
            </p>

            {/* â”€â”€ Role toggle tabs â”€â”€ */}
            <div className="flex items-center gap-3 justify-end">
              {[
                { key: 'customer', label: 'ðŸ  For Customers', sub: '4 easy steps', grad: 'from-brand-pink to-brand-purple' },
                { key: 'provider', label: 'ðŸ’¼ For Providers', sub: '4 easy steps', grad: 'from-brand-purple to-brand-blue' },
              ].map((r) => {
                const isActive = activeRole === r.key;
                return (
                  <motion.button key={r.key} onClick={() => setActiveRole(r.key)}
                    initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className={`relative text-center min-w-[160px] px-7 py-3.5 rounded-2xl border transition-all duration-300 cursor-pointer ${
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
          </div>
        </div>

        {/* â”€â”€ Desktop zigzag timeline â”€â”€ */}
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

        {/* â”€â”€ Mobile vertical stepper â”€â”€ */}
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

/* â”€â”€ Step content panel (reused desktop + mobile) â”€â”€ */
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


export default HowItWorks;

