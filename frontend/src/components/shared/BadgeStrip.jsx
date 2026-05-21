import { ShieldCheck, Star, Zap, Clock, Heart, Crown } from 'lucide-react';

/**
 * BadgeStrip — renders premium trust badges for a provider.
 * Codes (kept in sync with backend earnedBadges + jobs/badgeEvaluator):
 *   verified_kyc, top_rated, quick_responder, on_time_pro, repeat_hero, super_provider
 */

const BADGE_META = {
  verified_kyc:    { label: 'Verified',         icon: ShieldCheck, color: '#10b981' },
  top_rated:       { label: 'Top Rated',        icon: Star,        color: '#f59e0b' },
  quick_responder: { label: 'Quick Responder',  icon: Zap,         color: '#06b6d4' },
  on_time_pro:     { label: 'On-Time Pro',      icon: Clock,       color: '#6366f1' },
  repeat_hero:     { label: 'Repeat Hero',      icon: Heart,       color: '#ec4899' },
  super_provider:  { label: 'Super Provider',   icon: Crown,       color: '#a855f7' },
};

export default function BadgeStrip({ badges = [], compact = false, max = 4 }) {
  if (!Array.isArray(badges) || badges.length === 0) return null;
  const visible = badges.filter(b => BADGE_META[b]).slice(0, max);
  if (visible.length === 0) return null;

  return (
    <div className={`bs-strip ${compact ? 'bs-compact' : ''}`}>
      {visible.map((b) => {
        const meta = BADGE_META[b];
        const Icon = meta.icon;
        return (
          <span
            key={b}
            className="bs-pill"
            title={meta.label}
            style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}15` }}
          >
            <Icon size={compact ? 11 : 13} />
            {!compact && <span>{meta.label}</span>}
          </span>
        );
      })}
      {badges.length > max && <span className="bs-more">+{badges.length - max}</span>}
    </div>
  );
}
