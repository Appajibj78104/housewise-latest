import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { providerAPI, bookingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import JobTimeline from '../../components/booking/JobTimeline';
import BookingChat from '../../components/chat/BookingChat';
import QuoteThread from '../../components/booking/QuoteThread';
import {
  Calendar,
  Clock,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  MessageSquare,
  Star,
  ChevronDown,
  ChevronRight,
  X,
  MapPin,
  Copy,
  Briefcase,
  FileText,
  CreditCard,
  User,
  Hash,
  ExternalLink,
  Package,
  Plus,
  Repeat,
  Navigation,
  Timer,
  Zap,
  Info,
  Truck,
  PlayCircle,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';

/* ─── Status config ─── */
const STATUS_MAP = {
  pending:     { label: 'Pending',     color: '#FBBF24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', glow: 'rgba(251,191,36,0.15)' },
  confirmed:   { label: 'Confirmed',   color: '#3B82F6', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.25)', glow: 'rgba(59,130,246,0.15)' },
  in_progress: { label: 'In Progress', color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.25)', glow: 'rgba(139,92,246,0.15)' },
  completed:   { label: 'Completed',   color: '#10B981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.25)', glow: 'rgba(16,185,129,0.15)' },
  cancelled:   { label: 'Cancelled',   color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.20)',  glow: 'rgba(239,68,68,0.10)' },
  declined:    { label: 'Declined',    color: '#EF4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.20)',  glow: 'rgba(239,68,68,0.10)' },
  no_show:     { label: 'Completed',   color: '#6b7385', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', glow: 'transparent' },
};

/* Map dispute/dispute-related statuses back to their primary display status */
const getPrimaryStatusProvider = (status) => {
  if (['resolved', 'rejected'].includes(status)) return 'completed';
  if (status === 'disputed') return 'completed';
  return status;
};

const getSC = (s) => STATUS_MAP[getPrimaryStatusProvider(s)] || STATUS_MAP.pending;

/* ─── Category config ─── */
const CAT_CONFIG = {
  cooking:    { emoji: '🍱', label: 'Cooking' },
  tailoring:  { emoji: '✂️',  label: 'Tailoring' },
  tuition:    { emoji: '📚', label: 'Tuition' },
  beauty:     { emoji: '💄', label: 'Beauty' },
  cleaning:   { emoji: '🧹', label: 'Cleaning' },
  childcare:  { emoji: '👶', label: 'Childcare' },
  eldercare:  { emoji: '🤝', label: 'Elder Care' },
  handicrafts:{ emoji: '🎨', label: 'Handicrafts' },
  catering:   { emoji: '🍽️', label: 'Catering' },
  other:      { emoji: '⭐', label: 'Other' },
};
const getCat = (c) => CAT_CONFIG[c?.toLowerCase()] || CAT_CONFIG.other;

/* ─── Avatar gradients ─── */
const GRADS = [
  'linear-gradient(135deg, #FF6B4A, #FF8C5A)',
  'linear-gradient(135deg, #3B82F6, #60A5FA)',
  'linear-gradient(135deg, #8B5CF6, #A78BFA)',
  'linear-gradient(135deg, #10B981, #34D399)',
  'linear-gradient(135deg, #EC4899, #F472B6)',
  'linear-gradient(135deg, #F59E0B, #FBBF24)',
];
const getGrad = (name) => GRADS[(name || '').charCodeAt(0) % GRADS.length];

/* ─── Format helpers ─── */
const formatCurrency = (val) => {
  if (!val && val !== 0) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN');
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatTime = (t) => {
  if (!t) return '';
  // handle HH:MM format
  if (t.includes(':') && !t.includes('AM') && !t.includes('PM')) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  return t;
};

const formatTimestamp = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name) => (name || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ─── Relative time helpers ─── */
const timeAgo = (d) => {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const daysUntil = (d) => {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
};

/* ─── Count-up hook ─── */
const useCountUp = (end, duration = 600) => {
  const [value, setValue] = useState(0);
  const endNum = typeof end === 'number' ? end : parseInt(end) || 0;
  useEffect(() => {
    if (endNum === 0) { setValue(0); return; }
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue(Math.round((1 - Math.pow(1 - p, 3)) * endNum));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [endNum, duration]);
  return value;
};

/* ─── Toast ─── */
const Toast = ({ message, type = 'success', onClose }) => (
  <div className={`pb-toast pb-toast-${type}`}>
    {type === 'success' && <CheckCircle style={{ width: 16, height: 16 }} />}
    {type === 'error' && <AlertCircle style={{ width: 16, height: 16 }} />}
    <span>{message}</span>
    <button onClick={onClose} className="pb-toast-close"><X style={{ width: 14, height: 14 }} /></button>
  </div>
);

/* ─── Confirmation Modal ─── */
const ConfirmModal = ({ isOpen, title, description, note, icon: Icon, iconColor, confirmLabel, confirmColor, showReason, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  if (!isOpen) return null;
  return (
    <div className="pb-modal-overlay" onClick={onCancel}>
      <div className="pb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pb-modal-icon" style={{ background: `${iconColor}15`, color: iconColor }}>
          <Icon style={{ width: 28, height: 28 }} />
        </div>
        <h3 className="pb-modal-title">{title}</h3>
        <p className="pb-modal-desc">{description}</p>
        {note && <p className="pb-modal-note">{note}</p>}
        {showReason && (
          <div className="pb-modal-form">
            <select className="pb-modal-select" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select reason...</option>
              <option value="Schedule conflict">Schedule conflict</option>
              <option value="Unavailable">Unavailable</option>
              <option value="Cannot fulfill">Cannot fulfill</option>
              <option value="Other">Other</option>
            </select>
            <textarea
              className="pb-modal-textarea"
              placeholder="Optional message to customer..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        )}
        <div className="pb-modal-actions">
          <button className="pb-modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="pb-modal-confirm" style={{ background: confirmColor }} onClick={() => onConfirm(reason, message)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Skeleton ─── */
const Shimmer = ({ className = '' }) => <div className={`pb-shimmer ${className}`} />;
const BookingsSkeleton = () => (
  <div className="pb-page">
    <Shimmer className="pb-skel-header" />
    <Shimmer className="pb-skel-tabs" />
    <Shimmer className="pb-skel-bar" />
    {[1, 2, 3].map(i => <Shimmer key={i} className="pb-skel-card" />)}
  </div>
);

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */
const ProviderBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedId, setExpandedId] = useState(null);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [chatBooking, setChatBooking] = useState(null);
  const [etaDraft, setEtaDraft] = useState({ bookingId: null, minutes: 30, note: '' });
  const [customerRating, setCustomerRating] = useState({ bookingId: null, rating: 5, comment: '' });
  const [actionBusy, setActionBusy] = useState(null);
  const getSignal = useCallback(() => new AbortController().signal, []);

  /* ─── Fetch ─── */
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const signal = getSignal();
      const response = await providerAPI.getMyBookings({}, { signal });
      // Interceptor already unwraps response.data, so response = { success, data: { bookings } }
      const data = response?.data?.bookings || response?.bookings || [];
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('fetchBookings error:', err);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [getSignal]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  /* ─── Status counts ─── */
  const pendingCount = bookings.filter(b => b.status === 'pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
  const completedCount = bookings.filter(b => b.status === 'completed').length;
  const cancelledCount = bookings.filter(b => ['cancelled', 'declined'].includes(b.status)).length;

  const pendingAnim = useCountUp(pendingCount);
  const confirmedAnim = useCountUp(confirmedCount);
  const completedAnim = useCountUp(completedCount);
  const cancelledAnim = useCountUp(cancelledCount);

  /* ─── Actions ─── */
  const updateStatus = async (bookingId, status, notes = '') => {
    try {
      await providerAPI.updateBookingStatus(bookingId, { status, notes });
      setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, status, providerNotes: notes || b.providerNotes } : b));
      const label = status === 'confirmed' ? 'accepted' : status === 'completed' ? 'completed' : status === 'cancelled' ? 'cancelled' : status;
      setToast({ message: `Booking ${label} successfully`, type: 'success' });
    } catch {
      setToast({ message: 'Failed to update booking', type: 'error' });
    }
    setConfirmModal(null);
  };

  const openAcceptModal = (booking) => {
    setConfirmModal({
      title: 'Accept Booking',
      description: `Accept "${booking.service?.title}" for ${booking.customer?.name} on ${formatDateShort(booking.scheduledDate)}?`,
      note: 'The customer will be notified immediately.',
      icon: CheckCircle,
      iconColor: '#10B981',
      confirmLabel: 'Accept Booking',
      confirmColor: '#10B981',
      showReason: false,
      onConfirm: () => updateStatus(booking._id, 'confirmed'),
    });
  };

  const openDeclineModal = (booking) => {
    setConfirmModal({
      title: 'Decline Booking',
      description: `Decline "${booking.service?.title}" from ${booking.customer?.name}?`,
      note: null,
      icon: XCircle,
      iconColor: '#EF4444',
      confirmLabel: 'Decline Booking',
      confirmColor: '#EF4444',
      showReason: true,
      onConfirm: (reason, msg) => updateStatus(booking._id, 'declined', [reason, msg].filter(Boolean).join(' — ')),
    });
  };

  const openCompleteModal = (booking) => {
    setConfirmModal({
      title: 'Mark as Completed',
      description: `Mark "${booking.service?.title}" for ${booking.customer?.name} as completed?`,
      note: 'This action cannot be undone.',
      icon: CheckCircle,
      iconColor: '#FF6B4A',
      confirmLabel: 'Mark Complete',
      confirmColor: '#FF6B4A',
      showReason: false,
      onConfirm: () => updateStatus(booking._id, 'completed'),
    });
  };

  const openCancelModal = (booking) => {
    setConfirmModal({
      title: 'Cancel Booking',
      description: `Cancel "${booking.service?.title}" for ${booking.customer?.name}?`,
      note: 'The customer will be notified.',
      icon: XCircle,
      iconColor: '#EF4444',
      confirmLabel: 'Cancel Booking',
      confirmColor: '#EF4444',
      showReason: true,
      onConfirm: (reason, msg) => updateStatus(booking._id, 'cancelled', [reason, msg].filter(Boolean).join(' — ')),
    });
  };

  const copyBookingId = (id) => {
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  /* ─── Lifecycle actions ─── */
  const refreshOne = async (bookingId) => {
    try {
      const res = await bookingsAPI.getBookingById(bookingId);
      const updated = res?.data?.booking || res?.booking;
      if (updated) {
        setBookings((prev) => prev.map((b) => (b._id === bookingId ? { ...b, ...updated } : b)));
      }
    } catch (_) { /* swallow */ }
  };

  const submitEta = async () => {
    if (!etaDraft.bookingId) return;
    const minutes = Math.max(1, parseInt(etaDraft.minutes, 10) || 30);
    setActionBusy(`eta-${etaDraft.bookingId}`);
    try {
      await bookingsAPI.setEta(etaDraft.bookingId, { etaMinutes: minutes, note: etaDraft.note });
      setToast({ message: `ETA shared with the customer (~${minutes} min)`, type: 'success' });
      await refreshOne(etaDraft.bookingId);
      setEtaDraft({ bookingId: null, minutes: 30, note: '' });
    } catch (e) {
      setToast({ message: e?.response?.data?.message || 'Failed to set ETA', type: 'error' });
    } finally {
      setActionBusy(null);
    }
  };

  const handleArrived = async (bookingId) => {
    setActionBusy(`arr-${bookingId}`);
    try {
      await bookingsAPI.markArrived(bookingId);
      setToast({ message: 'Marked arrived. Tap Start when you begin.', type: 'success' });
      await refreshOne(bookingId);
    } catch (e) {
      setToast({ message: e?.response?.data?.message || 'Failed to mark arrived', type: 'error' });
    } finally {
      setActionBusy(null);
    }
  };

  const handleStart = async (bookingId) => {
    setActionBusy(`start-${bookingId}`);
    try {
      await bookingsAPI.startJob(bookingId);
      setToast({ message: 'Job started. Customer notified.', type: 'success' });
      await refreshOne(bookingId);
    } catch (e) {
      setToast({ message: e?.response?.data?.message || 'Failed to start job', type: 'error' });
    } finally {
      setActionBusy(null);
    }
  };

  const submitCustomerRating = async () => {
    if (!customerRating.bookingId) return;
    setActionBusy(`crate-${customerRating.bookingId}`);
    try {
      await bookingsAPI.rateCustomer(customerRating.bookingId, {
        rating: customerRating.rating,
        comment: customerRating.comment,
      });
      setToast({ message: 'Customer rated. Thank you!', type: 'success' });
      await refreshOne(customerRating.bookingId);
      setCustomerRating({ bookingId: null, rating: 5, comment: '' });
    } catch (e) {
      setToast({ message: e?.response?.data?.message || 'Failed to submit rating', type: 'error' });
    } finally {
      setActionBusy(null);
    }
  };

  /* ─── Filtering & sorting ─── */
  const filtered = bookings
    .filter(b => {
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesSearch = !searchTerm ||
        b.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.service?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customer?.phone?.includes(searchTerm) ||
        b.bookingId?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'date') return new Date(a.scheduledDate) - new Date(b.scheduledDate);
      return 0;
    });

  /* ─── Tab items ─── */
  const tabs = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  /* ─── WhatsApp link helper ─── */
  const waLink = (booking) => {
    const phone = booking.customer?.phone?.replace(/\D/g, '');
    if (!phone) return '#';
    const msg = encodeURIComponent(`Hi ${booking.customer?.name}, regarding your booking for ${booking.service?.title} on ${formatDateShort(booking.scheduledDate)}`);
    return `https://wa.me/91${phone}?text=${msg}`;
  };

  /* ─── Build address string ─── */
  const buildAddress = (loc) => {
    if (!loc) return null;
    const addr = loc.address;
    if (!addr) return loc.instructions ? loc.instructions : null;
    const parts = [addr.street, addr.city, addr.state, addr.pincode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */

  if (loading) return <BookingsSkeleton />;

  return (
    <div className="pb-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmModal && (
        <ConfirmModal
          isOpen
          title={confirmModal.title}
          description={confirmModal.description}
          note={confirmModal.note}
          icon={confirmModal.icon}
          iconColor={confirmModal.iconColor}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          showReason={confirmModal.showReason}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* ═══════ PAGE HEADER ═══════ */}
      <header className="pb-header pb-section">
        <div className="pb-header-left">
          <h1 className="pb-title">Booking Management</h1>
          <p className="pb-subtitle">Manage requests and track your appointments</p>
        </div>
        <div className="pb-counter-chips">
          <button className={`pb-counter-chip ${statusFilter === 'pending' ? 'pb-counter-active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}>
            <span className="pb-counter-dot" style={{ background: '#FBBF24' }} />
            <strong>{pendingAnim}</strong> Pending
          </button>
          <button className={`pb-counter-chip ${statusFilter === 'confirmed' ? 'pb-counter-active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'confirmed' ? 'all' : 'confirmed')}>
            <span className="pb-counter-dot" style={{ background: '#3B82F6' }} />
            <strong>{confirmedAnim}</strong> Confirmed
          </button>
          <button className={`pb-counter-chip ${statusFilter === 'completed' ? 'pb-counter-active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}>
            <span className="pb-counter-dot" style={{ background: '#10B981' }} />
            <strong>{completedAnim}</strong> Completed
          </button>
          <button className={`pb-counter-chip ${statusFilter === 'cancelled' ? 'pb-counter-active' : ''}`} onClick={() => setStatusFilter(statusFilter === 'cancelled' ? 'all' : 'cancelled')}>
            <span className="pb-counter-dot" style={{ background: '#EF4444' }} />
            <strong>{cancelledAnim}</strong> Cancelled
          </button>
        </div>
      </header>

      {/* ═══════ TABS ═══════ */}
      <div className="pb-section pb-tabs">
        {tabs.map(tab => (
          <button
            key={tab.value}
            className={`pb-tab ${statusFilter === tab.value ? 'pb-tab-active' : ''}`}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════ FILTER BAR ═══════ */}
      <div className="pb-section pb-filter-bar">
        <div className="pb-search-wrap">
          <Search style={{ width: 16, height: 16 }} className="pb-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer name, service, phone..."
            className="pb-search-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="pb-search-clear">
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>
        <select className="pb-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="date">Date of Service</option>
        </select>
        <span className="pb-results-count">
          Showing {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ═══════ ERROR ═══════ */}
      {error && (
        <div className="pb-section pb-error-banner">
          <AlertCircle style={{ width: 16, height: 16 }} />
          <span>{error}</span>
          <button onClick={fetchBookings} className="pb-error-retry">Retry</button>
        </div>
      )}

      {/* ═══════ EMPTY STATE ═══════ */}
      {filtered.length === 0 && !error && (
        <div className="pb-section pb-empty">
          <div className="pb-empty-illust">
            <Calendar style={{ width: 56, height: 56, color: '#3a3f4e' }} />
          </div>
          {bookings.length === 0 ? (
            <>
              <h3 className="pb-empty-title">No bookings yet</h3>
              <p className="pb-empty-sub">When customers book your services, they'll appear here</p>
              <Link to="/provider/services" className="pb-cta-btn">
                <Briefcase style={{ width: 16, height: 16 }} /> Browse My Services
              </Link>
            </>
          ) : (
            <>
              <h3 className="pb-empty-title">No bookings match your filters</h3>
              <p className="pb-empty-sub">Try adjusting your search or filter criteria</p>
              <button className="pb-clear-btn" onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}>
                Clear All Filters
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══════ BOOKINGS LIST ═══════ */}
      <div className="pb-list">
        {filtered.map((booking, idx) => {
          const sc = getSC(booking.status);
          const isExpanded = expandedId === booking._id;
          const initials = getInitials(booking.customer?.name);
          const cat = getCat(booking.service?.category);
          const address = buildAddress(booking.location);
          const isPending = booking.status === 'pending';
          const isConfirmed = booking.status === 'confirmed';
          const isInProgress = booking.status === 'in_progress';
          const isCompleted = booking.status === 'completed';
          const isCancelled = ['cancelled', 'declined'].includes(booking.status);
          const isQuotePending = booking.status === 'quote_pending';
          const isDisputed = booking.status === 'disputed';
          const sub = booking.subStatus;
          const onTheWay = isConfirmed && sub === 'on_the_way';
          const arrived = isConfirmed && sub === 'arrived';
          const etaDate = booking.eta ? new Date(booking.eta) : null;
          const alreadyRated = !!booking.customerRatedByProvider?.rating;

          /* ═══ PENDING REQUEST — rich always-open card ═══ */
          if (isPending) {
            const scheduleTag = daysUntil(booking.scheduledDate);
            const locType = booking.location?.type?.replace(/_/g, ' ');
            const totalAmount = booking.pricing?.agreedAmount || booking.service?.pricing?.amount || 0;

            return (
              <div
                key={booking._id}
                className="pbc-card pb-section"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* ── Glow accent top ── */}
                <div className="pbc-glow" />

                {/* ── Header ── */}
                <div className="pbc-header">
                  <div className="pbc-header-left">
                    <div className="pbc-pulse-dot" />
                    <span className="pbc-new-badge">New Request</span>
                    <span className="pbc-time-ago">{timeAgo(booking.createdAt)}</span>
                  </div>
                  <div className="pbc-header-right">
                    <span className="pbc-price-tag">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                {/* ── Customer + Service strip ── */}
                <div className="pbc-top-strip">
                  <div className="pbc-customer">
                    <div className="pbc-avatar" style={{ background: getGrad(booking.customer?.name) }}>
                      {initials}
                    </div>
                    <div className="pbc-customer-info">
                      <span className="pbc-customer-name">{booking.customer?.name || 'Customer'}</span>
                      {booking.customer?.phone && (
                        <a href={`tel:${booking.customer.phone}`} className="pbc-customer-phone" onClick={(e) => e.stopPropagation()}>
                          <Phone style={{ width: 11, height: 11 }} /> {booking.customer.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="pbc-service-tag">
                    <span className="pbc-cat-emoji">{cat.emoji}</span>
                    <span>{booking.service?.title || 'Service'}</span>
                  </div>
                </div>

                {/* ── Schedule & Location row ── */}
                <div className="pbc-info-grid">
                  <div className="pbc-info-box">
                    <Calendar style={{ width: 15, height: 15 }} />
                    <div>
                      <span className="pbc-info-label">Date</span>
                      <span className="pbc-info-value">{formatDate(booking.scheduledDate)}</span>
                      {scheduleTag && <span className="pbc-info-tag">{scheduleTag}</span>}
                    </div>
                  </div>
                  <div className="pbc-info-box">
                    <Clock style={{ width: 15, height: 15 }} />
                    <div>
                      <span className="pbc-info-label">Time</span>
                      <span className="pbc-info-value">
                        {formatTime(booking.scheduledTime?.start)}
                        {booking.scheduledTime?.end ? ` – ${formatTime(booking.scheduledTime.end)}` : ''}
                      </span>
                      {booking.duration?.estimated > 0 && (
                        <span className="pbc-info-sub"><Timer style={{ width: 11, height: 11 }} /> {booking.duration.estimated} min</span>
                      )}
                    </div>
                  </div>
                  <div className="pbc-info-box">
                    <MapPin style={{ width: 15, height: 15 }} />
                    <div>
                      <span className="pbc-info-label">Location</span>
                      <span className="pbc-info-value" style={{ textTransform: 'capitalize' }}>{locType || 'Customer Address'}</span>
                      {address && <span className="pbc-info-sub">{address}</span>}
                      {booking.location?.instructions && (
                        <span className="pbc-info-sub pbc-info-instructions">
                          <Navigation style={{ width: 10, height: 10 }} /> {booking.location.instructions}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="pbc-info-box">
                    <CreditCard style={{ width: 15, height: 15 }} />
                    <div>
                      <span className="pbc-info-label">Payment</span>
                      <span className="pbc-info-value" style={{ textTransform: 'capitalize' }}>
                        {(booking.pricing?.paymentMethod || 'cash').replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Package / Add-ons / Notes / Recurrence row ── */}
                {(booking.selectedPackage?.name || booking.selectedAddOns?.length > 0 || booking.customerNotes || booking.recurrence?.isRecurring) && (
                  <div className="pbc-extras">
                    {booking.selectedPackage?.name && (
                      <div className="pbc-extra-card pbc-extra-package">
                        <div className="pbc-extra-header">
                          <Package style={{ width: 14, height: 14 }} />
                          <span className="pbc-extra-title">Package</span>
                        </div>
                        <div className="pbc-package-body">
                          <span className="pbc-package-name">{booking.selectedPackage.name}</span>
                          <span className="pbc-package-price">{formatCurrency(booking.selectedPackage.price)}</span>
                        </div>
                        {booking.selectedPackage.includes?.length > 0 && (
                          <ul className="pbc-package-list">
                            {booking.selectedPackage.includes.map((item, i) => (
                              <li key={i}><CheckCircle style={{ width: 11, height: 11 }} /> {item}</li>
                            ))}
                          </ul>
                        )}
                        {booking.selectedPackage.duration > 0 && (
                          <span className="pbc-pkg-dur"><Timer style={{ width: 11, height: 11 }} /> {booking.selectedPackage.duration} min</span>
                        )}
                      </div>
                    )}

                    {booking.selectedAddOns?.length > 0 && (
                      <div className="pbc-extra-card pbc-extra-addons">
                        <div className="pbc-extra-header">
                          <Plus style={{ width: 14, height: 14 }} />
                          <span className="pbc-extra-title">Add-Ons ({booking.selectedAddOns.length})</span>
                        </div>
                        {booking.selectedAddOns.map((addon, i) => (
                          <div key={addon.id || i} className="pbc-addon-row">
                            <span>{addon.label}</span>
                            {addon.price > 0 && <span className="pbc-addon-price">+{formatCurrency(addon.price)}</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {booking.recurrence?.isRecurring && (
                      <div className="pbc-extra-card pbc-extra-recurrence">
                        <div className="pbc-extra-header">
                          <Repeat style={{ width: 14, height: 14 }} />
                          <span className="pbc-extra-title">Recurring</span>
                        </div>
                        <span className="pbc-recur-value" style={{ textTransform: 'capitalize' }}>
                          {booking.recurrence.frequency || 'Weekly'}
                          {booking.recurrence.endDate ? ` · until ${formatDateShort(booking.recurrence.endDate)}` : ''}
                        </span>
                      </div>
                    )}

                    {booking.customerNotes && (
                      <div className="pbc-extra-card pbc-extra-notes">
                        <div className="pbc-extra-header">
                          <FileText style={{ width: 14, height: 14 }} />
                          <span className="pbc-extra-title">Customer Notes</span>
                        </div>
                        <p className="pbc-notes-text">{booking.customerNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Booking ID row ── */}
                <div className="pbc-meta-row">
                  <button className="pbc-booking-id" onClick={() => copyBookingId(booking.bookingId || booking._id)}>
                    <Hash style={{ width: 12, height: 12 }} />
                    <code>{booking.bookingId || booking._id}</code>
                    {copiedId === (booking.bookingId || booking._id) ? (
                      <span className="pbc-copied">Copied!</span>
                    ) : (
                      <Copy style={{ width: 11, height: 11 }} />
                    )}
                  </button>
                  <span className="pbc-booked-on">Booked on {formatTimestamp(booking.createdAt)}</span>
                </div>

                {/* ── Action strip ── */}
                <div className="pbc-actions">
                  <button className="pbc-btn pbc-btn-accept" onClick={() => openAcceptModal(booking)}>
                    <CheckCircle style={{ width: 16, height: 16 }} /> Accept Booking
                  </button>
                  <button className="pbc-btn pbc-btn-decline" onClick={() => openDeclineModal(booking)}>
                    <XCircle style={{ width: 16, height: 16 }} /> Decline
                  </button>
                  <div className="pbc-contact-btns">
                    {booking.customer?.phone && (
                      <>
                        <a href={`tel:${booking.customer.phone}`} className="pbc-contact-btn" onClick={(e) => e.stopPropagation()}>
                          <Phone style={{ width: 14, height: 14 }} />
                        </a>
                        <a href={waLink(booking)} target="_blank" rel="noopener noreferrer" className="pbc-contact-btn pbc-contact-wa" onClick={(e) => e.stopPropagation()}>
                          <MessageSquare style={{ width: 14, height: 14 }} />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          /* ═══ NON-PENDING — original expandable card ═══ */

          return (
            <div
              key={booking._id}
              className="pb-card pb-section"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {/* ── Header row ── */}
              <div className="pb-card-header" onClick={() => setExpandedId(isExpanded ? null : booking._id)}>
                {/* Customer */}
                <div className="pb-card-customer">
                  <div className="pb-avatar" style={{ background: getGrad(booking.customer?.name) }}>
                    {initials}
                  </div>
                  <div className="pb-customer-info">
                    <span className="pb-customer-name">{booking.customer?.name || 'Customer'}</span>
                    {booking.customer?.phone && (
                      <a href={`tel:${booking.customer.phone}`} className="pb-customer-phone" onClick={(e) => e.stopPropagation()}>
                        <Phone style={{ width: 11, height: 11 }} /> {booking.customer.phone}
                      </a>
                    )}
                  </div>
                </div>

                {/* Center chips */}
                <div className="pb-card-center">
                  <span className="pb-service-pill">{booking.service?.title || 'Service'}</span>
                  <span className="pb-date-chip">
                    <Calendar style={{ width: 12, height: 12 }} /> {formatDateShort(booking.scheduledDate)}
                  </span>
                  {booking.scheduledTime?.start && (
                    <span className="pb-time-chip">
                      <Clock style={{ width: 12, height: 12 }} /> {formatTime(booking.scheduledTime.start)}{booking.scheduledTime.end ? ` – ${formatTime(booking.scheduledTime.end)}` : ''}
                    </span>
                  )}
                </div>

                {/* Status + expand */}
                <div className="pb-card-right">
                  <div className="pb-status-pills-group">
                    {/* Main Status Pill - Always show primary status */}
                    <span className="pb-status-pill" style={{ color: sc.color, background: sc.bg, borderColor: sc.border, boxShadow: `0 0 12px ${sc.glow}` }}>
                      {sc.label}
                    </span>
                    {/* Dispute Status Pill - Show if dispute exists */}
                    {booking.dispute?.status && (
                      <span className="pb-status-pill pb-dispute-pill" style={{
                        color: booking.dispute.status === 'open' ? '#F59E0B' : booking.dispute.status === 'resolved' ? '#10B981' : '#6b7385',
                        background: booking.dispute.status === 'open' ? 'rgba(245,158,11,0.10)' : booking.dispute.status === 'resolved' ? 'rgba(16,185,129,0.10)' : 'rgba(107,115,133,0.10)',
                        borderColor: booking.dispute.status === 'open' ? 'rgba(245,158,11,0.25)' : booking.dispute.status === 'resolved' ? 'rgba(16,185,129,0.25)' : 'rgba(107,115,133,0.25)',
                        boxShadow: 'none'
                      }}>
                        {booking.dispute.status === 'open' ? '⚠️ Dispute' : booking.dispute.status === 'resolved' ? '✓ Resolved' : '✕ Closed'}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    style={{ width: 18, height: 18, transition: 'transform 0.3s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)' }}
                    className="pb-expand-icon"
                  />
                </div>
              </div>

              {/* ── Expanded section ── */}
              <div className={`pb-card-expand ${isExpanded ? 'pb-expand-open' : ''}`}>
                <div className="pb-expand-inner">
                  <div className="pb-expand-grid">
                    {/* Left: Booking Details */}
                    <div className="pb-detail-col">
                      <div className="pb-detail-section-title">
                        <div className="pb-accent-bar" />
                        <FileText style={{ width: 14, height: 14, color: '#FF6B4A' }} />
                        <span>Booking Details</span>
                      </div>

                      {/* Address */}
                      {address && (
                        <div className="pb-detail-row">
                          <MapPin style={{ width: 14, height: 14, color: '#6b7385', flexShrink: 0 }} />
                          <div>
                            <span className="pb-detail-label">Address</span>
                            <span className="pb-detail-value">{address}</span>
                          </div>
                        </div>
                      )}

                      {/* Location instructions */}
                      {booking.location?.instructions && (
                        <div className="pb-detail-row">
                          <MapPin style={{ width: 14, height: 14, color: '#6b7385', flexShrink: 0 }} />
                          <div>
                            <span className="pb-detail-label">Location Instructions</span>
                            <span className="pb-detail-value">{booking.location.instructions}</span>
                          </div>
                        </div>
                      )}

                      {/* Customer notes */}
                      {booking.customerNotes && (
                        <div className="pb-customer-note-box">
                          <span className="pb-detail-label">📝 Customer Note</span>
                          <p className="pb-customer-note">{booking.customerNotes}</p>
                        </div>
                      )}

                      {/* Selected Package */}
                      {booking.selectedPackage?.name && (
                        <div className="pb-package-box">
                          <div className="pb-package-header">
                            <Package style={{ width: 15, height: 15, color: '#818cf8', flexShrink: 0 }} />
                            <span className="pb-package-name">{booking.selectedPackage.name}</span>
                            <span className="pb-package-price">{formatCurrency(booking.selectedPackage.price)}</span>
                          </div>
                          {booking.selectedPackage.description && (
                            <p className="pb-package-desc">{booking.selectedPackage.description}</p>
                          )}
                          {booking.selectedPackage.includes?.length > 0 && (
                            <ul className="pb-package-includes">
                              {booking.selectedPackage.includes.map((item, i) => (
                                <li key={i}><CheckCircle style={{ width: 12, height: 12 }} /> {item}</li>
                              ))}
                            </ul>
                          )}
                          {booking.selectedPackage.duration > 0 && (
                            <span className="pb-package-dur"><Clock style={{ width: 12, height: 12 }} /> {booking.selectedPackage.duration} min</span>
                          )}
                        </div>
                      )}

                      {/* Selected Add-Ons */}
                      {booking.selectedAddOns?.length > 0 && (
                        <div className="pb-addons-box">
                          <span className="pb-detail-label">Add-Ons</span>
                          {booking.selectedAddOns.map((addon, i) => (
                            <div key={addon.id || i} className="pb-addon-row">
                              <div className="pb-addon-left">
                                <Plus style={{ width: 13, height: 13, color: '#10b981' }} />
                                <span>{addon.label}</span>
                              </div>
                              {addon.price > 0 && <span className="pb-addon-price">+{formatCurrency(addon.price)}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Recurrence Info */}
                      {booking.recurrence?.isRecurring && (
                        <div className="pb-recurrence-box">
                          <Repeat style={{ width: 14, height: 14, color: '#818cf8', flexShrink: 0 }} />
                          <div>
                            <span className="pb-detail-label">Recurring Booking</span>
                            <span className="pb-detail-value" style={{ textTransform: 'capitalize' }}>
                              {booking.recurrence.frequency || 'Weekly'}
                              {booking.recurrence.endDate ? ` · until ${formatDateShort(booking.recurrence.endDate)}` : ''}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Provider notes */}
                      {booking.providerNotes && (
                        <div className="pb-provider-note-box">
                          <span className="pb-detail-label">Your Notes</span>
                          <p className="pb-provider-note">{booking.providerNotes}</p>
                        </div>
                      )}

                      {/* Payment method */}
                      {booking.pricing?.paymentMethod && (
                        <div className="pb-detail-row">
                          <CreditCard style={{ width: 14, height: 14, color: '#6b7385', flexShrink: 0 }} />
                          <div>
                            <span className="pb-detail-label">Payment Method</span>
                            <span className="pb-detail-value" style={{ textTransform: 'capitalize' }}>{booking.pricing.paymentMethod.replace('_', ' ')}</span>
                          </div>
                        </div>
                      )}

                      {/* Duration */}
                      {booking.duration?.estimated && (
                        <div className="pb-detail-row">
                          <Clock style={{ width: 14, height: 14, color: '#6b7385', flexShrink: 0 }} />
                          <div>
                            <span className="pb-detail-label">Duration</span>
                            <span className="pb-detail-value">{booking.duration.estimated} minutes</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Service & Payment */}
                    <div className="pb-detail-col">
                      <div className="pb-detail-section-title">
                        <div className="pb-accent-bar pb-accent-blue" />
                        <Briefcase style={{ width: 14, height: 14, color: '#3B82F6' }} />
                        <span>Service & Payment</span>
                      </div>

                      {/* Service info */}
                      <div className="pb-service-info-card">
                        <div className="pb-service-info-row">
                          <span>{booking.service?.title || 'Service'}</span>
                          <span className="pb-cat-pill">{cat.emoji} {cat.label}</span>
                        </div>
                        {booking.service?.duration?.estimated && (
                          <span className="pb-service-duration"><Clock style={{ width: 11, height: 11 }} /> {booking.service.duration.estimated} min</span>
                        )}
                      </div>

                      {/* Pricing */}
                      <div className="pb-pricing-card">
                        <div className="pb-pricing-row">
                          <span>{booking.selectedPackage?.name ? booking.selectedPackage.name : 'Base Price'}</span>
                          <span>{formatCurrency(booking.selectedPackage?.price || booking.service?.pricing?.amount || 0)}</span>
                        </div>
                        {booking.selectedAddOns?.length > 0 && booking.selectedAddOns.map((addon, i) => (
                          <div key={addon.id || i} className="pb-pricing-row pb-pricing-addon">
                            <span>+ {addon.label}</span>
                            <span>{formatCurrency(addon.price)}</span>
                          </div>
                        ))}
                        <div className="pb-pricing-divider" />
                        <div className="pb-pricing-row pb-pricing-total">
                          <span>Total</span>
                          <span>{formatCurrency(booking.pricing?.agreedAmount || booking.service?.pricing?.amount)}</span>
                        </div>
                      </div>

                      {/* Booking ID */}
                      <div className="pb-detail-row">
                        <Hash style={{ width: 14, height: 14, color: '#6b7385', flexShrink: 0 }} />
                        <div>
                          <span className="pb-detail-label">Booking ID</span>
                          <button className="pb-booking-id" onClick={() => copyBookingId(booking.bookingId || booking._id)}>
                            <code>{booking.bookingId || booking._id}</code>
                            {copiedId === (booking.bookingId || booking._id) ? (
                              <span className="pb-copied-tip">Copied!</span>
                            ) : (
                              <Copy style={{ width: 12, height: 12 }} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Timestamps */}
                      <div className="pb-detail-row">
                        <Calendar style={{ width: 14, height: 14, color: '#6b7385', flexShrink: 0 }} />
                        <div>
                          <span className="pb-detail-label">Booked on</span>
                          <span className="pb-detail-value">{formatTimestamp(booking.createdAt)}</span>
                        </div>
                      </div>
                      {booking.updatedAt !== booking.createdAt && (
                        <div className="pb-detail-row">
                          <Clock style={{ width: 14, height: 14, color: '#6b7385', flexShrink: 0 }} />
                          <div>
                            <span className="pb-detail-label">Last updated</span>
                            <span className="pb-detail-value">{formatTimestamp(booking.updatedAt)}</span>
                          </div>
                        </div>
                      )}

                      {/* Cancellation reason */}
                      {isCancelled && booking.cancellation?.reason && (
                        <div className="pb-cancel-reason-box">
                          <span className="pb-detail-label">Cancellation Reason</span>
                          <p className="pb-cancel-reason">{booking.cancellation.reason}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Quote thread ── */}
                  {isQuotePending && (
                    <div className="pb-premium-block">
                      <QuoteThread
                        booking={booking}
                        currentUser={user}
                        onUpdate={() => refreshOne(booking._id)}
                      />
                    </div>
                  )}

                  {/* ── ETA banner ── */}
                  {(isConfirmed || isInProgress) && (
                    <div className={`pb-eta-banner ${onTheWay ? 'pb-eta-active' : ''} ${arrived ? 'pb-eta-arrived' : ''}`}>
                      <div className="pb-eta-icon">
                        {arrived ? <MapPin style={{ width: 18, height: 18 }} /> :
                         onTheWay ? <Truck style={{ width: 18, height: 18 }} /> :
                         <Navigation style={{ width: 18, height: 18 }} />}
                      </div>
                      <div className="pb-eta-info">
                        <span className="pb-eta-title">
                          {arrived ? 'Marked arrived' :
                           onTheWay ? 'On the way' :
                           isInProgress ? 'Job in progress' :
                           'Set ETA when you head out'}
                        </span>
                        {etaDate && !arrived && !isInProgress && (
                          <span className="pb-eta-time">ETA {etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Live job timeline ── */}
                  {(isConfirmed || isInProgress || isCompleted || isDisputed) && (
                    <div className="pb-premium-block">
                      <JobTimeline
                        booking={booking}
                        role="housewife"
                        onChange={() => refreshOne(booking._id)}
                      />
                    </div>
                  )}

                  {/* ── Rate customer card ── */}
                  {isCompleted && !alreadyRated && (
                    <div className="pb-rate-customer">
                      <div className="pb-rate-head">
                        <Star style={{ width: 16, height: 16, color: '#FBBF24' }} />
                        <span>Rate this customer</span>
                      </div>
                      <div className="pb-rate-stars">
                        {[1, 2, 3, 4, 5].map((n) => {
                          const active = customerRating.bookingId === booking._id ? customerRating.rating >= n : 5 >= n;
                          return (
                            <button
                              key={n}
                              type="button"
                              className={`pb-rate-star ${active ? 'pb-rate-star-active' : ''}`}
                              onClick={() => setCustomerRating({ bookingId: booking._id, rating: n, comment: customerRating.bookingId === booking._id ? customerRating.comment : '' })}
                            >
                              <Star style={{ width: 18, height: 18, fill: active ? '#FBBF24' : 'transparent' }} />
                            </button>
                          );
                        })}
                      </div>
                      <textarea
                        className="pb-rate-comment"
                        placeholder="Optional note for the customer (politeness, prep, communication)"
                        value={customerRating.bookingId === booking._id ? customerRating.comment : ''}
                        onChange={(e) => setCustomerRating({ bookingId: booking._id, rating: customerRating.bookingId === booking._id ? customerRating.rating : 5, comment: e.target.value })}
                      />
                      <button
                        className="pb-rate-submit"
                        disabled={actionBusy === `crate-${booking._id}` || customerRating.bookingId !== booking._id}
                        onClick={submitCustomerRating}
                      >
                        {actionBusy === `crate-${booking._id}` ? 'Submitting…' : 'Submit rating'}
                      </button>
                    </div>
                  )}

                  {isCompleted && alreadyRated && (
                    <div className="pb-rate-done">
                      <Star style={{ width: 14, height: 14, fill: '#FBBF24', color: '#FBBF24' }} /> You rated this customer {booking.customerRatedByProvider.rating} / 5
                    </div>
                  )}

                  {/* ── Action bar ── */}
                  <div className="pb-action-bar">
                    {isConfirmed && !onTheWay && !arrived && (
                      <button
                        className="pb-act-btn pb-act-eta"
                        disabled={actionBusy === `eta-${booking._id}`}
                        onClick={() => setEtaDraft({ bookingId: booking._id, minutes: 30, note: '' })}
                      >
                        <Navigation style={{ width: 14, height: 14 }} /> Set ETA / On the way
                      </button>
                    )}
                    {isConfirmed && onTheWay && (
                      <button
                        className="pb-act-btn pb-act-arrived"
                        disabled={actionBusy === `arr-${booking._id}`}
                        onClick={() => handleArrived(booking._id)}
                      >
                        <MapPin style={{ width: 14, height: 14 }} /> Mark Arrived
                      </button>
                    )}
                    {isConfirmed && (arrived || onTheWay) && (
                      <button
                        className="pb-act-btn pb-act-start"
                        disabled={actionBusy === `start-${booking._id}`}
                        onClick={() => handleStart(booking._id)}
                      >
                        <PlayCircle style={{ width: 14, height: 14 }} /> Start Job
                      </button>
                    )}
                    {isConfirmed && !onTheWay && !arrived && (
                      <button
                        className="pb-act-btn pb-act-start pb-act-skip"
                        disabled={actionBusy === `start-${booking._id}`}
                        onClick={() => handleStart(booking._id)}
                        title="Skip ETA stages and start immediately"
                      >
                        <Zap style={{ width: 14, height: 14 }} /> Start Now
                      </button>
                    )}
                    {isInProgress && (
                      <button className="pb-act-btn pb-act-complete" onClick={() => openCompleteModal(booking)}>
                        <CheckCircle style={{ width: 14, height: 14 }} /> Mark Complete
                      </button>
                    )}
                    {isConfirmed && (
                      <button className="pb-act-btn pb-act-cancel" onClick={() => openCancelModal(booking)}>
                        <XCircle style={{ width: 14, height: 14 }} /> Cancel
                      </button>
                    )}
                    {isCompleted && booking.isReviewed && (
                      <span className="pb-review-badge"><Star style={{ width: 13, height: 13, fill: '#FBBF24', color: '#FBBF24' }} /> Reviewed</span>
                    )}
                    {isDisputed && (
                      <span className="pb-dispute-badge">
                        <AlertTriangle style={{ width: 13, height: 13 }} /> Dispute under review
                      </span>
                    )}
                    <button
                      className="pb-act-btn pb-act-chat"
                      onClick={(e) => { e.stopPropagation(); setChatBooking(booking); }}
                    >
                      <MessageCircle style={{ width: 13, height: 13 }} /> Chat
                    </button>
                    {/* Communication buttons */}
                    {booking.customer?.phone && (
                      <>
                        <a href={`tel:${booking.customer.phone}`} className="pb-act-btn pb-act-call" onClick={(e) => e.stopPropagation()}>
                          <Phone style={{ width: 13, height: 13 }} /> Call
                        </a>
                        <a href={waLink(booking)} target="_blank" rel="noopener noreferrer" className="pb-act-btn pb-act-wa" onClick={(e) => e.stopPropagation()}>
                          <MessageSquare style={{ width: 13, height: 13 }} /> WhatsApp
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════ ETA MODAL ═══════ */}
      {etaDraft.bookingId && (
        <div className="pb-eta-modal-backdrop" onClick={() => setEtaDraft({ bookingId: null, minutes: 30, note: '' })}>
          <div className="pb-eta-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pb-eta-modal-head">
              <Truck style={{ width: 18, height: 18, color: '#FF6B4A' }} />
              <span>Share ETA with customer</span>
              <button className="pb-eta-modal-close" onClick={() => setEtaDraft({ bookingId: null, minutes: 30, note: '' })}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <p className="pb-eta-modal-sub">Tell the customer how soon you'll be there. They'll get a live notification.</p>
            <label className="pb-eta-modal-label">Minutes from now</label>
            <div className="pb-eta-presets">
              {[10, 15, 30, 45, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`pb-eta-preset ${etaDraft.minutes === m ? 'pb-eta-preset-active' : ''}`}
                  onClick={() => setEtaDraft({ ...etaDraft, minutes: m })}
                >
                  {m} min
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="240"
              className="pb-eta-modal-input"
              value={etaDraft.minutes}
              onChange={(e) => setEtaDraft({ ...etaDraft, minutes: e.target.value })}
            />
            <label className="pb-eta-modal-label">Optional note</label>
            <input
              type="text"
              className="pb-eta-modal-input"
              placeholder="e.g. Stuck in traffic, will be there shortly"
              value={etaDraft.note}
              onChange={(e) => setEtaDraft({ ...etaDraft, note: e.target.value })}
            />
            <div className="pb-eta-modal-actions">
              <button
                className="pb-eta-modal-cancel"
                onClick={() => setEtaDraft({ bookingId: null, minutes: 30, note: '' })}
              >
                Cancel
              </button>
              <button
                className="pb-eta-modal-confirm"
                disabled={actionBusy === `eta-${etaDraft.bookingId}`}
                onClick={submitEta}
              >
                {actionBusy === `eta-${etaDraft.bookingId}` ? 'Sharing…' : 'Share ETA & start trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ CHAT DRAWER ═══════ */}
      <BookingChat
        bookingId={chatBooking?._id}
        currentUser={user}
        counterpart={chatBooking?.customer}
        open={!!chatBooking}
        onClose={() => setChatBooking(null)}
      />
    </div>
  );
};

export default ProviderBookings;
