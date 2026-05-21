import React, { useState, useEffect, useCallback } from 'react';
import { reviewsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Star, MessageSquare, Calendar, Search, Award, AlertCircle,
  CheckCircle, ChevronDown, ThumbsUp, TrendingUp, Send, X,
  Clock, Shield, Heart, Sparkles
} from 'lucide-react';

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

/* Count-up hook */
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
  <span className="prvw-stars">
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} style={{ width: size, height: size, fill: i < Math.round(rating) ? '#F59E0B' : 'transparent', color: i < Math.round(rating) ? '#F59E0B' : '#3a3f4e' }} />
    ))}
  </span>
);

/* Shimmer skeleton */
const Shimmer = ({ className = '' }) => <div className={`prvw-shimmer ${className}`} />;
const ReviewsSkeleton = () => (
  <div className="prvw-page">
    <Shimmer className="prvw-skel-header" />
    <div className="prvw-skel-stats"><Shimmer className="prvw-skel-stat" /><Shimmer className="prvw-skel-stat" /><Shimmer className="prvw-skel-stat" /><Shimmer className="prvw-skel-stat" /></div>
    <Shimmer className="prvw-skel-bar" />
    {[1, 2, 3].map(i => <Shimmer key={i} className="prvw-skel-card" />)}
  </div>
);

