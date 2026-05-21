import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import EmptyState from '../../components/shared/EmptyState';
import {
  Star, Calendar, MessageCircle, Clock, AlertCircle, CheckCircle,
  Search, ThumbsUp, PenTool, X
} from 'lucide-react';
import { customerAPI } from '../../services/api';

/* ─── Helpers ─── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const getInitials = (n) => (n || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
const GRADS = [
  'linear-gradient(135deg,#FF6B4A,#FF8C5A)', 'linear-gradient(135deg,#3B82F6,#60A5FA)',
  'linear-gradient(135deg,#8B5CF6,#A78BFA)', 'linear-gradient(135deg,#10B981,#34D399)',
  'linear-gradient(135deg,#EC4899,#F472B6)', 'linear-gradient(135deg,#F59E0B,#FBBF24)',
];
const getGrad = (n) => GRADS[(n || '').charCodeAt(0) % GRADS.length];
const CAT_ICONS = { cooking: '🍱', tailoring: '✂️', tuition: '📚', beauty: '💄', cleaning: '🧹', childcare: '👶', eldercare: '🤝', handicrafts: '🎨', catering: '🍽️' };
const getCatIcon = (c) => CAT_ICONS[c?.toLowerCase()] || '⭐';

/* Count-up */
const useCountUp = (end, dur = 600) => {
  const [v, setV] = useState(0);
  const n = typeof end === 'number' ? end : parseFloat(end) || 0;
  useEffect(() => {
    if (n === 0) { setV(0); return; }
    let s; const step = (t) => { if (!s) s = t; const p = Math.min((t - s) / dur, 1); setV((1 - Math.pow(1 - p, 3)) * n); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }, [n, dur]);
  return v;
};

/* Stars */
const Stars = ({ rating, size = 14 }) => (
  <span className="cr-stars">
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} style={{ width: size, height: size, fill: i < Math.round(rating) ? '#F59E0B' : 'transparent', color: i < Math.round(rating) ? '#F59E0B' : '#3a3f4e' }} />
    ))}
  </span>
);

/* Shimmer skeleton */
const Shimmer = ({ className = '' }) => <div className={`cr-shimmer ${className}`} />;
const ReviewsSkeleton = () => (
  <div className="cr-page">
    <Shimmer className="cr-skel-header" />
    <div className="cr-skel-chips"><Shimmer className="cr-skel-chip" /><Shimmer className="cr-skel-chip" /><Shimmer className="cr-skel-chip" /></div>
    <Shimmer className="cr-skel-tabs" />
    {[1, 2, 3].map(i => <Shimmer key={i} className="cr-skel-card" />)}
  </div>
);

