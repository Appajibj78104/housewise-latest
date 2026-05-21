import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Star, MapPin } from 'lucide-react';
import CountUp from 'react-countup';
import { useInView as useInViewIO } from 'react-intersection-observer';
import { Section } from './SectionPrimitives';

const statsData = [
  { value: 15000, start: 12000, suffix: '+', label: 'Happy Customers', icon: Users, iconGrad: 'from-pink-500/20 to-rose-500/20 border-pink-500/30', iconColor: 'text-pink-400', growth: '↑ +2,300 this month', growthColor: 'text-emerald-400' },
  { value: 2500, start: 2200, suffix: '+', label: 'Verified Providers', icon: Shield, iconGrad: 'from-purple-500/20 to-blue-500/20 border-purple-500/30', iconColor: 'text-purple-400', growth: '↑ +180 new providers', growthColor: 'text-emerald-400' },
  { value: 98, start: 94, suffix: '%', label: 'Satisfaction Rate', icon: Star, iconGrad: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30', iconColor: 'text-yellow-400', growth: 'Based on 15K+ reviews', growthColor: 'text-gray-500' },
  { value: 50, start: 40, suffix: '+', label: 'Cities Covered', icon: MapPin, iconGrad: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30', iconColor: 'text-teal-400', growth: '↑ 8 new cities in 2026', growthColor: 'text-emerald-400' },
];

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

export default StatsSection;
