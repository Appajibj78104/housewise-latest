import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { showToast } from '../../utils/toast';
import {
  ArrowLeft, Calendar, Clock, MapPin, Phone, MessageCircle,
  Star, CheckCircle, XCircle, AlertCircle, Loader2,
  CreditCard, Timer, FileText, Shield, ChevronDown, ChevronUp,
  ExternalLink, Copy, Package, Plus, Repeat, Navigation,
  Truck, Tag, AlertTriangle, RefreshCcw, Heart
} from 'lucide-react';
import { customerAPI, bookingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import JobTimeline from '../../components/booking/JobTimeline';
import BookingChat from '../../components/chat/BookingChat';
import QuoteThread from '../../components/booking/QuoteThread';
import BadgeStrip from '../../components/shared/BadgeStrip';

/* ─── Constants ─── */
const STATUS_CONFIG = {
  quote_pending: { color: '#a855f7', bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.25)', icon: Tag,         label: 'Quote Pending', desc: 'Negotiating final price with provider' },
  pending:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', icon: Clock,       label: 'Pending', desc: 'Waiting for provider confirmation' },
  confirmed:   { color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', icon: CheckCircle, label: 'Confirmed', desc: 'Provider accepted your booking' },
  in_progress: { color: '#6366f1', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.25)', icon: Loader2,     label: 'In Progress', desc: 'Service is being performed' },
  completed:   { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)',  border: 'rgba(6,182,212,0.25)',  icon: CheckCircle, label: 'Completed', desc: 'Service completed successfully' },
  cancelled:   { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  icon: XCircle,     label: 'Cancelled', desc: 'This booking was cancelled' },
  declined:    { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  icon: XCircle,     label: 'Declined', desc: 'Provider declined this request' },
  no_show:     { color: '#6b7385', bg: 'rgba(107,115,133,0.10)', border: 'rgba(107,115,133,0.25)', icon: AlertCircle, label: 'No Show', desc: 'Customer or provider did not show up' },
  disputed:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)', icon: AlertTriangle, label: 'Disputed', desc: 'Dispute raised — under review' },
  resolved:    { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)',  border: 'rgba(6,182,212,0.25)',  icon: CheckCircle, label: 'Resolved', desc: 'Dispute resolved' },
};

const CATEGORY_EMOJI = {
  cooking: '🍳', cleaning: '🧹', tailoring: '✂️', beauty: '💄',
  tutoring: '📚', childcare: '👶', gardening: '🌿', other: '🔧',
};

const GRADIENTS = [
  'linear-gradient(135deg,#FF6B4A 0%,#FF8C5A 100%)',
  'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
  'linear-gradient(135deg,#06b6d4 0%,#22d3ee 100%)',
  'linear-gradient(135deg,#10b981 0%,#34d399 100%)',
];

const gradientFor = (s) => GRADIENTS[(s?.charCodeAt(0) || 0) % GRADIENTS.length];
const getInitials = (n) => n ? n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—';
const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtTime = (t) => {
  if (!t) return '';
  try { return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); }
  catch { return t; }
};

const fmtAddress = (loc) => {
  if (!loc?.address) return null;
  if (typeof loc.address === 'string') return loc.address;
  const { street, city, state, pincode } = loc.address;
  return [street, city, state, pincode].filter(Boolean).join(', ') || null;
};

/* ─── Timeline step component ─── */
const TimelineStep = ({ color, label, date, isLast }) => (
  <div className="bd-timeline-step">
    <div className="bd-timeline-dot-col">
      <div className="bd-timeline-dot" style={{ background: color }} />
      {!isLast && <div className="bd-timeline-line" />}
    </div>
    <div className="bd-timeline-content">
      <span className="bd-timeline-label">{label}</span>
      <span className="bd-timeline-date">{date ? new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '—'}</span>
    </div>
  </div>
);

