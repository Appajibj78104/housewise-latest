import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Star, X, CheckCircle, ArrowRight, ArrowUpRight, ChevronRight, Sparkles, Heart, Shield, Zap, Clock, MapPin, Search } from 'lucide-react';
import { Section, SectionLabel, SectionHeading } from './SectionPrimitives';
import { LANDING_SERVICES } from '../data/landingData';

const landingServices = LANDING_SERVICES;
const serviceCategories = ['All','Cleaning','Cooking','Care','Education','Beauty','Tailoring','Childcare','Handicrafts','Catering'];

/* â”€â”€ Service Detail Modal â”€â”€ */
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
              <img src={service.image} alt={service.name} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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
            <p className="text-brand-pink font-bold text-lg mb-4">From â‚¹{service.price}</p>
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
                      <p className="text-[10px] text-gray-500">â˜… {p.rating}</p>
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
              Book Now â€” â‚¹{service.price} <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
});
ServiceModal.displayName = 'ServiceModal';

/* â”€â”€ Individual Service Card â”€â”€ */
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
          From â‚¹{service.price}
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
                  <span>â€¢</span>
                  <span>{service.bookings.toLocaleString()}+ bookings</span>
                  {service.availableToday && <><span>â€¢</span><span className="text-emerald-400">Available Today</span></>}
                </div>
                {/* Laundry process timeline */}
                {service.hasProcess && (
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-3 px-1">
                    {['ðŸ“¦ Pickup', 'ðŸ§º Wash', 'ðŸ‘” Iron', 'ðŸšš Deliver'].map((step, si) => (
                      <span key={si} className="flex items-center gap-1">
                        {step}
                        {si < 3 && <span className="text-gray-600 mx-0.5">â†’</span>}
                      </span>
                    ))}
                  </div>
                )}
                {/* Book button */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-pink to-brand-purple text-center text-[12px] font-semibold text-white shadow-lg shadow-brand-pink/20">
                    Book Now â†’
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

/* â”€â”€ Main ServicesGrid â”€â”€ */
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
        {/* â”€â”€ Header â”€â”€ */}
        <div className="text-center mb-6">
          <SectionLabel>Services</SectionLabel>
          <SectionHeading sub="Expert home care services tailored to your lifestyle â€” from cleaning to catering.">
            Everything Your Home <span className="gradient-shift-text">Needs</span>
          </SectionHeading>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {['ðŸ§¹ 10 Services Available', 'ðŸ“ 50+ Cities', 'âš¡ Book in 2 min'].map((pill, i) => (
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
              {/* Desktop masonry â€” using CSS grid with named areas */}
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
              {/* Mobile / Tablet â€” single column */}
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
              <div className="text-5xl mb-4">ðŸ”</div>
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


export default ServicesGrid;

