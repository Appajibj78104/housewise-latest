import React from 'react';

const marqueeItems = [
  '98% Satisfaction Rate', '24/7 Customer Support', 'Same-Day Service Available',
  '100% Satisfaction Guarantee', 'Trusted by 15,000+ Families', '⭐ 4.9 Average Rating',
  '50+ Cities in India', '2,500+ Verified Providers',
];

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

export default MarqueeBar;
