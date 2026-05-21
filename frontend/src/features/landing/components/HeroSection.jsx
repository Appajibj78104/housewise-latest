import React, { useState, useRef, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Heart, Shield, Clock, Sparkles, MapPin, CheckCircle, TrendingUp, ChevronDown, Play } from 'lucide-react';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FANNED CARD STACK â€” Playing-cards inspired layout
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const fannedCards = [
  {
    id: 0, icon: Sparkles, title: 'Deep Cleaning', price: 'â‚¹499',
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
    id: 1, icon: Heart, title: 'Home Cooking', price: 'â‚¹299',
    desc: 'Authentic home-cooked meals by skilled housewives â€” fresh, healthy, daily.',
    rating: '4.8', reviews: '94', gradient: 'from-brand-purple to-brand-blue',
    provider: { initials: 'MR', name: 'Meena R.', gradient: 'from-brand-blue/60 to-brand-purple/60' },
    location: '2.3 km away', time: '30 min arrival',
    badge: { text: 'Available Now', color: 'emerald', live: true },
    meta: 'Verified âœ“',
    tags: ['Custom Menu', 'Diet-specific', 'Fresh'],
    liveDot: true,
    customers: '2,400+ orders this month',
  },
  {
    id: 2, icon: Shield, title: 'Elderly Care', price: 'â‚¹599',
    desc: 'Compassionate companionship and attentive care for senior family members.',
    rating: '5.0', reviews: '76', gradient: 'from-brand-blue to-brand-pink',
    provider: { initials: 'AD', name: 'Anita D.', gradient: 'from-brand-blue to-brand-pink', role: 'Caregiver' },
    location: 'Mumbai', time: 'Tomorrow, 10 AM',
    badge: { text: 'Scheduled', color: 'blue', icon: Clock },
    meta: 'Booking #HW-2103',
    tags: ['Trained', 'Health Monitor', 'Flexible Hrs'],
    review: '"Exceptional care â€” like having family!"',
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

const FannedCard = memo(({ card, pos, index }) => {
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
            background: isFront ? 'rgba(15, 15, 24, 0.65)' : 'rgba(12, 12, 20, 0.45)',
            backdropFilter: isFront ? 'blur(20px) saturate(180%)' : 'blur(14px) saturate(160%)',
            WebkitBackdropFilter: isFront ? 'blur(20px) saturate(180%)' : 'blur(14px) saturate(160%)',
            border: isFront ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: hovered
              ? '0 12px 60px rgba(255,60,172,0.15), 0 4px 20px rgba(0,0,0,0.3)'
              : isFront
                ? '0 0 0 1px rgba(255,255,255,0.07), 0 8px 32px rgba(0,0,0,0.5), 0 24px 60px rgba(0,0,0,0.4), 0 0 60px rgba(255,60,172,0.10), inset 0 1px 0 rgba(255,255,255,0.09)'
                : '0 4px 16px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
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
                  <span className="text-brand-orange text-[11px]">â˜…</span>
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
                <span key={ti} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '8px', color: 'rgba(200,200,220,0.85)', fontSize: '11px', padding: '3px 10px' }}>{tag}</span>
              ))}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent)', width: '100%', margin: '8px 0' }} />

          {/* Provider */}
          <div className="flex items-center gap-2.5 mb-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '8px 10px' }}>
            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${card.provider.gradient} flex items-center justify-center text-white text-[10px] font-bold shrink-0 ring-1 ring-white/10`}>
              {card.provider.initials}
            </div>
            <span className="text-[12px] text-gray-200 font-medium">{card.provider.name}</span>
            <span className="text-[10px] text-gray-600">â€¢</span>
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
              {card.reviewBy && <p className="text-[9px] text-gray-600 mt-1 pl-3">â€” {card.reviewBy}</p>}
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
            <div className="flex items-center gap-1.5 pt-2" style={{ borderTop: '1px solid transparent', borderImage: 'linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent) 1' }}>
              <Shield size={10} className="text-emerald-400" />
              <span className="text-[9px] text-gray-500 font-medium">{card.satisfaction}</span>
            </div>
          )}
          {card.customers && (
            <div className="flex items-center gap-1.5 pt-2" style={{ borderTop: '1px solid transparent', borderImage: 'linear-gradient(to right, transparent, rgba(255,255,255,0.07), transparent) 1' }}>
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

const FannedCardStack = () => (
  <>
    {/* Desktop */}
    <div className="hidden lg:flex items-center justify-center relative h-[580px] -ml-40">
      {/* Glow orb */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-brand-pink/15 blur-[120px] pointer-events-none" />
      {fannedCards.map((card, i) => (
        <FannedCard key={card.id} card={card} pos={fanPositions[i]} index={i} />
      ))}
    </div>
    {/* Mobile â€” single center card */}
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
                  <span className="text-brand-orange text-[11px]">â˜…</span>
                  <span className="text-[12px] text-gray-300">4.8</span>
                  <span className="text-[10px] text-gray-500">(94 reviews)</span>
                </div>
              </div>
            </div>
            <span className="text-brand-pink font-bold text-[18px]">â‚¹299</span>
          </div>
          <div className="h-px w-full bg-white/[0.06] mb-3" />
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue/60 to-brand-purple/60 flex items-center justify-center text-white text-[10px] font-bold shrink-0 ring-1 ring-white/10">MR</div>
            <span className="text-[12px] text-gray-200 font-medium">Meena R.</span>
            <span className="text-[10px] text-gray-600">â€¢</span>
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
            <span className="text-[10px] text-gray-600">Verified âœ“</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  </>
);

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   1. HERO SECTION â€” Cinematic Full-Screen
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

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
          {/* Left â€” content */}
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
              Connect with verified, skilled housewives for cleaning, cooking, eldercare, tutoring, and more â€” all at your fingertips.
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
              <span className="text-gray-600">Â·</span>
              <span className="text-xs font-medium text-gray-400">98% Rating</span>
              <span className="text-gray-600">Â·</span>
              <span className="text-xs font-medium text-gray-400">50+ Cities</span>
            </div>

            {/* Keyboard shortcut hint */}
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
              className="hidden sm:block text-xs text-gray-600 mt-4"
            >
              Press âŒ¨ G to get started Â· âŒ¨ W to watch demo
            </motion.p>
          </div>

          {/* Right â€” Fanned Card Stack */}
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


export default HeroSection;

