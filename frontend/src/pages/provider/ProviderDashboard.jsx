import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { providerAPI, gamificationAPI } from '../../services/api';
import { cachedFetch, invalidateCache } from '../../utils/apiCache';
import {
  CalendarDays,
  Star,
  Users,
  Award,
  Trophy,
  Briefcase,
  CheckCircle,
  Clock,
  AlertCircle,
  Phone,
  Activity,
  Zap,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Eye,
  Edit3,
  X,
  Plus,
  IndianRupee,
  Pause,
  Play,
} from 'lucide-react';

/* ─── Greeting ─── */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/* ─── Relative time ─── */
const relativeTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

/* ─── Format currency ─── */
const formatCurrency = (val) => {
  if (!val && val !== 0) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN');
};

/* ─── Status config ─── */
const STATUS_CONFIG = {
  confirmed:  { label: 'Confirmed',   color: '#10B981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.25)' },
  pending:    { label: 'Pending',     color: '#FBBF24', bg: 'rgba(251,191,36,0.10)',   border: 'rgba(251,191,36,0.25)' },
  completed:  { label: 'Completed',   color: '#3B82F6', bg: 'rgba(59,130,246,0.10)',   border: 'rgba(59,130,246,0.25)' },
  cancelled:  { label: 'Cancelled',   color: '#EF4444', bg: 'rgba(239,68,68,0.10)',    border: 'rgba(239,68,68,0.25)' },
  inprogress: { label: 'In Progress', color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)',   border: 'rgba(139,92,246,0.25)' },
};
const getStatusCfg = (s) => STATUS_CONFIG[s] || { label: s || 'Unknown', color: '#6b7385', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' };

/* ─── Avatar gradient ─── */
const GRADIENTS = [
  'linear-gradient(135deg, #FF6B4A, #FF8C5A)',
  'linear-gradient(135deg, #3B82F6, #60A5FA)',
  'linear-gradient(135deg, #8B5CF6, #A78BFA)',
  'linear-gradient(135deg, #10B981, #34D399)',
  'linear-gradient(135deg, #EC4899, #F472B6)',
  'linear-gradient(135deg, #F59E0B, #FBBF24)',
];
const getGradient = (name) => GRADIENTS[(name || '').charCodeAt(0) % GRADIENTS.length];

/* ─── Category config ─── */
const CATEGORY_CONFIG = {
  cooking:   { emoji: '🍱', label: 'Cooking' },
  cleaning:  { emoji: '🧹', label: 'Cleaning' },
  tailoring: { emoji: '✂️', label: 'Tailoring' },
  tutoring:  { emoji: '📚', label: 'Tutoring' },
  beauty:    { emoji: '💄', label: 'Beauty' },
  gardening: { emoji: '🌱', label: 'Gardening' },
  childcare: { emoji: '👶', label: 'Childcare' },
  laundry:   { emoji: '👕', label: 'Laundry' },
};
const getCatCfg = (c) => CATEGORY_CONFIG[c?.toLowerCase()] || { emoji: '⭐', label: c || 'Service' };

/* ═══════════════════════════════════════
   COUNT-UP HOOK
   ═══════════════════════════════════════ */
const useCountUp = (end, duration = 800) => {
  const [value, setValue] = useState(0);
  const endNum = typeof end === 'number' ? end : parseFloat(end) || 0;
  useEffect(() => {
    if (endNum === 0) { setValue(0); return; }
    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(eased * endNum);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [endNum, duration]);
  return value;
};

/* Animated number display */
const AnimatedStat = ({ value, decimals = 0 }) => {
  const animated = useCountUp(value);
  return <>{decimals > 0 ? animated.toFixed(decimals) : Math.round(animated)}</>;
};

/* ═══════════════════════════════════════
   MINI SPARKLINE (SVG)
   ═══════════════════════════════════════ */
const Sparkline = ({ data = [], color = '#FF6B4A', width = 200, height = 50 }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });
  const pathD = 'M ' + pts.join(' L ');
  const areaD = pathD + ` L ${width},${height} L 0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="pd-sparkline" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <filter id="sparkGlow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={areaD} fill="url(#sparkGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" filter="url(#sparkGlow)" />
    </svg>
  );
};

/* ═══════════════════════════════════════
   CIRCULAR PROGRESS RING
   ═══════════════════════════════════════ */
const ProgressRing = ({ percent = 0, size = 130, strokeWidth = 10, color = '#FF6B4A' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const [offset, setOffset] = useState(circumference);
  useEffect(() => {
    const t = setTimeout(() => setOffset(circumference - (percent / 100) * circumference), 300);
    return () => clearTimeout(t);
  }, [percent, circumference]);
  return (
    <svg width={size} height={size} className="pd-progress-ring">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="pd-ring-text">
        {Math.round(percent)}%
      </text>
    </svg>
  );
};

/* Performance metric bar */
const PerfBar = ({ label, value, color }) => (
  <div className="pd-perf-row">
    <div className="pd-perf-meta">
      <span className="pd-perf-label">{label}</span>
      <span className="pd-perf-value" style={{ color }}>{value}%</span>
    </div>
    <div className="pd-perf-track">
      <div className="pd-perf-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  </div>
);

/* Toast notification */
const Toast = ({ message, type = 'info', onClose }) => (
  <div className={`pd-toast pd-toast-${type}`}>
    <span>{message}</span>
    <button onClick={onClose} className="pd-toast-close"><X style={{ width: 14, height: 14 }} /></button>
  </div>
);

/* Skeleton */
const Shimmer = ({ className = '' }) => <div className={`pd-shimmer ${className}`} />;
const DashboardSkeleton = () => (
  <div className="pd-page">
    <Shimmer className="pd-skel-hero" />
    <div className="pd-stats-grid"><Shimmer className="pd-skel-stat" /><Shimmer className="pd-skel-stat" /><Shimmer className="pd-skel-stat" /><Shimmer className="pd-skel-stat" /><Shimmer className="pd-skel-stat" /></div>
    <div className="pd-row-grid-55-45"><Shimmer className="pd-skel-panel" /><Shimmer className="pd-skel-panel" /></div>
  </div>
);

/* ═══════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ═══════════════════════════════════════ */
const ProviderDashboard = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalServices: 0, activeServices: 0, totalBookings: 0,
    pendingBookings: 0, confirmedBookings: 0, completedServices: 0,
    totalEarnings: 0, averageRating: 0, totalReviews: 0
  });
  const [todaysBookings, setTodaysBookings] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [toggling, setToggling] = useState(false);
  const [toast, setToast] = useState(null);
  const [gamification, setGamification] = useState(null);
  const servicesRef = useRef(null);
  const getSignal = useCallback(() => new AbortController().signal, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true); setError('');
      const signal = getSignal();
      const uid = user?._id || user?.id || '';
      const [dashRes, svcRes] = await Promise.allSettled([
        cachedFetch(`provider-dashboard-${uid}`, () => providerAPI.getDashboard({ signal }), { staleTime: 20000, signal }),
        cachedFetch(`provider-services-${uid}`, () => providerAPI.getMyServices({ limit: 10 }, { signal }), { staleTime: 30000, signal }),
      ]);
      // Interceptor already unwraps response.data, so value = { success, data: {...} }
      if (dashRes.status === 'fulfilled') {
        const raw = dashRes.value;
        if (raw?.success === false) {
          console.error('Dashboard API error:', raw.message);
          setError(raw.message || 'Failed to load dashboard');
        } else {
          const d = raw?.data || raw;
          if (d?.stats) setStats(d.stats);
          setTodaysBookings(d?.todaysBookings || []);
          setRecentBookings(d?.recentBookings || []);
        }
      } else {
        if (!isAbortError(dashRes.reason)) {
          console.error('Dashboard fetch failed:', dashRes.reason);
          setError('Failed to load dashboard stats');
        } else {
          return; // Abort — StrictMode remount will retry
        }
      }
      if (svcRes.status === 'fulfilled') {
        const svcRaw = svcRes.value;
        const svcData = svcRaw?.data?.services || svcRaw?.services || [];
        setServices(svcData);
      }
    } catch (err) { if (!isAbortError(err)) setError('Failed to load dashboard data'); }
    finally { setLoading(false); }
  }, [getSignal, user]);

  const toggleAvailability = async () => {
    try {
      setToggling(true);
      const newState = !user?.isAvailable;
      await providerAPI.toggleAvailability(newState);
      // Update AuthContext so UI reflects immediately
      updateUser({ isAvailable: newState });
      setToast({ message: newState ? "You're now Available" : "You're now Busy", type: newState ? 'success' : 'warning' });
      const uid = user?._id || user?.id || '';
      invalidateCache(`provider-dashboard-${uid}`);
      invalidateCache(`provider-services-${uid}`);
      setTimeout(() => { setToggling(false); fetchDashboardData(); }, 600);
    } catch { setToast({ message: 'Failed to update availability', type: 'error' }); setToggling(false); }
  };

  const handleBookingAction = async (bookingId, action) => {
    try {
      await providerAPI.updateBookingStatus(bookingId, { status: action });
      setToast({ message: `Booking ${action === 'confirmed' ? 'accepted' : 'declined'} successfully`, type: action === 'confirmed' ? 'success' : 'warning' });
      fetchDashboardData();
    } catch { setToast({ message: 'Action failed. Please try again.', type: 'error' }); }
  };

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  // Fetch gamification profile
  useEffect(() => {
    const uid = user?._id || user?.id;
    if (!uid) return;
    gamificationAPI.getProfile(uid).then(res => {
      if (res?.success) setGamification(res.data);
    }).catch(() => {});
  }, [user]);

  const firstName = (user?.name || 'there').split(' ')[0];
  const completionRate = stats.totalBookings > 0 ? Math.round((stats.completedServices / stats.totalBookings) * 100) : 0;

  if (loading) return <DashboardSkeleton />;
  if (error) return (
    <div className="pd-page pd-center">
      <div className="pd-error-card">
        <AlertCircle className="pd-error-icon" />
        <p className="pd-error-text">{error}</p>
        <button className="pd-cta-btn" onClick={fetchDashboardData}>Try Again</button>
      </div>
    </div>
  );

  return (
    <div className="pd-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ═══════ TOP HEADER BAR ═══════ */}
      <header className="pd-topbar">
        <h2 className="pd-topbar-title">Dashboard</h2>
        <div className="pd-topbar-right">
          <button className={`pd-avail-pill ${user?.isAvailable ? 'pd-avail-on' : 'pd-avail-off'}`} onClick={toggleAvailability} disabled={toggling}>
            <span className="pd-avail-dot-anim" />
            <span className="pd-avail-text">{toggling ? 'Updating...' : (user?.isAvailable ? 'Available' : 'Busy')}</span>
            {user?.isAvailable ? <ToggleRight className="pd-avail-icon" /> : <ToggleLeft className="pd-avail-icon" />}
          </button>
        </div>
      </header>

      {/* ═══════ HERO WELCOME ═══════ */}
      <section className="pd-section pd-hero">
        <div className="pd-hero-mesh" />
        <div className="pd-hero-mesh-2" />
        <div className="pd-hero-content">
          <div className="pd-hero-left">
            <h1 className="pd-hero-title">{getGreeting()}, {firstName} <span className="pd-wave">👋</span></h1>
            <p className="pd-hero-subtitle">Here's your business overview for today</p>
          </div>
          <div className="pd-hero-actions">
            <Link to="/provider/services/new" className="pd-cta-btn">
              <span className="pd-cta-shimmer" />
              <Plus style={{ width: 15, height: 15 }} />
              Add New Service
            </Link>
            <Link to="/provider/bookings" className="pd-cta-ghost">
              <CalendarDays style={{ width: 15, height: 15 }} />
              View Schedule
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ STATS ROW ═══════ */}
      <section className="pd-section pd-stats-grid">
        <div className="pd-stat-card">
          <div className="pd-stat-top">
            <div className="pd-stat-icon pd-stat-blue"><Briefcase style={{ width: 20, height: 20 }} /></div>
            <Link to="/provider/services/new" className="pd-stat-micro-btn" title="Add Service"><Plus style={{ width: 12, height: 12 }} /></Link>
          </div>
          <p className="pd-stat-number"><AnimatedStat value={stats.totalServices} /></p>
          <p className="pd-stat-label">Total Services</p>
          <p className="pd-stat-sub"><span className="pd-dot pd-dot-green" />{stats.activeServices} active</p>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-top">
            <div className="pd-stat-icon pd-stat-purple"><Users style={{ width: 20, height: 20 }} /></div>
          </div>
          <p className="pd-stat-number"><AnimatedStat value={stats.totalBookings} /></p>
          <p className="pd-stat-label">Total Bookings</p>
          <p className="pd-stat-sub"><span className="pd-dot pd-dot-amber" />{stats.pendingBookings} pending</p>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-top">
            <div className="pd-stat-icon pd-stat-green"><CheckCircle style={{ width: 20, height: 20 }} /></div>
          </div>
          <p className="pd-stat-number"><AnimatedStat value={stats.completedServices} /></p>
          <p className="pd-stat-label">Completed</p>
          <p className="pd-stat-sub">services done</p>
          <div className="pd-completion-bar"><div className="pd-completion-fill" style={{ width: `${completionRate}%` }} /></div>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-top">
            <div className="pd-stat-icon pd-stat-emerald"><IndianRupee style={{ width: 20, height: 20 }} /></div>
            <Link to="/provider/earnings" className="pd-stat-micro-btn" title="View Earnings"><ChevronRight style={{ width: 12, height: 12 }} /></Link>
          </div>
          <p className="pd-stat-number">{formatCurrency(stats.totalEarnings)}</p>
          <p className="pd-stat-label">Total Earnings</p>
          <p className="pd-stat-sub">{stats.completedServices > 0 ? `avg ${formatCurrency(Math.round(stats.totalEarnings / stats.completedServices))} / service` : 'no earnings yet'}</p>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-top">
            <div className="pd-stat-icon pd-stat-amber"><Star style={{ width: 20, height: 20 }} /></div>
          </div>
          <p className="pd-stat-number">{stats.averageRating > 0 ? <AnimatedStat value={stats.averageRating} decimals={1} /> : 'N/A'}</p>
          <p className="pd-stat-label">Avg Rating</p>
          <p className="pd-stat-sub">{stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}</p>
          <div className="pd-mini-stars">
            {[1,2,3,4,5].map(i => (
              <Star key={i} style={{ width: 12, height: 12, fill: i <= Math.round(stats.averageRating) ? '#FF6B4A' : 'transparent', color: i <= Math.round(stats.averageRating) ? '#FF6B4A' : '#3a3f4e' }} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ ROW 1 — Schedule ═══════ */}
      <section className="pd-section">
        {/* Today's Schedule */}
        <div className="pd-panel">
          <div className="pd-panel-header">
            <div className="pd-panel-header-left">
              <div className="pd-accent-bar" />
              <CalendarDays style={{ width: 16, height: 16, color: '#3B82F6' }} />
              <span className="pd-panel-title">Today's Schedule</span>
              <span className="pd-date-chip">{new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <Link to="/provider/bookings" className="pd-panel-link">View Full Calendar <ChevronRight style={{ width: 14, height: 14 }} /></Link>
          </div>
          <div className="pd-panel-body">
            {todaysBookings.length === 0 ? (
              <div className="pd-empty-schedule">
                <div className="pd-empty-illust">☀️</div>
                <h4 className="pd-empty-title">Your day is clear</h4>
                <p className="pd-empty-sub">No bookings scheduled for today</p>
                <Link to="/provider/profile" className="pd-empty-btn">Update Availability</Link>
              </div>
            ) : (
              <div className="pd-schedule-timeline">
                {todaysBookings.map((booking, idx) => {
                  const sc = getStatusCfg(booking.status);
                  const initials = (booking.customer?.name || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={booking._id} className="pd-timeline-slot" style={{ animationDelay: `${idx * 60}ms`, borderLeftColor: sc.color }}>
                      <div className="pd-timeline-time"><Clock style={{ width: 12, height: 12 }} />{booking.scheduledTime?.start || '--'}</div>
                      <div className="pd-timeline-card">
                        <div className="pd-timeline-avatar" style={{ background: getGradient(booking.customer?.name) }}>{initials}</div>
                        <div className="pd-timeline-info">
                          <p className="pd-timeline-service">{booking.service?.title || 'Service'}</p>
                          <p className="pd-timeline-customer">{booking.customer?.name || 'Customer'} <span className="pd-timeline-range">• {booking.scheduledTime?.start} – {booking.scheduledTime?.end}</span></p>
                        </div>
                        <div className="pd-timeline-actions">
                          <span className="pd-status-pill" style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>{sc.label}</span>
                          {booking.customer?.phone && <a href={`tel:${booking.customer.phone}`} className="pd-icon-btn" title="Call"><Phone style={{ width: 13, height: 13 }} /></a>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════ ROW 2 — Recent Bookings + Performance ═══════ */}
      <section className="pd-section pd-row-grid-60-40">
        {/* Recent Bookings */}
        <div className="pd-panel">
          <div className="pd-panel-header">
            <div className="pd-panel-header-left">
              <div className="pd-accent-bar" />
              <Activity style={{ width: 16, height: 16, color: '#8B5CF6' }} />
              <span className="pd-panel-title">Recent Bookings</span>
            </div>
            <Link to="/provider/bookings" className="pd-panel-link">View All <ChevronRight style={{ width: 14, height: 14 }} /></Link>
          </div>
          <div className="pd-panel-body pd-bookings-table-wrap">
            {recentBookings.length === 0 ? (
              <div className="pd-empty-mini"><Clock style={{ width: 24, height: 24, color: '#6b7385' }} /><p>No recent bookings</p></div>
            ) : (
              <div className="pd-bookings-table">
                {recentBookings.map((booking, idx) => {
                  const sc = getStatusCfg(booking.status);
                  const initials = (booking.customer?.name || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const isPending = booking.status === 'pending';
                  return (
                    <div key={booking._id} className="pd-booking-row" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="pd-booking-row-avatar" style={{ background: getGradient(booking.customer?.name) }}>{initials}</div>
                      <div className="pd-booking-row-info">
                        <span className="pd-booking-row-name">{booking.customer?.name || 'Customer'}</span>
                        <span className="pd-booking-row-service">{booking.service?.title || 'Service'}</span>
                      </div>
                      <span className="pd-booking-row-date">{relativeTime(booking.createdAt)}</span>
                      <span className="pd-booking-row-price">{formatCurrency(booking.pricing?.amount || booking.service?.pricing?.amount)}</span>
                      <span className="pd-status-pill-sm" style={{ color: sc.color, background: sc.bg, borderColor: sc.border }}>{sc.label}</span>
                      <div className="pd-booking-row-actions">
                        {isPending ? (
                          <>
                            <button className="pd-micro-btn pd-micro-accept" onClick={() => handleBookingAction(booking._id, 'confirmed')}>Accept</button>
                            <button className="pd-micro-btn pd-micro-decline" onClick={() => handleBookingAction(booking._id, 'cancelled')}>Decline</button>
                          </>
                        ) : (
                          <Link to="/provider/bookings" className="pd-micro-btn pd-micro-view">View</Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Performance Panel */}
        <div className="pd-panel">
          <div className="pd-panel-header">
            <div className="pd-panel-header-left">
              <div className="pd-accent-bar pd-accent-bar-coral" />
              <Zap style={{ width: 16, height: 16, color: '#FF6B4A' }} />
              <span className="pd-panel-title">Your Performance</span>
            </div>
          </div>
          <div className="pd-panel-body pd-perf-body">
            <div className="pd-perf-ring-wrap">
              <ProgressRing percent={completionRate} size={130} strokeWidth={10} color="#FF6B4A" />
              <p className="pd-perf-ring-label">Completion Rate</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ ROW 3 — My Services (Full Width Scroll) ═══════ */}
      <section className="pd-section pd-services-section">
        <div className="pd-panel">
          <div className="pd-panel-header">
            <div className="pd-panel-header-left">
              <div className="pd-accent-bar" />
              <Briefcase style={{ width: 16, height: 16, color: '#3B82F6' }} />
              <span className="pd-panel-title">My Services</span>
            </div>
            <Link to="/provider/services/new" className="pd-add-service-btn"><Plus style={{ width: 14, height: 14 }} /> Add Service</Link>
          </div>
          <div className="pd-services-scroll" ref={servicesRef}>
            {services.length === 0 ? (
              <div className="pd-empty-services">
                <Briefcase style={{ width: 32, height: 32, color: '#6b7385' }} />
                <p>No services yet</p>
                <Link to="/provider/services/new" className="pd-cta-btn pd-cta-btn-sm"><Plus style={{ width: 14, height: 14 }} /> Create Your First Service</Link>
              </div>
            ) : (
              services.map((svc, idx) => {
                const cat = getCatCfg(svc.category);
                return (
                  <div key={svc._id} className="pd-service-card" style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="pd-service-cover" style={{ background: getGradient(svc.title) }}>
                      <span className="pd-service-emoji">{cat.emoji}</span>
                      {(svc.bookingCount || 0) > 0 && <span className="pd-service-badge">{svc.bookingCount} bookings</span>}
                    </div>
                    <div className="pd-service-body">
                      <h4 className="pd-service-name">{svc.title}</h4>
                      <span className="pd-service-cat">{cat.label}</span>
                      <div className="pd-service-meta">
                        <span className="pd-service-price">{formatCurrency(svc.pricing?.amount || svc.price)}</span>
                        {svc.duration?.estimated && <span className="pd-service-duration"><Clock style={{ width: 11, height: 11 }} />{svc.duration.estimated} min</span>}
                      </div>
                      <div className="pd-service-footer">
                        <span className={`pd-service-status ${svc.status === 'active' ? 'pd-svc-active' : 'pd-svc-paused'}`}>
                          {svc.status === 'active' ? <Play style={{ width: 10, height: 10 }} /> : <Pause style={{ width: 10, height: 10 }} />}
                          {svc.status === 'active' ? 'Active' : 'Paused'}
                        </span>
                        <div className="pd-service-btns">
                          <Link to={`/provider/services/${svc._id}/edit`} className="pd-svc-btn" title="Edit"><Edit3 style={{ width: 12, height: 12 }} /></Link>
                          <Link to="/provider/bookings" className="pd-svc-btn" title="Bookings"><Eye style={{ width: 12, height: 12 }} /></Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ═══════ GAMIFICATION / BADGES ═══════ */}
      {gamification && (
        <section className="mt-5 px-4 sm:px-6">
          <div className="bg-surface-overlay border border-surface-border rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-border flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-content-primary flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" /> Badges & Level
              </h2>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Level {gamification.level?.current?.level || 1} — {gamification.level?.current?.name || 'Beginner'}
              </span>
            </div>
            <div className="p-5">
              {/* Level progress */}
              {gamification.level?.next && (
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[11px] text-content-muted">{gamification.stats?.completedBookings || 0} bookings</span>
                    <span className="text-[11px] text-content-muted">{gamification.level.next.minBookings} needed for {gamification.level.next.name}</span>
                  </div>
                  <div className="w-full h-2 bg-surface-border rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, ((gamification.stats?.completedBookings || 0) / (gamification.level.next.minBookings || 100)) * 100)}%` }} />
                  </div>
                  {gamification.level.progress && (
                    <div className="flex gap-4 mt-2">
                      {gamification.level.progress.bookingsNeeded > 0 && (
                        <span className="text-[10px] text-content-muted">{gamification.level.progress.bookingsNeeded} more bookings needed</span>
                      )}
                      {gamification.level.progress.ratingNeeded > 0 && (
                        <span className="text-[10px] text-content-muted">Rating needs +{gamification.level.progress.ratingNeeded.toFixed(1)}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
              {!gamification.level?.next && (
                <div className="mb-4 text-center">
                  <span className="text-xs text-amber-400 font-medium">🏆 Maximum level reached!</span>
                </div>
              )}
              {/* Badges */}
              {gamification.badges?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {gamification.badges.map((badge, i) => (
                    <div key={i} className="flex flex-col items-center p-3 rounded-xl bg-surface-raised border border-surface-border hover:border-amber-500/30 transition-colors">
                      <span className="text-2xl mb-1.5">{badge.icon}</span>
                      <span className="text-[11px] font-medium text-content-primary text-center">{badge.name}</span>
                      <span className="text-[9px] text-content-muted text-center mt-0.5">{badge.description}</span>
                      <span className="text-[8px] text-amber-400/70 mt-1 uppercase tracking-wider">{badge.tier}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-content-muted text-center py-4">Complete bookings to earn badges!</p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default ProviderDashboard;
