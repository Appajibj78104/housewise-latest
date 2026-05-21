import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { showToast } from '../../utils/toast';
import EmptyState from '../../components/shared/EmptyState';
import {
  Calendar, Clock, Star, MapPin, Phone, Eye, Search,
  ChevronLeft, ChevronRight, XCircle, AlertCircle,
  CheckCircle, Loader2, Sparkles, Filter, ArrowUpRight,
  CalendarClock, Package, FileText, Tag, AlertTriangle
} from 'lucide-react';
import { customerAPI } from '../../services/api';

/* ─── Constants ─── */
const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

const STATUS_CONFIG = {
  quote_pending: { color: '#a855f7', bg: 'rgba(168,85,247,0.10)', border: 'rgba(168,85,247,0.25)', icon: Tag,         label: 'Quote' },
  pending:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', icon: Clock,       label: 'Pending' },
  confirmed:   { color: '#10b981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', icon: CheckCircle, label: 'Confirmed' },
  in_progress: { color: '#6366f1', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.25)', icon: Loader2,     label: 'In Progress' },
  completed:   { color: '#06b6d4', bg: 'rgba(6,182,212,0.10)',  border: 'rgba(6,182,212,0.25)',  icon: CheckCircle, label: 'Completed' },
  cancelled:   { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  icon: XCircle,     label: 'Cancelled' },
  declined:    { color: '#ef4444', bg: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.25)',  icon: XCircle,     label: 'Declined' },
  no_show:     { color: '#6b7385', bg: 'rgba(107,115,133,0.10)', border: 'rgba(107,115,133,0.25)', icon: AlertCircle, label: 'Completed' },
};

/* Map dispute/dispute-related statuses back to their primary display status */
const getPrimaryStatus = (status) => {
  if (['resolved', 'rejected'].includes(status)) return 'completed';
  if (status === 'disputed') return 'completed';
  return status;
};

const CATEGORY_EMOJI = {
  cooking: '🍳', cleaning: '🧹', tailoring: '✂️', beauty: '💄',
  tutoring: '📚', childcare: '👶', gardening: '🌿', other: '🔧',
};

const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg,#FF6B4A 0%,#FF8C5A 100%)',
  'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
  'linear-gradient(135deg,#06b6d4 0%,#22d3ee 100%)',
  'linear-gradient(135deg,#10b981 0%,#34d399 100%)',
  'linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%)',
  'linear-gradient(135deg,#ec4899 0%,#f472b6 100%)',
];