/* ─── Skeleton ─── */
const Skeleton = () => (
  <div className="bd-page">
    <div className="bd-topnav"><div className="cb-shimmer" style={{ width: 120, height: 18, borderRadius: 6 }} /></div>
    <div className="bd-layout">
      <div className="bd-main">
        <div className="cb-shimmer" style={{ width: '100%', height: 200, borderRadius: 16 }} />
        <div className="cb-shimmer" style={{ width: '100%', height: 300, borderRadius: 16, marginTop: 20 }} />
      </div>
      <div className="bd-sidebar">
        <div className="cb-shimmer" style={{ width: '100%', height: 260, borderRadius: 16 }} />
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   BOOKING DETAIL PAGE
   ═══════════════════════════════════════════════════════════ */
const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [idCopied, setIdCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [tipDraft, setTipDraft] = useState({ open: false, amount: '', note: '', busy: false });
  const [disputeDraft, setDisputeDraft] = useState({ open: false, reason: '', photos: [], busy: false });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const res = await customerAPI.getBookingById(id);
      setBooking(res.data?.booking || res.data);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await customerAPI.getBookingById(id);
        setBooking(res.data?.booking || res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load booking');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleCancel = async () => {
    const reason = prompt('Reason for cancellation:');
    if (!reason) return;
    try {
      setCancelling(true);
      await customerAPI.cancelBooking(id, reason);
      const res = await customerAPI.getBookingById(id);
      setBooking(res.data?.booking || res.data);
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setCancelling(false);
    }
  };

  const handleAddTip = async () => {
    const amt = Number(tipDraft.amount);
    if (!amt || amt <= 0) {
      showToast.error('Enter a valid tip amount');
      return;
    }
    try {
      setTipDraft(d => ({ ...d, busy: true }));
      await bookingsAPI.addTip(id, { amount: amt, note: tipDraft.note });
      showToast.success(`Tip of ₹${amt} sent — thank you!`);
      setTipDraft({ open: false, amount: '', note: '', busy: false });
      refresh();
    } catch (err) {
      showToast.error(err?.message || 'Failed to add tip');
      setTipDraft(d => ({ ...d, busy: false }));
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeDraft.reason || disputeDraft.reason.trim().length < 10) {
      showToast.error('Please describe the issue (min 10 characters)');
      return;
    }
    try {
      setDisputeDraft(d => ({ ...d, busy: true }));
      await bookingsAPI.raiseDispute(id, { reason: disputeDraft.reason, photos: disputeDraft.photos });
      showToast.success('Dispute raised — admin will review');
      setDisputeDraft({ open: false, reason: '', photos: [], busy: false });
      refresh();
    } catch (err) {
      showToast.error(err?.message || 'Failed to raise dispute');
      setDisputeDraft(d => ({ ...d, busy: false }));
    }
  };

  const handleRebook = async () => {
    const date = prompt('New date (YYYY-MM-DD):');
    if (!date) return;
    const time = prompt('Start time (HH:MM, 24h):');
    if (!time) return;
    try {
      setBusy(true);
      const res = await bookingsAPI.rebook(id, {
        scheduledDate: date,
        scheduledTime: { start: time }
      });
      const newId = res.data?.booking?._id;
      showToast.success('Rebooked!');
      if (newId) navigate(`/customer/bookings/${newId}`);
    } catch (err) {
      showToast.error(err?.message || 'Failed to rebook');
    } finally {
      setBusy(false);
    }
  };

  const copyBookingId = () => {
    navigator.clipboard?.writeText(booking.bookingId || id);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const canCancel = () => {
    if (!booking || !['pending', 'confirmed'].includes(booking.status)) return false;
    const dt = new Date(`${booking.scheduledDate}T${booking.scheduledTime?.start || '00:00'}`);
    return (dt.getTime() - Date.now()) / 3600000 >= 2;
  };

  if (loading) return <Skeleton />;

  if (error || !booking) {
    return (
      <div className="bd-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div className="cb-empty">
          <div className="cb-empty-icon"><AlertCircle size={36} strokeWidth={1.2} /></div>
          <h3>{error || 'Booking not found'}</h3>
          <p>The booking you're looking for doesn't exist or was removed.</p>
          <button className="cb-coral-btn" onClick={() => navigate('/customer/bookings')}>Back to Bookings</button>
        </div>
      </div>
    );
  }

  const sc = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const StatusIcon = sc.icon;
  const catEmoji = CATEGORY_EMOJI[booking.service?.category] || '🔧';
  const providerName = booking.provider?.name || 'Provider';
  const addressText = fmtAddress(booking.location);

  const etaMinutes = booking.eta ? Math.max(0, Math.round((new Date(booking.eta).getTime() - Date.now()) / 60000)) : null;
  const isPast = ['completed', 'cancelled', 'declined', 'no_show', 'resolved'].includes(booking.status);
  const canRaiseDispute = (booking.status === 'completed' || booking.status === 'no_show') && !booking.dispute?.status;
  const canTip = booking.status === 'completed' && !(booking.tip?.amount > 0);

  return (
    <div className="bd-page">

      {/* ────── TOP NAV ────── */}
      <nav className="bd-topnav">
        <button className="bd-back-btn" onClick={() => navigate('/customer/bookings')}>
          <ArrowLeft size={18} /> Back to Bookings
        </button>
        <div
          className="bd-status-pill"
          style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}
        >
          <StatusIcon size={14} /> {sc.label}
        </div>
      </nav>

      {/* ────── STATUS BANNER ────── */}
      <div className="bd-status-banner" style={{ borderColor: sc.border, background: sc.bg }}>
        <StatusIcon size={20} style={{ color: sc.color }} />
        <div>
          <strong style={{ color: sc.color }}>{sc.label}</strong>
          <span>{sc.desc}</span>
        </div>
      </div>

      {/* ────── ETA BANNER ────── */}
      {booking.subStatus === 'on_the_way' && booking.eta && (
        <div className="bd-eta-banner">
          <Truck size={20} style={{ color: '#c7d2fe' }} />
          <div className="bd-eta-banner-text">
            <strong>{providerName} is on the way</strong>
            <span>ETA: {new Date(booking.eta).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}{etaMinutes != null ? ` (~${etaMinutes} min)` : ''}</span>
          </div>
        </div>
      )}
      {booking.subStatus === 'arrived' && (
        <div className="bd-eta-banner arrived">
          <MapPin size={20} style={{ color: '#67e8f9' }} />
          <div className="bd-eta-banner-text">
            <strong>{providerName} has arrived</strong>
            <span>They're at your location ready to start</span>
          </div>
        </div>
      )}

      {/* ────── MAIN LAYOUT ────── */}
      <div className="bd-layout">

        {/* ═══ LEFT: Main Content ═══ */}
        <div className="bd-main">

          {/* ── Service header card ── */}
          <div className="bd-hero-card">
            <div className="bd-hero-top">
              <div>
                <span className="bd-hero-category">{catEmoji} {booking.service?.category}</span>
                <h1 className="bd-hero-title">{booking.service?.title || 'Service'}</h1>
                <div className="bd-hero-id" onClick={copyBookingId} role="button" tabIndex={0} title="Click to copy">
                  <span>Booking ID: <code>{booking.bookingId || id}</code></span>
                  <Copy size={13} />
                  {idCopied && <span className="bd-copied-tag">Copied!</span>}
                </div>
              </div>
              {booking.pricing?.agreedAmount > 0 && (
                <div className="bd-hero-price">
                  <span className="bd-price-value">₹{booking.pricing.agreedAmount}</span>
                  <span className="bd-price-label">Agreed Amount</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Schedule & Location details ── */}
          <div className="bd-details-card">
            <h2 className="bd-section-heading"><span className="bd-accent-bar" />Booking Details</h2>

            <div className="bd-details-grid">
              <div className="bd-detail-item">
                <div className="bd-detail-icon"><Calendar size={16} /></div>
                <div>
                  <span className="bd-detail-label">Scheduled Date</span>
                  <span className="bd-detail-value">{fmtDate(booking.scheduledDate)}</span>
                </div>
              </div>

              <div className="bd-detail-item">
                <div className="bd-detail-icon"><Clock size={16} /></div>
                <div>
                  <span className="bd-detail-label">Time</span>
                  <span className="bd-detail-value">
                    {fmtTime(booking.scheduledTime?.start)}
                    {booking.scheduledTime?.end ? ` – ${fmtTime(booking.scheduledTime.end)}` : ''}
                  </span>
                </div>
              </div>

              <div className="bd-detail-item">
                <div className="bd-detail-icon"><Timer size={16} /></div>
                <div>
                  <span className="bd-detail-label">Duration</span>
                  <span className="bd-detail-value">{booking.duration?.estimated || '—'} minutes</span>
                </div>
              </div>

              <div className="bd-detail-item">
                <div className="bd-detail-icon"><MapPin size={16} /></div>
                <div>
                  <span className="bd-detail-label">Location</span>
                  <span className="bd-detail-value" style={{ textTransform: 'capitalize' }}>
                    {booking.location?.type?.replace(/_/g, ' ') || 'Not specified'}
                  </span>
                  {addressText && <span className="bd-detail-sub">{addressText}</span>}
                  {booking.location?.instructions && (
                    <span className="bd-detail-sub"><Navigation size={12} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 4 }} />{booking.location.instructions}</span>
                  )}
                </div>
              </div>

              <div className="bd-detail-item">
                <div className="bd-detail-icon"><CreditCard size={16} /></div>
                <div>
                  <span className="bd-detail-label">Payment</span>
                  <span className="bd-detail-value" style={{ textTransform: 'capitalize' }}>
                    {booking.pricing?.paymentMethod || 'Cash'} · {booking.pricing?.currency || 'INR'}
                  </span>
                </div>
              </div>

              <div className="bd-detail-item">
                <div className="bd-detail-icon"><Calendar size={16} /></div>
                <div>
                  <span className="bd-detail-label">Booked On</span>
                  <span className="bd-detail-value">{fmtDateShort(booking.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Selected Package ── */}
          {booking.selectedPackage?.name && (
            <div className="bd-details-card">
              <h2 className="bd-section-heading"><span className="bd-accent-bar" />Selected Package</h2>
              <div className="bd-package-box">
                <div className="bd-package-header">
                  <div className="bd-package-icon"><Package size={18} /></div>
                  <div>
                    <span className="bd-package-name">{booking.selectedPackage.name}</span>
                    {booking.selectedPackage.description && (
                      <span className="bd-package-desc">{booking.selectedPackage.description}</span>
                    )}
                  </div>
                  <span className="bd-package-price">₹{booking.selectedPackage.price}</span>
                </div>
                {booking.selectedPackage.includes?.length > 0 && (
                  <ul className="bd-package-includes">
                    {booking.selectedPackage.includes.map((item, i) => (
                      <li key={i}><CheckCircle size={13} /> {item}</li>
                    ))}
                  </ul>
                )}
                {booking.selectedPackage.duration > 0 && (
                  <div className="bd-package-duration">
                    <Timer size={13} /> {booking.selectedPackage.duration} minutes
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Selected Add-Ons ── */}
          {booking.selectedAddOns?.length > 0 && (
            <div className="bd-details-card">
              <h2 className="bd-section-heading"><span className="bd-accent-bar" />Add-Ons</h2>
              <div className="bd-addons-list">
                {booking.selectedAddOns.map((addon, i) => (
                  <div key={addon.id || i} className="bd-addon-item">
                    <div className="bd-addon-left">
                      <Plus size={14} />
                      <span>{addon.label}</span>
                    </div>
                    {addon.price > 0 && <span className="bd-addon-price">+₹{addon.price}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recurrence Info ── */}
          {booking.recurrence?.isRecurring && (
            <div className="bd-details-card">
              <h2 className="bd-section-heading"><span className="bd-accent-bar" />Recurring Booking</h2>
              <div className="bd-recurrence-box">
                <Repeat size={16} />
                <div>
                  <span className="bd-detail-value" style={{ textTransform: 'capitalize' }}>
                    {booking.recurrence.frequency || 'Weekly'}
                  </span>
                  {booking.recurrence.endDate && (
                    <span className="bd-detail-sub">Until {fmtDateShort(booking.recurrence.endDate)}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Notes ── */}
          {booking.customerNotes && (
            <div className="bd-notes-card">
              <h2 className="bd-section-heading"><span className="bd-accent-bar" />Special Instructions</h2>
              <p className="bd-notes-text">{booking.customerNotes}</p>
            </div>
          )}

          {/* ── Quote Thread (negotiable) ── */}
          {booking.status === 'quote_pending' && (
            <QuoteThread booking={booking} currentUser={user} onUpdate={refresh} />
          )}

          {/* ── Job Timeline ── */}
          {(booking.timeline?.length > 0 || ['confirmed', 'in_progress', 'completed'].includes(booking.status)) && (
            <JobTimeline booking={booking} role="customer" onChange={refresh} />
          )}

          {/* ── Tip ── */}
          {canTip && (
            <div className="bd-tip-card">
              <h3><Heart size={14} style={{ color: '#ec4899' }} /> Loved the service? Add a tip</h3>
              {!tipDraft.open ? (
                <button className="bd-action-btn bd-action-primary" onClick={() => setTipDraft(d => ({ ...d, open: true }))}>
                  <Tag size={14} /> Add a tip
                </button>
              ) : (
                <>
                  <div className="bd-tip-row">
                    {[50, 100, 200, 500].map(v => (
                      <button key={v} className="bd-tip-chip" onClick={() => setTipDraft(d => ({ ...d, amount: String(v) }))}>
                        ₹{v}
                      </button>
                    ))}
                  </div>
                  <input
                    className="bd-tip-input"
                    type="number" min="0" step="10"
                    placeholder="Custom amount (₹)"
                    value={tipDraft.amount}
                    onChange={(e) => setTipDraft(d => ({ ...d, amount: e.target.value }))}
                  />
                  <input
                    className="bd-tip-input"
                    type="text"
                    placeholder="Note (optional)"
                    style={{ marginTop: 8 }}
                    value={tipDraft.note}
                    onChange={(e) => setTipDraft(d => ({ ...d, note: e.target.value }))}
                    maxLength={200}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="bd-action-btn bd-action-primary" disabled={tipDraft.busy} onClick={handleAddTip}>
                      {tipDraft.busy ? <Loader2 size={14} className="cb-spin" /> : <Heart size={14} />}
                      Send Tip
                    </button>
                    <button className="bd-action-btn bd-action-outline" onClick={() => setTipDraft({ open: false, amount: '', note: '', busy: false })}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {booking.tip?.amount > 0 && (
            <div className="bd-tip-card">
              <h3><Heart size={14} style={{ color: '#ec4899' }} /> Tip sent</h3>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>
                ₹{booking.tip.amount} {booking.tip.note ? `— "${booking.tip.note}"` : ''}
              </p>
            </div>
          )}

          {/* ── Dispute ── */}
          {canRaiseDispute && (
            <div className="bd-dispute-card">
              <h3><AlertTriangle size={14} style={{ color: '#fbbf24' }} /> Have an issue?</h3>
              {!disputeDraft.open ? (
                <button className="bd-action-btn bd-action-outline" onClick={() => setDisputeDraft(d => ({ ...d, open: true }))}>
                  <AlertTriangle size={14} /> Raise a dispute
                </button>
              ) : (
                <>
                  <textarea
                    rows={3}
                    placeholder="Describe what went wrong (min 10 chars)"
                    className="bd-tip-input"
                    style={{ resize: 'vertical' }}
                    value={disputeDraft.reason}
                    onChange={(e) => setDisputeDraft(d => ({ ...d, reason: e.target.value }))}
                    maxLength={1000}
                  />
                  <label style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cbd5e1', cursor: 'pointer' }}>
                    <input
                      type="file" accept="image/*" multiple hidden
                      onChange={(e) => setDisputeDraft(d => ({ ...d, photos: Array.from(e.target.files || []).slice(0, 5) }))}
                    />
                    <Plus size={12} /> {disputeDraft.photos.length ? `${disputeDraft.photos.length} evidence photo${disputeDraft.photos.length > 1 ? 's' : ''}` : 'Attach evidence (optional)'}
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="bd-action-btn bd-action-danger" disabled={disputeDraft.busy} onClick={handleRaiseDispute}>
                      {disputeDraft.busy ? <Loader2 size={14} className="cb-spin" /> : <AlertTriangle size={14} />}
                      Submit Dispute
                    </button>
                    <button className="bd-action-btn bd-action-outline" onClick={() => setDisputeDraft({ open: false, reason: '', photos: [], busy: false })}>
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {booking.dispute?.status && (
            <div className="bd-dispute-card">
              <h3><AlertTriangle size={14} style={{ color: '#fbbf24' }} /> Dispute · {booking.dispute.status}</h3>
              <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>{booking.dispute.reason}</p>
              {booking.dispute.resolution && (
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                  <strong>Resolution:</strong> {booking.dispute.resolution}
                  {booking.dispute.refundAmount > 0 && ` · Refund ₹${booking.dispute.refundAmount}`}
                </p>
              )}
            </div>
          )}

          {/* ── Rebook ── */}
          {isPast && (
            <div className="bd-rebook-card">
              <h3><RefreshCcw size={14} /> Need this service again?</h3>
              <button className="bd-action-btn bd-action-outline" disabled={busy} onClick={handleRebook}>
                {busy ? <Loader2 size={14} className="cb-spin" /> : <RefreshCcw size={14} />}
                Rebook with same details
              </button>
            </div>
          )}

          {/* ── Cancellation info ── */}
          {booking.status === 'cancelled' && booking.cancellation && (
            <div className="bd-cancel-card">
              <h2 className="bd-section-heading" style={{ color: '#fca5a5' }}>
                <span className="bd-accent-bar" style={{ background: '#ef4444' }} />Cancellation Details
              </h2>
              <div className="bd-cancel-row">
                <span>Reason</span>
                <span>{booking.cancellation.reason || '—'}</span>
              </div>
              <div className="bd-cancel-row">
                <span>Cancelled On</span>
                <span>{fmtDateShort(booking.cancellation.cancelledAt)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ═══ RIGHT: Sidebar ═══ */}
        <div className="bd-sidebar">

          {/* ── Provider card ── */}
          <div className="bd-provider-card">
            <h3 className="bd-sidebar-heading">Service Provider</h3>
            <div className="bd-provider-top">
              <div className="bd-provider-avatar" style={{ background: gradientFor(providerName) }}>
                {getInitials(providerName)}
              </div>
              <div>
                <h4 className="bd-provider-name">{providerName}</h4>
                {booking.provider?.rating?.average > 0 && (
                  <div className="bd-provider-rating">
                    <Star size={13} style={{ color: '#fbbf24', fill: '#fbbf24' }} />
                    <span>{booking.provider.rating.average.toFixed(1)}</span>
                    <span className="bd-provider-reviews">({booking.provider.rating.count} reviews)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Provider trust badges */}
            {booking.provider?.earnedBadges?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <BadgeStrip badges={booking.provider.earnedBadges} />
              </div>
            )}

            <div className="bd-provider-btns">
              {booking.provider?.phone && (
                <a href={`tel:${booking.provider.phone}`} className="bd-provider-btn">
                  <Phone size={14} /> Call Provider
                </a>
              )}
              <button className="bd-provider-btn" onClick={() => setChatOpen(true)}>
                <MessageCircle size={14} /> Chat in app
              </button>
            </div>
          </div>

          {/* ── Trust signals ── */}
          <div className="bd-trust-card">
            <div className="bd-trust-row"><Shield size={14} /> Secure booking</div>
            <div className="bd-trust-row"><CheckCircle size={14} /> Free cancellation (2hr policy)</div>
          </div>

          {/* ── Actions ── */}
          <div className="bd-actions-card">
            <h2 className="bd-section-heading"><span className="bd-accent-bar" />Actions</h2>
            <div className="bd-actions-row">
              {['completed', 'resolved'].includes(booking.status) && !booking.isReviewed && (
                <Link to={`/customer/reviews/new?booking=${booking._id}`} className="bd-action-btn bd-action-primary">
                  <Star size={15} /> Write Review
                </Link>
              )}

              {(booking.status === 'completed' || booking.status === 'resolved') && (
                <Link to={`/customer/invoice/${booking._id}`} className="bd-action-btn bd-action-outline">
                  <FileText size={15} /> View Invoice
                </Link>
              )}

              {canCancel() && (
                <button className="bd-action-btn bd-action-danger" onClick={handleCancel} disabled={cancelling}>
                  {cancelling ? <Loader2 size={15} className="cb-spin" /> : <XCircle size={15} />}
                  {cancelling ? 'Cancelling...' : 'Cancel Booking'}
                </button>
              )}

              <Link to={`/customer/services/${booking.service?._id}`} className="bd-action-btn bd-action-outline">
                <ExternalLink size={15} /> View Service
              </Link>
            </div>

            {!canCancel() && ['pending', 'confirmed'].includes(booking.status) && (
              <p className="bd-cancel-hint">
                <Shield size={13} /> Bookings can only be cancelled at least 2 hours before the scheduled time.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chat drawer */}
      <BookingChat
        bookingId={booking._id}
        currentUser={user}
        counterpart={booking.provider}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </div>
  );
};

export default BookingDetail;