/* ═══════════════════════════════════════ */
const CustomerReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const [revRes, pendRes] = await Promise.allSettled([
        customerAPI.getMyReviews({ limit: 100 }),
        customerAPI.getPendingReviews(),
      ]);
      if (revRes.status === 'fulfilled') {
        const d = revRes.value?.data?.reviews || revRes.value?.reviews || [];
        setReviews(Array.isArray(d) ? d : []);
      }
      if (pendRes.status === 'fulfilled') {
        const d = pendRes.value?.data?.pendingReviews || pendRes.value?.pendingReviews || [];
        setPending(Array.isArray(d) ? d : []);
      }
    } catch { setError('Failed to load reviews'); }
    finally { setLoading(false); }
  }, []);

  const location = useLocation();

  // Initial fetch and refetch when returning from review form
  useEffect(() => { 
    fetchData(); 
  }, [fetchData, location.state?.refreshPendingReviews]);

  /* Stats */
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating?.overall || 0), 0) / reviews.length).toFixed(1) : '0.0';
  const animPending = useCountUp(pending.length, 500);
  const animWritten = useCountUp(reviews.length, 500);
  const animAvg = useCountUp(parseFloat(avgRating), 700);
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => { const v = Math.floor(r.rating?.overall || 0); if (dist[v] !== undefined) dist[v]++; });
  const maxDist = Math.max(...Object.values(dist), 1);
  const recommendCount = reviews.filter(r => r.wouldRecommend).length;
  const helpfulTotal = reviews.reduce((s, r) => s + (r.helpfulVotes?.count || 0), 0);

  const getDaysLeft = (b) => {
    const c = new Date(b.completion?.completedAt || b.updatedAt || b.createdAt);
    return Math.max(Math.ceil((c.getTime() + 14 * 86400000 - Date.now()) / 86400000), 0);
  };

  if (loading) return <ReviewsSkeleton />;

  const TABS = [
    { id: 'pending', label: 'Pending Reviews', count: pending.length, color: '#F59E0B' },
    { id: 'written', label: 'Written Reviews', count: reviews.length, color: '#10B981' },
  ];

  return (
    <div className="cr-page">
      {/* ═══ HEADER ═══ */}
      <header className="cr-header cr-section">
        <div className="cr-header-left">
          <h1 className="cr-title">My Reviews</h1>
          <p className="cr-subtitle">Your feedback helps build a better community</p>
        </div>
        <Link to="/customer/bookings?status=completed" className="cr-write-btn">
          <span className="cr-write-shimmer" />
          <PenTool style={{ width: 15, height: 15 }} />
          Write Review
        </Link>
      </header>

      {/* ═══ STAT CHIPS ═══ */}
      <div className="cr-stat-row cr-section">
        <div className="cr-stat-chip cr-stat-amber">
          <Clock style={{ width: 15, height: 15 }} />
          <span className="cr-stat-num">{Math.round(animPending)}</span>
          <span className="cr-stat-label">Pending</span>
        </div>
        <div className="cr-stat-chip cr-stat-green">
          <CheckCircle style={{ width: 15, height: 15 }} />
          <span className="cr-stat-num">{Math.round(animWritten)}</span>
          <span className="cr-stat-label">Written</span>
        </div>
        <div className="cr-stat-chip cr-stat-coral">
          <Star style={{ width: 15, height: 15, fill: '#FF6B4A', color: '#FF6B4A' }} />
          <span className="cr-stat-num">{animAvg.toFixed(1)}</span>
          <span className="cr-stat-label">Avg Given</span>
        </div>
      </div>

      {/* ═══ TAB BAR ═══ */}
      <div className="cr-tabs cr-section">
        {TABS.map(t => (
          <button key={t.id} className={`cr-tab ${tab === t.id ? 'cr-tab-active' : ''}`} onClick={() => setTab(t.id)}>
            {t.id === 'pending' && <span className="cr-tab-dot" style={{ background: t.color }} />}
            {t.label}
            {t.count > 0 && <span className="cr-tab-badge" style={{ background: `${t.color}22`, color: t.color }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {error && (
        <div className="cr-error cr-section">
          <AlertCircle style={{ width: 16, height: 16 }} /> <span>{error}</span>
          <button className="cr-error-retry" onClick={fetchData}>Retry</button>
        </div>
      )}

      {/* ═══ PENDING TAB ═══ */}
      {tab === 'pending' && (
        <div className="cr-tab-content">
          {pending.length > 0 && (
            <div className="cr-nudge cr-section">
              <span className="cr-nudge-icon">⏰</span>
              <span>You have <strong>{pending.length}</strong> service{pending.length !== 1 ? 's' : ''} waiting for your review — your feedback helps others!</span>
            </div>
          )}
          {pending.length === 0 ? (
            <EmptyState
              type="reviews"
              title="All caught up!"
              description="All your completed services have been reviewed"
              actionText="View Bookings"
              actionTo="/customer/bookings"
            />
          ) : (
            <div className="cr-pending-list">
              {pending.map((booking, idx) => {
                const daysLeft = getDaysLeft(booking);
                return (
                  <div key={booking._id} className="cr-pending-card cr-section" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className="cr-pending-thumb">
                      <div className="cr-pending-thumb-bg" style={{ background: getGrad(booking.service?.title) }}>
                        <span className="cr-pending-cat-icon">{getCatIcon(booking.service?.category)}</span>
                      </div>
                    </div>
                    <div className="cr-pending-body">
                      <span className="cr-pending-service">{booking.service?.title || 'Service'}</span>
                      <div className="cr-pending-provider">
                        <span className="cr-pending-avatar" style={{ background: getGrad(booking.provider?.name) }}>{getInitials(booking.provider?.name)}</span>
                        Service by {booking.provider?.name || 'Provider'}
                      </div>
                      <div className="cr-pending-meta">
                        <span className="cr-pending-date"><Calendar style={{ width: 12, height: 12 }} /> Completed {fmt(booking.completion?.completedAt || booking.updatedAt)}</span>
                        {daysLeft > 0 && <span className="cr-pending-countdown">{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</span>}
                      </div>
                    </div>
                    <div className="cr-pending-actions">
                      <span className="cr-pending-pill">⏳ Pending</span>
                      <Link to={`/customer/reviews/new?booking=${booking._id}`} className="cr-pending-cta">
                        <Star style={{ width: 14, height: 14 }} /> Write Review
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ WRITTEN TAB ═══ */}
      {tab === 'written' && (
        <div className="cr-tab-content">
          {reviews.length > 0 && (
            <div className="cr-overview cr-section">
              <div className="cr-overview-rating">
                <span className="cr-overview-num">{avgRating}</span>
                <Stars rating={parseFloat(avgRating)} size={16} />
                <span className="cr-overview-label">Your average rating given</span>
              </div>
              <div className="cr-overview-dist">
                {[5, 4, 3, 2, 1].map(r => (
                  <div key={r} className="cr-dist-row">
                    <span className="cr-dist-label">{r}</span>
                    <Star style={{ width: 11, height: 11, fill: '#F59E0B', color: '#F59E0B' }} />
                    <div className="cr-dist-track"><div className="cr-dist-fill" style={{ width: `${(dist[r] / maxDist) * 100}%` }} /></div>
                    <span className="cr-dist-count">{dist[r]}</span>
                  </div>
                ))}
              </div>
              <div className="cr-overview-chips">
                <span className="cr-overview-chip">😊 {recommendCount} Recommended</span>
                <span className="cr-overview-chip">📝 {reviews.length} Reviews</span>
                {helpfulTotal > 0 && <span className="cr-overview-chip">👍 {helpfulTotal} Helpful</span>}
              </div>
            </div>
          )}
          {reviews.length === 0 ? (
            <EmptyState
              type="reviews"
              title="No reviews yet"
              description="After completing a service, share your experience to help others"
              actionText="Browse Services"
              actionTo="/customer/services"
            />
          ) : (
            <div className="cr-written-list">
              {reviews.map((review, idx) => {
                const isExp = expandedId === review._id;
                const comment = review.comment || '';
                const isLong = comment.length > 200;
                return (
                  <div key={review._id} className="cr-review-card cr-section" style={{ animationDelay: `${idx * 40}ms` }}>
                    <div className="cr-review-top">
                      <div className="cr-review-left">
                        <div className="cr-review-thumb-mini" style={{ background: getGrad(review.service?.title) }}>{getCatIcon(review.service?.category)}</div>
                        <div className="cr-review-info">
                          <span className="cr-review-service">{review.service?.title || 'Service'}</span>
                          <span className="cr-review-cat-pill">{review.service?.category}</span>
                        </div>
                      </div>
                      <div className="cr-review-right-col">
                        <div className="cr-review-provider-row">
                          {review.provider?.profileImage ? (
                            <img src={review.provider.profileImage} alt="" className="cr-review-provider-img" />
                          ) : (
                            <span className="cr-review-provider-avatar" style={{ background: getGrad(review.provider?.name) }}>{getInitials(review.provider?.name)}</span>
                          )}
                          <span className="cr-review-provider-name">{review.provider?.name}</span>
                        </div>
                        <span className="cr-review-verified">✓ Verified</span>
                      </div>
                    </div>
                    <div className="cr-review-meta">
                      <span><Calendar style={{ width: 12, height: 12 }} /> Reviewed {fmt(review.createdAt)}</span>
                    </div>
                    <div className="cr-review-stars-row">
                      <div className="cr-review-overall">
                        <Stars rating={review.rating?.overall || 0} size={18} />
                        <span className="cr-review-overall-num">{review.rating?.overall || 0}/5</span>
                      </div>
                      {review.rating?.quality !== undefined && (
                        <div className="cr-review-sub-ratings">
                          {[{ l: 'Quality', v: review.rating.quality }, { l: 'Punctuality', v: review.rating.punctuality }, { l: 'Communication', v: review.rating.communication }, { l: 'Value', v: review.rating.value }].filter(d => d.v !== undefined).map(d => (
                            <span key={d.l} className="cr-review-sub">{d.l} <Stars rating={d.v} size={10} /> <span className="cr-sub-num">{d.v}</span></span>
                          ))}
                        </div>
                      )}
                    </div>
                    {comment && (
                      <div className="cr-review-comment">
                        <p className={!isExp && isLong ? 'cr-review-truncated' : ''}>"{comment}"</p>
                        {isLong && <button className="cr-review-readmore" onClick={() => setExpandedId(isExp ? null : review._id)}>{isExp ? 'Show less' : 'Read more'}</button>}
                      </div>
                    )}
                    {review.tags?.length > 0 && (
                      <div className="cr-review-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        {review.tags.map(tag => (
                          <span key={tag} className={`cr-review-tag-pill ${tag === 'positive' ? 'cr-tag-positive' : tag === 'negative' ? 'cr-tag-negative' : 'cr-tag-neutral'}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="cr-review-footer">
                      {review.wouldRecommend && <span className="cr-review-recommend">👍 Recommended</span>}
                      {review.helpfulVotes?.count > 0 && <span className="cr-review-helpful"><ThumbsUp style={{ width: 12, height: 12 }} /> {review.helpfulVotes.count} found helpful</span>}
                    </div>
                    {review.providerResponse?.message && (
                      <div className="cr-review-response">
                        <span className="cr-response-label">Response from {review.provider?.name}</span>
                        <p>{review.providerResponse.message}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerReviews;