/* ═══════════════════════════════════════ */
const ProviderReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const getSignal = useCallback(() => new AbortController().signal, []);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const signal = getSignal();
      const res = await reviewsAPI.getProviderReviews(user._id, {}, { signal });
      const data = res?.data?.reviews || res?.reviews || [];
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      if (isAbortError(err)) return;
      setError('Failed to load reviews');
    } finally { setLoading(false); }
  }, [user._id, getSignal]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  /* ── Derived stats ── */
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0 ? (reviews.reduce((s, r) => s + (r.rating?.overall || 0), 0) / totalReviews) : 0;
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => { const v = Math.floor(r.rating?.overall || 0); if (dist[v] !== undefined) dist[v]++; });
  const maxDist = Math.max(...Object.values(dist), 1);
  const recommendCount = reviews.filter(r => r.wouldRecommend).length;
  const recommendPct = totalReviews > 0 ? Math.round((recommendCount / totalReviews) * 100) : 0;
  const respondedCount = reviews.filter(r => r.providerResponse?.message).length;

  const animTotal = useCountUp(totalReviews, 500);
  const animAvg = useCountUp(avgRating, 700);
  const animFive = useCountUp(dist[5], 500);
  const animRec = useCountUp(recommendPct, 600);

  /* ── Filters ── */
  const filteredReviews = reviews.filter(r => {
    const matchSearch = !searchTerm ||
      r.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.service?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRating = ratingFilter === 'all' || Math.floor(r.rating?.overall) === parseInt(ratingFilter);
    return matchSearch && matchRating;
  });

  /* ── Reply handler ── */
  const handleReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await reviewsAPI.addProviderResponse(reviewId, { message: replyText.trim() });
      setReplyingTo(null);
      setReplyText('');
      fetchReviews();
    } catch {
      setError('Failed to send response');
    } finally { setReplying(false); }
  };

  if (loading) return <ReviewsSkeleton />;

  const getRatingPct = (r) => totalReviews > 0 ? (dist[r] / totalReviews) * 100 : 0;

  return (
    <div className="prvw-page">

      {/* ═══ HEADER ═══ */}
      <header className="prvw-header prvw-section">
        <div className="prvw-header-left">
          <h1 className="prvw-title">Reviews & Ratings</h1>
          <p className="prvw-subtitle">See what customers are saying about your services</p>
        </div>
        <div className="prvw-header-badge">
          <Shield style={{ width: 14, height: 14 }} />
          <span>{respondedCount}/{totalReviews} Responded</span>
        </div>
      </header>

      {/* ═══ STAT CHIPS ═══ */}
      <div className="prvw-stat-row prvw-section">
        <div className="prvw-stat-chip prvw-sc-amber">
          <Star style={{ width: 16, height: 16, fill: '#F59E0B', color: '#F59E0B' }} />
          <span className="prvw-sc-num">{animAvg.toFixed(1)}</span>
          <span className="prvw-sc-label">Avg Rating</span>
        </div>
        <div className="prvw-stat-chip prvw-sc-blue">
          <MessageSquare style={{ width: 16, height: 16 }} />
          <span className="prvw-sc-num">{Math.round(animTotal)}</span>
          <span className="prvw-sc-label">Total Reviews</span>
        </div>
        <div className="prvw-stat-chip prvw-sc-green">
          <Award style={{ width: 16, height: 16 }} />
          <span className="prvw-sc-num">{Math.round(animFive)}</span>
          <span className="prvw-sc-label">5-Star</span>
        </div>
        <div className="prvw-stat-chip prvw-sc-pink">
          <Heart style={{ width: 16, height: 16 }} />
          <span className="prvw-sc-num">{Math.round(animRec)}%</span>
          <span className="prvw-sc-label">Recommend</span>
        </div>
      </div>

      {/* ═══ OVERVIEW CARD ═══ */}
      <div className="prvw-overview prvw-section">
        <div className="prvw-ov-rating">
          <span className="prvw-ov-num">{avgRating.toFixed(1)}</span>
          <Stars rating={avgRating} size={16} />
          <span className="prvw-ov-label">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</span>
        </div>
        <div className="prvw-ov-dist">
          {[5, 4, 3, 2, 1].map(r => (
            <div key={r} className="prvw-dist-row">
              <span className="prvw-dist-label">{r}</span>
              <Star style={{ width: 11, height: 11, fill: '#F59E0B', color: '#F59E0B' }} />
              <div className="prvw-dist-track"><div className="prvw-dist-fill" style={{ width: `${(dist[r] / maxDist) * 100}%` }} /></div>
              <span className="prvw-dist-count">{dist[r]}</span>
              <span className="prvw-dist-pct">{Math.round(getRatingPct(r))}%</span>
            </div>
          ))}
        </div>
        <div className="prvw-ov-insights">
          <span className="prvw-ov-insight">😊 {recommendCount} would recommend</span>
          <span className="prvw-ov-insight">💬 {respondedCount} responded</span>
          <span className="prvw-ov-insight">⭐ {dist[5] + dist[4]} positive reviews</span>
        </div>
      </div>

      {/* ═══ FILTER BAR ═══ */}
      <div className="prvw-filter-section prvw-section">
        <div className="prvw-search-wrap">
          <Search style={{ width: 16, height: 16 }} className="prvw-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, service or comment..."
            className="prvw-search-input"
          />
          {searchTerm && (
            <button className="prvw-search-clear" onClick={() => setSearchTerm('')}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
        <div className="prvw-filter-pills">
          <button className={`prvw-pill ${ratingFilter === 'all' ? 'prvw-pill-active' : ''}`} onClick={() => setRatingFilter('all')}>All</button>
          {[5, 4, 3, 2, 1].map(r => (
            <button key={r} className={`prvw-pill ${ratingFilter === String(r) ? 'prvw-pill-active' : ''}`} onClick={() => setRatingFilter(String(r))}>
              {r} <Star style={{ width: 11, height: 11, fill: '#F59E0B', color: '#F59E0B' }} />
              {dist[r] > 0 && <span className="prvw-pill-count">{dist[r]}</span>}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="prvw-error prvw-section">
          <AlertCircle style={{ width: 16, height: 16 }} /> <span>{error}</span>
          <button className="prvw-error-retry" onClick={fetchReviews}>Retry</button>
        </div>
      )}

      {/* ═══ RESULTS COUNT ═══ */}
      {!error && (
        <div className="prvw-results-count prvw-section">
          Showing <strong>{filteredReviews.length}</strong> of {totalReviews} review{totalReviews !== 1 ? 's' : ''}
          {ratingFilter !== 'all' && <span className="prvw-active-filter">{ratingFilter} star{parseInt(ratingFilter) !== 1 ? 's' : ''} <button onClick={() => setRatingFilter('all')}>×</button></span>}
        </div>
      )}

      {/* ═══ EMPTY STATE ═══ */}
      {filteredReviews.length === 0 && !error && (
        <div className="prvw-empty prvw-section">
          <MessageSquare style={{ width: 56, height: 56, color: '#3a3f4e' }} />
          <h3 className="prvw-empty-title">{reviews.length === 0 ? 'No reviews yet' : 'No reviews match your filters'}</h3>
          <p className="prvw-empty-sub">{reviews.length === 0 ? 'Complete some services to start receiving reviews' : 'Try adjusting your search or filter criteria'}</p>
          {reviews.length > 0 && (
            <button className="prvw-clear-btn" onClick={() => { setSearchTerm(''); setRatingFilter('all'); }}>Clear Filters</button>
          )}
        </div>
      )}

      {/* ═══ REVIEWS LIST ═══ */}
      <div className="prvw-list">
        {filteredReviews.map((review, idx) => {
          const custName = review.customer?.name || 'Customer';
          const isExp = expandedId === review._id;
          const comment = review.comment || '';
          const isLong = comment.length > 200;
          const hasResponse = !!review.providerResponse?.message;
          const isReplying = replyingTo === review._id;

          return (
            <div key={review._id} className="prvw-card prvw-section" style={{ animationDelay: `${idx * 40}ms` }}>
              {/* Card header */}
              <div className="prvw-card-top">
                <div className="prvw-card-left">
                  {review.customer?.profileImage ? (
                    <img src={review.customer.profileImage} alt={custName} className="prvw-card-avatar-img" />
                  ) : (
                    <div className="prvw-card-avatar" style={{ background: getGrad(custName) }}>
                      {getInitials(custName)}
                    </div>
                  )}
                  <div className="prvw-card-info">
                    <span className="prvw-card-name">{custName}</span>
                    <div className="prvw-card-rating-row">
                      <Stars rating={review.rating?.overall || 0} size={14} />
                      <span className="prvw-card-rating-num">{review.rating?.overall || 0}/5</span>
                    </div>
                  </div>
                </div>
                <div className="prvw-card-right">
                  <div className="prvw-card-date">
                    <Calendar style={{ width: 12, height: 12 }} /> {fmt(review.createdAt)}
                  </div>
                  {review.wouldRecommend && <span className="prvw-card-rec-badge">👍 Recommends</span>}
                </div>
              </div>

              {/* Service tag */}
              {review.service && (
                <div className="prvw-card-service-tag">
                  <span className="prvw-card-cat-icon">{getCatIcon(review.service?.category)}</span>
                  <span className="prvw-card-service-name">{review.service.title}</span>
                  <span className="prvw-card-service-cat">{review.service.category}</span>
                </div>
              )}

              {/* Comment */}
              {comment && (
                <div className="prvw-card-comment-wrap">
                  <p className={`prvw-card-comment ${!isExp && isLong ? 'prvw-card-truncated' : ''}`}>"{comment}"</p>
                  {isLong && (
                    <button className="prvw-card-readmore" onClick={() => setExpandedId(isExp ? null : review._id)}>
                      {isExp ? 'Show less' : 'Read more'}
                    </button>
                  )}
                </div>
              )}

              {/* Pros / tags */}
              {review.pros && review.pros.length > 0 && (
                <div className="prvw-card-tags">
                  {review.pros.map((tag, i) => (
                    <span key={i} className="prvw-card-tag"><CheckCircle style={{ width: 10, height: 10 }} /> {tag}</span>
                  ))}
                </div>
              )}

              {/* Sub-ratings */}
              {review.rating?.quality !== undefined && (
                <div className="prvw-card-details">
                  {[
                    { l: 'Quality', v: review.rating.quality, icon: '✨' },
                    { l: 'Punctuality', v: review.rating.punctuality, icon: '⏰' },
                    { l: 'Communication', v: review.rating.communication, icon: '💬' },
                    { l: 'Value', v: review.rating.value, icon: '💰' },
                  ].filter(d => d.v !== undefined).map(d => (
                    <div key={d.l} className="prvw-detail-item">
                      <span className="prvw-detail-icon">{d.icon}</span>
                      <span className="prvw-detail-label">{d.l}</span>
                      <Stars rating={d.v} size={11} />
                      <span className="prvw-detail-num">{d.v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer: helpful + reply button */}
              <div className="prvw-card-footer">
                {review.helpfulVotes?.count > 0 && (
                  <span className="prvw-card-helpful"><ThumbsUp style={{ width: 12, height: 12 }} /> {review.helpfulVotes.count} found helpful</span>
                )}
                <div className="prvw-card-footer-actions">
                  {hasResponse ? (
                    <span className="prvw-card-responded"><CheckCircle style={{ width: 12, height: 12 }} /> Responded</span>
                  ) : (
                    <button className="prvw-reply-toggle" onClick={() => { setReplyingTo(isReplying ? null : review._id); setReplyText(''); }}>
                      <Send style={{ width: 12, height: 12 }} /> {isReplying ? 'Cancel' : 'Reply'}
                    </button>
                  )}
                </div>
              </div>

              {/* Provider response (existing) */}
              {hasResponse && (
                <div className="prvw-card-response">
                  <span className="prvw-response-label">Your response</span>
                  <p>{review.providerResponse.message}</p>
                  <span className="prvw-response-date">{fmt(review.providerResponse.respondedAt)}</span>
                </div>
              )}

              {/* Reply form (inline) */}
              {isReplying && !hasResponse && (
                <div className="prvw-reply-form">
                  <textarea
                    className="prvw-reply-textarea"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a thoughtful response to this review..."
                    rows={3}
                    maxLength={500}
                  />
                  <div className="prvw-reply-actions">
                    <span className="prvw-reply-count">{replyText.length}/500</span>
                    <button className="prvw-reply-cancel" onClick={() => { setReplyingTo(null); setReplyText(''); }}>Cancel</button>
                    <button className="prvw-reply-send" disabled={!replyText.trim() || replying} onClick={() => handleReply(review._id)}>
                      {replying ? <span className="prvw-reply-spinner" /> : <Send style={{ width: 13, height: 13 }} />}
                      {replying ? 'Sending...' : 'Send Response'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProviderReviews;