/* ─── Helpers ─── */
const gradientFor = (str) => PLACEHOLDER_GRADIENTS[(str?.charCodeAt(0) || 0) % PLACEHOLDER_GRADIENTS.length];
const getInitials = (name) => name ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatTime = (t) => {
  if (!t) return '';
  try {
    return new Date(`2000-01-01T${t}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch { return t; }
};

const isUpcoming = (booking) => {
  if (!['pending', 'confirmed'].includes(booking.status)) return false;
  return new Date(`${booking.scheduledDate}T${booking.scheduledTime?.start || '00:00'}`) > new Date();
};

const canCancel = (booking) => {
  if (!['pending', 'confirmed'].includes(booking.status)) return false;
  const dt = new Date(`${booking.scheduledDate}T${booking.scheduledTime?.start || '00:00'}`);
  return (dt.getTime() - Date.now()) / 3600000 >= 2;
};

/* ─── Skeleton ─── */
const SkeletonCard = () => (
  <div className="cb-card cb-skeleton-card">
    <div className="cb-card-left">
      <div className="cb-shimmer" style={{ width: 52, height: 52, borderRadius: 14 }} />
      <div style={{ flex: 1 }}>
        <div className="cb-shimmer" style={{ width: '60%', height: 16, borderRadius: 6 }} />
        <div className="cb-shimmer" style={{ width: '40%', height: 12, borderRadius: 6, marginTop: 8 }} />
        <div className="cb-shimmer" style={{ width: '80%', height: 12, borderRadius: 6, marginTop: 8 }} />
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   CUSTOMER BOOKINGS PAGE
   ═══════════════════════════════════════════════════════════ */
const CustomerBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [cancellingId, setCancellingId] = useState(null);
  const debounceRef = useRef(null);
  const getSignal = useCallback(() => new AbortController().signal, []);

  /* ─── Debounce search input (400ms) ─── */
  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPagination(p => ({ ...p, page: 1 }));
    }, 400);
  };

  /* ─── Fetch ─── */
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const signal = getSignal();
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(activeTab !== 'all' && { status: activeTab }),
        ...(debouncedSearch && { search: debouncedSearch }),
      };
      const response = await customerAPI.getBookings(params, { signal });
      setBookings(response.data?.bookings || []);
      setPagination(p => ({ ...p, ...(response.data?.pagination || {}) }));
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err.response?.data?.message || err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, pagination.page, pagination.limit, getSignal]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  /* ─── Cancel ─── */
  const handleCancel = async (bookingId) => {
    const reason = prompt('Reason for cancellation:');
    if (!reason) return;
    try {
      setCancellingId(bookingId);
      await customerAPI.cancelBooking(bookingId, reason);
      fetchBookings();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  /* ─── Stats ─── */
  const upcomingCount = bookings.filter(isUpcoming).length;
  const completedCount = bookings.filter(b => ['completed', 'resolved'].includes(b.status)).length;

  return (
    <div className="cb-page">

      {/* ────── HEADER ────── */}
      <div className="cb-header">
        <div className="cb-header-left">
          <h1 className="cb-title">My Bookings</h1>
          <p className="cb-subtitle">Track and manage all your service bookings</p>
        </div>
        <Link to="/customer/services" className="cb-new-btn">
          <Sparkles size={15} /> Book New Service
        </Link>
      </div>

      {/* ────── QUICK STATS ────── */}
      <div className="cb-stats-row">
        <div className="cb-stat-chip">
          <Package size={15} />
          <span><strong>{pagination.total || bookings.length}</strong> Total</span>
        </div>
        {upcomingCount > 0 && (
          <div className="cb-stat-chip cb-stat-accent">
            <CalendarClock size={15} />
            <span><strong>{upcomingCount}</strong> Upcoming</span>
          </div>
        )}
        {completedCount > 0 && (
          <div className="cb-stat-chip">
            <CheckCircle size={15} />
            <span><strong>{completedCount}</strong> Completed</span>
          </div>
        )}
      </div>

      {/* ────── FILTER BAR ────── */}
      <div className="cb-filter-bar">
        <div className="cb-tabs">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.key}
              className={`cb-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.key); setPagination(p => ({ ...p, page: 1 })); }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="cb-search-wrap">
          <Search size={15} className="cb-search-icon" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="cb-search"
          />
        </div>
      </div>

      {/* ────── ERROR ────── */}
      {error && (
        <div className="cb-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ────── LOADING ────── */}
      {loading ? (
        <div className="cb-list">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : bookings.length === 0 ? (
        /* ────── EMPTY STATE ────── */
        <EmptyState
          type="bookings"
          title="No bookings found"
          description={activeTab === 'all' ? "You haven't made any bookings yet." : `No ${activeTab} bookings.`}
          actionText="Browse Services"
          actionTo="/customer/services"
        />
      ) : (
        /* ────── BOOKINGS LIST ────── */
        <div className="cb-list">
          {bookings.map((booking, idx) => {
            const primaryStatus = getPrimaryStatus(booking.status);
            const sc = STATUS_CONFIG[primaryStatus] || STATUS_CONFIG.pending;
            const StatusIcon = sc.icon;
            const catEmoji = CATEGORY_EMOJI[booking.service?.category] || '🔧';
            const providerName = booking.provider?.name || 'Provider';

            return (
              <div
                key={booking._id}
                className="cb-card"
                style={{ animationDelay: `${idx * 40}ms` }}
                onClick={() => navigate(`/customer/bookings/${booking._id}`)}
                role="button"
                tabIndex={0}
              >
                {/* Left: Avatar */}
                <div className="cb-card-avatar" style={{ background: gradientFor(providerName) }}>
                  {getInitials(providerName)}
                </div>

                {/* Center: Info */}
                <div className="cb-card-body">
                  <div className="cb-card-top-row">
                    <h3 className="cb-card-title">
                      <span className="cb-card-emoji">{catEmoji}</span>
                      {booking.service?.title || 'Service'}
                    </h3>
                    <div className="cb-status-badges-group">
                      {/* Main Status Badge */}
                      <span
                        className="cb-status-badge"
                        style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}
                      >
                        <StatusIcon size={12} /> {sc.label}
                      </span>
                      {/* Dispute Status Badge */}
                      {booking.dispute?.status && (
                        <span
                          className="cb-status-badge cb-dispute-badge"
                          style={{
                            color: booking.dispute.status === 'open' ? '#F59E0B' : booking.dispute.status === 'resolved' ? '#10B981' : '#6b7385',
                            background: booking.dispute.status === 'open' ? 'rgba(245,158,11,0.10)' : booking.dispute.status === 'resolved' ? 'rgba(16,185,129,0.10)' : 'rgba(107,115,133,0.10)',
                            borderColor: booking.dispute.status === 'open' ? 'rgba(245,158,11,0.25)' : booking.dispute.status === 'resolved' ? 'rgba(16,185,129,0.25)' : 'rgba(107,115,133,0.25)'
                          }}
                        >
                          <AlertTriangle size={12} /> {booking.dispute.status === 'open' ? 'Dispute' : booking.dispute.status === 'resolved' ? 'Resolved' : 'Closed'}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="cb-card-provider">with {providerName}</p>

                  <div className="cb-card-meta">
                    <span className="cb-meta-item">
                      <Calendar size={13} /> {formatDate(booking.scheduledDate)}
                    </span>
                    <span className="cb-meta-item">
                      <Clock size={13} /> {formatTime(booking.scheduledTime?.start)}
                      {booking.scheduledTime?.end ? ` – ${formatTime(booking.scheduledTime.end)}` : ''}
                    </span>
                    {booking.pricing?.agreedAmount > 0 && (
                      <span className="cb-meta-price">₹{booking.pricing.agreedAmount}</span>
                    )}
                  </div>

                  {booking.customerNotes && (
                    <p className="cb-card-notes">
                      <strong>Note:</strong> {booking.customerNotes}
                    </p>
                  )}
                </div>

                {/* Right: Actions */}
                <div className="cb-card-actions" onClick={(e) => e.stopPropagation()}>
                  {booking.provider?.phone && (
                    <a href={`tel:${booking.provider.phone}`} className="cb-action-btn" title="Call provider">
                      <Phone size={15} />
                    </a>
                  )}
                  <Link to={`/customer/bookings/${booking._id}`} className="cb-action-btn" title="View details">
                    <ArrowUpRight size={15} />
                  </Link>

                  {['completed', 'resolved'].includes(booking.status) && !booking.isReviewed && (
                    <Link to={`/customer/reviews/new?booking=${booking._id}`} className="cb-action-btn cb-action-star" title="Write review">
                      <Star size={15} />
                    </Link>
                  )}

                  {['completed', 'resolved'].includes(booking.status) && (
                    <Link 
                      to={`/customer/invoice/${booking._id}`} 
                      className="cb-action-btn cb-action-invoice" 
                      title="View Invoice - Official bill for this service"
                    >
                      <FileText size={15} />
                    </Link>
                  )}

                  {canCancel(booking) && (
                    <button
                      className="cb-action-btn cb-action-danger"
                      title="Cancel booking"
                      disabled={cancellingId === booking._id}
                      onClick={() => handleCancel(booking._id)}
                    >
                      {cancellingId === booking._id ? <Loader2 size={15} className="cb-spin" /> : <XCircle size={15} />}
                    </button>
                  )}
                </div>

                {/* Footer */}
                <div className="cb-card-footer">
                  <span>Booked {formatDate(booking.createdAt)}</span>
                  {booking.duration?.estimated && <span>{booking.duration.estimated} min</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ────── PAGINATION ────── */}
      {pagination.pages > 1 && (
        <div className="cb-pagination">
          <button
            className="cb-page-btn"
            disabled={pagination.page <= 1}
            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="cb-page-info">
            Page <strong>{pagination.page}</strong> of <strong>{pagination.pages}</strong>
          </span>
          <button
            className="cb-page-btn"
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomerBookings;
