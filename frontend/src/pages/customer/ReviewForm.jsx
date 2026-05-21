import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Star, ArrowLeft, CheckCircle, AlertCircle, Calendar, Clock,
  Send, Sparkles, Shield, Heart, Camera, X as XIcon
} from 'lucide-react';
import { customerAPI } from '../../services/api';

/* ─── Helpers ─── */
const getInitials = (n) => (n || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
const GRADS = [
  'linear-gradient(135deg,#FF6B4A,#FF8C5A)', 'linear-gradient(135deg,#3B82F6,#60A5FA)',
  'linear-gradient(135deg,#8B5CF6,#A78BFA)', 'linear-gradient(135deg,#10B981,#34D399)',
  'linear-gradient(135deg,#EC4899,#F472B6)', 'linear-gradient(135deg,#F59E0B,#FBBF24)',
];
const getGrad = (n) => GRADS[(n || '').charCodeAt(0) % GRADS.length];
const CAT_ICONS = { cooking: '🍱', tailoring: '✂️', tuition: '📚', beauty: '💄', cleaning: '🧹', childcare: '👶', eldercare: '🤝', handicrafts: '🎨', catering: '🍽️' };
const getCatIcon = (c) => CAT_ICONS[c?.toLowerCase()] || '⭐';

const MOODS = [
  { emoji: '😡', label: 'Terrible', star: 1, color: '#EF4444' },
  { emoji: '😕', label: 'Poor', star: 2, color: '#F97316' },
  { emoji: '😐', label: 'Okay', star: 3, color: '#EAB308' },
  { emoji: '😊', label: 'Great', star: 4, color: '#22C55E' },
  { emoji: '🤩', label: 'Amazing', star: 5, color: '#10B981' },
];

const QUICK_TAGS = [
  'Professional', 'On time', 'Friendly', 'Great quality', 'Good value',
  'Clean work', 'Fast service', 'Skilled', 'Reliable', 'Patient',
  'Went extra mile', 'Would hire again'
];

const CATEGORIES = [
  { key: 'quality', label: 'Quality', icon: '✨', desc: 'Quality of work' },
  { key: 'punctuality', label: 'Punctuality', icon: '⏰', desc: 'On-time arrival' },
  { key: 'communication', label: 'Communication', icon: '💬', desc: 'Clear & professional' },
  { key: 'value', label: 'Value', icon: '💰', desc: 'Worth the price' },
];

/* Interactive star row */
const StarInput = ({ value, onChange, size = 28 }) => {
  const [hover, setHover] = useState(0);
  return (
    <span className="rf-star-input" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: 5 }, (_, i) => {
        const idx = i + 1;
        const active = idx <= (hover || value);
        return (
          <button key={i} type="button" className="rf-star-btn"
            onMouseEnter={() => setHover(idx)} onClick={() => onChange(idx)}>
            <Star style={{ width: size, height: size, fill: active ? '#F59E0B' : 'transparent', color: active ? '#F59E0B' : '#3a3f4e', transition: 'all .15s' }} />
          </button>
        );
      })}
    </span>
  );
};

/* ═══════════════════════════════════════ */
const ReviewForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    rating: { overall: 0, quality: 0, punctuality: 0, communication: 0, value: 0 },
    comment: '',
    wouldRecommend: true,
    tags: [],
  });
  const [photos, setPhotos] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // string[]
  const fileInputRef = useRef(null);

  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPickPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const slots = Math.max(0, 5 - photos.length);
    const next = files.slice(0, slots).filter((f) => f.size <= 8 * 1024 * 1024);
    if (next.length === 0) {
      setError('Each photo must be under 8MB and you can upload up to 5');
      return;
    }
    setError('');
    setPhotos((prev) => [...prev, ...next]);
    setPreviews((prev) => [...prev, ...next.map((f) => URL.createObjectURL(f))]);
    if (e.target) e.target.value = '';
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      const removed = prev[idx];
      if (removed) URL.revokeObjectURL(removed);
      return next;
    });
  };

  /* Fetch booking */
  useEffect(() => {
    if (!bookingId) { setError('No booking specified'); setLoading(false); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await customerAPI.getBookingById(bookingId);
        const b = res?.data?.booking || res?.booking || res?.data || res;
        setBooking(b);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load booking');
      } finally { setLoading(false); }
    })();
  }, [bookingId]);

  /* Handlers */
  const setRating = (cat, val) => setForm(p => ({ ...p, rating: { ...p.rating, [cat]: val } }));
  const toggleTag = (tag) => setForm(p => ({ ...p, tags: p.tags.includes(tag) ? p.tags.filter(t => t !== tag) : [...p.tags, tag] }));

  /* Mood → overall sync */
  const currentMood = MOODS.find(m => m.star === form.rating.overall);

  /* Derived averages for preview */
  const subRatings = CATEGORIES.map(c => form.rating[c.key]).filter(v => v > 0);
  const avgSub = subRatings.length > 0 ? (subRatings.reduce((a, b) => a + b, 0) / subRatings.length).toFixed(1) : null;

  /* Validation */
  const canSubmit = form.rating.overall > 0 && form.comment.trim().length >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true); setError('');
    try {
      const reviewData = {
        bookingId,
        rating: form.rating,
        comment: form.comment.trim(),
        wouldRecommend: form.wouldRecommend,
        pros: form.tags,
        cons: [],
        images: photos,
      };
      await customerAPI.createReview(reviewData);
      setSuccess(true);
      // Pass state to trigger refetch when returning to reviews page
      setTimeout(() => navigate('/customer/reviews', { state: { refreshPendingReviews: true } }), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally { setSubmitting(false); }
  };

  /* ── Loading state ── */
  if (loading) return (
    <div className="rf-page">
      <div className="rf-loading">
        <div className="rf-spinner" />
        <span>Loading booking details...</span>
      </div>
    </div>
  );

  /* ── Error (no booking) ── */
  if (error && !booking) return (
    <div className="rf-page">
      <div className="rf-error-full">
        <AlertCircle style={{ width: 48, height: 48, color: '#f87171' }} />
        <h3>{error}</h3>
        <button className="rf-back-btn" onClick={() => navigate('/customer/bookings')}>Back to Bookings</button>
      </div>
    </div>
  );

  /* ── Success overlay ── */
  if (success) return (
    <div className="rf-page">
      <div className="rf-success-overlay">
        <div className="rf-success-card">
          <div className="rf-success-check">
            <CheckCircle style={{ width: 56, height: 56, color: '#10B981' }} />
          </div>
          <h2 className="rf-success-title">Review Submitted!</h2>
          <p className="rf-success-sub">Thank you for your feedback — it helps build a better community</p>
          <div className="rf-success-rating">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} style={{ width: 22, height: 22, fill: i < form.rating.overall ? '#F59E0B' : '#3a3f4e', color: i < form.rating.overall ? '#F59E0B' : '#3a3f4e' }} />
            ))}
          </div>
          <span className="rf-success-redirect">Redirecting to My Reviews...</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="rf-page">
      {/* ─── Top bar ─── */}
      <header className="rf-topbar rf-section">
        <button className="rf-back" onClick={() => navigate(-1)}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Back
        </button>
        <h1 className="rf-page-title">Write Review</h1>
        <div style={{ width: 60 }} />
      </header>

      <form onSubmit={handleSubmit} className="rf-layout">
        {/* ═══ LEFT: Service Summary (sticky) ═══ */}
        <aside className="rf-sidebar rf-section">
          <div className="rf-service-card">
            <div className="rf-service-thumb" style={{ background: getGrad(booking?.service?.title) }}>
              <span className="rf-service-emoji">{getCatIcon(booking?.service?.category)}</span>
            </div>
            <h3 className="rf-service-name">{booking?.service?.title || 'Service'}</h3>
            <span className="rf-service-cat">{booking?.service?.category}</span>

            <div className="rf-provider-row">
              {booking?.provider?.profileImage ? (
                <img src={booking.provider.profileImage} alt="" className="rf-provider-img" />
              ) : (
                <span className="rf-provider-avatar" style={{ background: getGrad(booking?.provider?.name) }}>{getInitials(booking?.provider?.name)}</span>
              )}
              <div>
                <span className="rf-provider-name">{booking?.provider?.name || 'Provider'}</span>
                <span className="rf-provider-role">Service Provider</span>
              </div>
            </div>

            <div className="rf-service-meta">
              <span><Calendar style={{ width: 13, height: 13 }} /> {booking?.scheduledDate ? new Date(booking.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
              <span><Clock style={{ width: 13, height: 13 }} /> {booking?.status || 'completed'}</span>
            </div>
          </div>

          {/* Guidelines card */}
          <div className="rf-guidelines">
            <h4 className="rf-guide-title"><Shield style={{ width: 14, height: 14 }} /> Review Guidelines</h4>
            <ul>
              <li>Be honest and constructive</li>
              <li>Focus on service quality</li>
              <li>Avoid personal attacks</li>
              <li>Include specific details</li>
            </ul>
          </div>
        </aside>

        {/* ═══ RIGHT: Review Form ═══ */}
        <main className="rf-main">
          {error && (
            <div className="rf-error-bar rf-section">
              <AlertCircle style={{ width: 16, height: 16 }} /> <span>{error}</span>
            </div>
          )}

          {/* 1. Mood selector */}
          <section className="rf-card rf-section">
            <h2 className="rf-card-title">How was your experience?</h2>
            <div className="rf-mood-row">
              {MOODS.map(m => (
                <button key={m.star} type="button"
                  className={`rf-mood ${form.rating.overall === m.star ? 'rf-mood-active' : ''}`}
                  style={form.rating.overall === m.star ? { borderColor: m.color, background: `${m.color}11` } : {}}
                  onClick={() => setRating('overall', m.star)}>
                  <span className="rf-mood-emoji">{m.emoji}</span>
                  <span className="rf-mood-label" style={form.rating.overall === m.star ? { color: m.color } : {}}>{m.label}</span>
                </button>
              ))}
            </div>
            {currentMood && <p className="rf-mood-result" style={{ color: currentMood.color }}>You rated: {currentMood.label} ({currentMood.star}/5 ⭐)</p>}
          </section>

          {/* 2. Detailed ratings */}
          <section className="rf-card rf-section">
            <h2 className="rf-card-title">Rate the Details</h2>
            <div className="rf-rating-grid">
              {CATEGORIES.map(cat => (
                <div key={cat.key} className="rf-rating-item">
                  <div className="rf-rating-label">
                    <span className="rf-rating-icon">{cat.icon}</span>
                    <div>
                      <span className="rf-rating-name">{cat.label}</span>
                      <span className="rf-rating-desc">{cat.desc}</span>
                    </div>
                  </div>
                  <StarInput value={form.rating[cat.key]} onChange={(v) => setRating(cat.key, v)} size={22} />
                </div>
              ))}
            </div>
          </section>

          {/* 3. Quick tags */}
          <section className="rf-card rf-section">
            <h2 className="rf-card-title">What stood out? <span className="rf-card-hint">(select all that apply)</span></h2>
            <div className="rf-tags">
              {QUICK_TAGS.map(tag => (
                <button key={tag} type="button"
                  className={`rf-tag ${form.tags.includes(tag) ? 'rf-tag-active' : ''}`}
                  onClick={() => toggleTag(tag)}>
                  {form.tags.includes(tag) && <CheckCircle style={{ width: 12, height: 12 }} />}
                  {tag}
                </button>
              ))}
            </div>
          </section>

          {/* 4. Comment */}
          <section className="rf-card rf-section">
            <h2 className="rf-card-title">Tell us more</h2>
            <div className="rf-textarea-wrap">
              <textarea
                className="rf-textarea"
                value={form.comment}
                onChange={(e) => setForm(p => ({ ...p, comment: e.target.value }))}
                rows={5}
                maxLength={1000}
                placeholder="Share your experience — what did you like? What could be improved?"
              />
              <span className="rf-char-count">{form.comment.length}/1000</span>
            </div>
            {form.comment.length > 0 && form.comment.length < 10 && (
              <span className="rf-char-hint">Minimum 10 characters</span>
            )}
          </section>

          {/* 4b. Photos */}
          <section className="rf-card rf-section">
            <h2 className="rf-card-title">
              Add photos <span className="rf-card-hint">(optional, up to 5)</span>
            </h2>
            <p className="rf-photo-sub">Show off the work — before/after shots help future customers trust this provider.</p>
            <div className="rf-photo-grid">
              {previews.map((src, i) => (
                <div key={i} className="rf-photo-tile">
                  <img src={src} alt={`Review photo ${i + 1}`} className="rf-photo-img" />
                  <button
                    type="button"
                    className="rf-photo-remove"
                    onClick={() => removePhoto(i)}
                    aria-label="Remove photo"
                  >
                    <XIcon style={{ width: 12, height: 12 }} />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  className="rf-photo-add"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera style={{ width: 22, height: 22 }} />
                  <span>Add photo</span>
                  <span className="rf-photo-add-hint">{photos.length}/5</span>
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={onPickPhotos}
            />
          </section>

          {/* 5. Recommend toggle */}
          <section className="rf-card rf-section">
            <div className="rf-recommend-row">
              <div className="rf-recommend-text">
                <Heart style={{ width: 16, height: 16, color: form.wouldRecommend ? '#EC4899' : '#4b5563' }} />
                <span>Would you recommend this provider?</span>
              </div>
              <button type="button" className={`rf-toggle ${form.wouldRecommend ? 'rf-toggle-on' : ''}`}
                onClick={() => setForm(p => ({ ...p, wouldRecommend: !p.wouldRecommend }))}>
                <span className="rf-toggle-knob" />
              </button>
            </div>
          </section>

          {/* 6. Live preview */}
          {(form.rating.overall > 0 || form.comment) && (
            <section className="rf-preview rf-section">
              <h2 className="rf-card-title"><Sparkles style={{ width: 15, height: 15 }} /> Preview</h2>
              <div className="rf-preview-body">
                <div className="rf-preview-stars">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} style={{ width: 16, height: 16, fill: i < form.rating.overall ? '#F59E0B' : 'transparent', color: i < form.rating.overall ? '#F59E0B' : '#3a3f4e' }} />
                  ))}
                  <span className="rf-preview-num">{form.rating.overall}/5</span>
                  {avgSub && <span className="rf-preview-avg">Avg detail: {avgSub}</span>}
                </div>
                {form.comment && <p className="rf-preview-comment">"{form.comment}"</p>}
                {form.tags.length > 0 && (
                  <div className="rf-preview-tags">
                    {form.tags.map(t => <span key={t} className="rf-preview-tag">{t}</span>)}
                  </div>
                )}
                {form.wouldRecommend && <span className="rf-preview-rec">👍 Would recommend</span>}
              </div>
            </section>
          )}

          {/* Submit */}
          <div className="rf-submit-row rf-section">
            <button type="button" className="rf-cancel" onClick={() => navigate('/customer/bookings')}>Cancel</button>
            <button type="submit" className="rf-submit" disabled={!canSubmit || submitting}>
              {submitting ? (
                <><span className="rf-submit-spinner" /> Submitting...</>
              ) : (
                <><Send style={{ width: 15, height: 15 }} /> Submit Review</>
              )}
            </button>
          </div>
        </main>
      </form>
    </div>
  );
};

export default ReviewForm;
