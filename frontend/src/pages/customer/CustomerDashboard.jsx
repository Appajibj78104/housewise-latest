import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cachedFetch } from '../../utils/apiCache';
import {
  Calendar,
  Clock,
  Star,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Heart,
  Search,
  ArrowRight,
  RefreshCw,
  Sparkles,
  RotateCcw,
  Eye,
  Map,
  Zap,
} from 'lucide-react';
import { customerAPI, recommendationsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useSocket from '../../hooks/useSocket';

/* ─── Category config ─── */
const CATEGORY_CONFIG = {
  cooking:   { emoji: '\u{1F371}', label: 'Cooking',   color: '#f97316', bg: 'rgba(249,115,22,0.10)' },
  cleaning:  { emoji: '\u{1F9F9}', label: 'Cleaning',  color: '#06b6d4', bg: 'rgba(6,182,212,0.10)' },
  tailoring: { emoji: '\u2702\uFE0F', label: 'Tailoring', color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)' },
  tutoring:  { emoji: '\u{1F4DA}', label: 'Tutoring',  color: '#3b82f6', bg: 'rgba(59,130,246,0.10)' },
  beauty:    { emoji: '\u{1F484}', label: 'Beauty',    color: '#ec4899', bg: 'rgba(236,72,153,0.10)' },
  gardening: { emoji: '\u{1F331}', label: 'Gardening', color: '#10b981', bg: 'rgba(16,185,129,0.10)' },
  childcare: { emoji: '\u{1F476}', label: 'Childcare', color: '#a855f7', bg: 'rgba(168,85,247,0.10)' },
};
const getCfg = (cat) => CATEGORY_CONFIG[cat] || { emoji: '\u2B50', label: cat || 'Service', color: '#ff6b6b', bg: 'rgba(255,107,107,0.10)' };

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

/* ─── Status helpers ─── */
const STATUS_MAP = {
  confirmed:  { label: 'Confirmed',   cls: 'cd-pill-green' },
  pending:    { label: 'Pending',     cls: 'cd-pill-yellow' },
  cancelled:  { label: 'Cancelled',   cls: 'cd-pill-red' },
  completed:  { label: 'Completed',   cls: 'cd-pill-blue' },
  inprogress: { label: 'In Progress', cls: 'cd-pill-purple' },
};
const getStatus = (s) => STATUS_MAP[s] || { label: s, cls: 'cd-pill-muted' };

/* ═══════════════════════════════════════
   SKELETON LOADER
   ═══════════════════════════════════════ */
const SkeletonPulse = ({ className = '' }) => (
  <div className={`cd-skeleton rounded-lg ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="cd-page">
    <SkeletonPulse className="h-40 rounded-2xl mb-7" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
      {[1,2,3,4].map(i => <SkeletonPulse key={i} className="h-28 rounded-2xl" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <SkeletonPulse className="lg:col-span-3 h-80 rounded-2xl" />
      <SkeletonPulse className="lg:col-span-2 h-80 rounded-2xl" />
    </div>
  </div>
);

/* ═══════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════ */
const CustomerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket, connect } = useSocket();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [recSection, setRecSection] = useState({ title: 'Recommended For You', icon: 'sparkles', hasHistory: false });

  // Simple fallback for abort signal - creates new controller each call
  const getSignal = useCallback(() => new AbortController().signal, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const signal = getSignal();
      const response = await cachedFetch('customer-dashboard', () => customerAPI.getDashboard({ signal }), { staleTime: 30000, signal });
      if (!response || response.success === false) {
        setError(response?.message || 'Failed to load dashboard');
        return;
      }
      setDashboardData(response.data || response);
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err?.message || err?.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [getSignal]);

  // Initialize socket connection and listen for booking status changes
  useEffect(() => {
    connect();
  }, [connect]);

  // Listen for real-time booking status updates from provider
  useEffect(() => {
    if (!socket) return;

    const handleBookingStatusChanged = (data) => {
      console.debug('[Dashboard] Booking status changed:', data);
      // Refetch dashboard data to update stats in real-time
      fetchDashboardData();
    };

    socket.on('booking:status-changed', handleBookingStatusChanged);

    return () => {
      socket.off('booking:status-changed', handleBookingStatusChanged);
    };
  }, [socket, fetchDashboardData]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  // Fetch recommendations: personalized first, fallback to trending
  useEffect(() => {
    const fetchRecs = async () => {
      try {
        // Try personalized recommendations first (requires auth)
        const res = await recommendationsAPI.getPersonalized(8);
        if (res?.success) {
          const services = res.data?.services || res.data?.recommendations || [];
          if (services.length > 0) {
            setRecommendations(services.slice(0, 8));
            const hasHistory = res.data?.basedOn?.hasHistory || res.data?.basedOn?.bookingCount > 0;
            setRecSection({
              title: hasHistory ? 'Recommended For You' : 'Top Rated Services',
              icon: hasHistory ? 'sparkles' : 'star',
              hasHistory,
            });
            return;
          }
        }
      } catch (e) { /* personalized failed, try trending */ }

      try {
        const res = await recommendationsAPI.getTrending();
        if (res?.success) {
          const services = res.data?.services || [];
          if (services.length > 0) {
            setRecommendations(services.slice(0, 8));
            setRecSection({ title: 'Trending Services', icon: 'zap', hasHistory: false });
          }
        }
      } catch (e) { /* silent */ }
    };
    fetchRecs();
  }, []);

  const firstName = (user?.name || 'there').split(' ')[0];

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center bg-surface-overlay border border-surface-border rounded-2xl p-8 max-w-sm shadow-xl">
          <AlertCircle className="w-10 h-10 text-coral-400 mx-auto mb-4" />
          <p className="text-content-secondary text-sm mb-5">{error}</p>
          <button onClick={fetchDashboardData} className="cd-cta-btn text-sm px-6 py-2.5">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    upcomingBookings = [],
    recentBookings = [],
    stats = {},
    favoriteCategories = [],
    rating = { averageRating: 0, totalReviews: 0 },
  } = dashboardData || {};

  const statCards = [
    { label: 'Total Bookings', value: stats.total ?? 0, icon: <Calendar className="w-5 h-5" />, gradient: 'cd-stat-blue', trend: stats.total > 0 ? '+12%' : '0', trendUp: stats.total > 0, trendLabel: 'this month' },
    { label: 'Completed', value: stats.completed ?? 0, icon: <CheckCircle className="w-5 h-5" />, gradient: 'cd-stat-green', trend: stats.completed > 0 ? '+8%' : '0', trendUp: stats.completed > 0, trendLabel: 'this month' },
    { label: 'Pending', value: stats.pending ?? 0, icon: <Clock className="w-5 h-5" />, gradient: 'cd-stat-purple', trend: stats.pending > 0 ? `${stats.pending} active` : 'None', trendUp: null, trendLabel: '' },
    { label: 'My Rating', value: rating.averageRating > 0 ? rating.averageRating.toFixed(1) : 'N/A', icon: <Star className="w-5 h-5" />, gradient: 'cd-stat-yellow', trend: rating.totalReviews > 0 ? `${rating.totalReviews} review${rating.totalReviews !== 1 ? 's' : ''}` : 'No reviews', trendUp: null, trendLabel: '' },
  ];

  const activityItems = recentBookings.slice(0, 5).map((b) => ({
    id: b._id,
    type: b.status,
    text: (<><strong>{b.service?.title || 'Service'}</strong> with <strong>{b.provider?.name || 'Provider'}</strong> was {b.status}</>),
    time: relativeTime(b.updatedAt || b.createdAt),
    category: b.service?.category,
  }));

  return (
    <div className="cd-page">

      {/* ═══════ ① HERO BANNER ═══════ */}
      <section className="cd-section cd-hero">
        <div className="cd-hero-glow" />
        <div className="cd-hero-glow-2" />
        <div className="relative z-[1]">
          <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-content-primary mb-2">
            {getGreeting()}, {firstName} <span className="inline-block animate-wave">👋</span>
          </h1>
          <p className="text-sm text-content-secondary max-w-lg leading-relaxed mb-6">
            {upcomingBookings.length > 0
              ? <>You have <strong className="text-content-primary">{upcomingBookings.length} upcoming booking{upcomingBookings.length !== 1 ? 's' : ''}</strong> this week. Your home is in great hands.</>
              : <>Welcome back! Browse services near you and book your next home service.</>}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/customer/services">
              <button className="cd-cta-btn">
                <span className="cd-cta-shimmer" />
                <Search className="w-4 h-4" />
                Browse Services
                <ArrowRight className="w-3.5 h-3.5 opacity-70" />
              </button>
            </Link>
            <Link to="/customer/map">
              <button className="cd-cta-btn-ghost">
                <Map className="w-4 h-4" />
                Map View
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════ ② STAT CARDS ═══════ */}
      <section className="cd-section grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        {statCards.map((s, i) => (
          <div key={i} className="cd-stat-card group">
            <div className={`cd-stat-icon ${s.gradient}`}>{s.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-content-muted uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-[26px] font-extrabold tracking-tight text-content-primary leading-none">{s.value}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {s.trendUp === true && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                {s.trendUp === false && <TrendingDown className="w-3 h-3 text-rose-400" />}
                <span className={`text-[10px] font-semibold ${s.trendUp === true ? 'text-emerald-400' : s.trendUp === false ? 'text-rose-400' : 'text-content-muted'}`}>
                  {s.trend} {s.trendLabel}
                </span>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ═══════ ③ + ④ BOOKINGS + FAVORITES ═══════ */}
      <section className="cd-section grid grid-cols-1 lg:grid-cols-5 gap-5 mb-7">

        {/* Upcoming Bookings */}
        <div className="lg:col-span-3 cd-panel">
          <div className="cd-panel-header">
            <h2 className="text-[15px] font-bold text-content-primary tracking-tight">Upcoming Bookings</h2>
            <Link to="/customer/bookings?status=upcoming" className="cd-panel-link">View all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="p-4 sm:p-5">
            {upcomingBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-7 h-7 text-content-muted" />
                </div>
                <p className="text-sm text-content-secondary mb-1">No upcoming bookings</p>
                <p className="text-xs text-content-muted mb-4">Book your first service to get started</p>
                <Link to="/customer/services">
                  <button className="cd-cta-btn text-xs px-5 py-2"><Search className="w-3.5 h-3.5" /> Find Services</button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingBookings.map((booking) => {
                  const cfg = getCfg(booking.service?.category);
                  const st = getStatus(booking.status);
                  return (
                    <div key={booking._id} className="cd-booking-card group" onClick={() => navigate(`/customer/bookings/${booking._id}`)}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: cfg.bg }}>
                        {cfg.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-[13px] font-semibold text-content-primary truncate">{booking.provider?.name || 'Provider'}</h3>
                          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full capitalize shrink-0" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-content-muted">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(booking.scheduledDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{booking.scheduledTime?.start || 'TBD'}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className={`cd-status-pill ${st.cls}`}>{st.label}</span>
                        <button className="cd-view-btn opacity-0 group-hover:opacity-100"><Eye className="w-3 h-3" /> Details</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Favorites */}
        <div className="lg:col-span-2 cd-panel">
          <div className="cd-panel-header">
            <h2 className="text-[15px] font-bold text-content-primary tracking-tight">Your Favorites</h2>
            <Link to="/customer/services" className="cd-panel-link">Browse <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="p-4 sm:p-5">
            {favoriteCategories.length === 0 ? (
              <div className="text-center py-10">
                <Heart className="w-8 h-8 text-content-muted mx-auto mb-3 opacity-50" />
                <p className="text-sm text-content-secondary">No favorites yet</p>
                <p className="text-[11px] text-content-muted mt-1">Book services to see your top categories</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {favoriteCategories.map((cat) => {
                  const cfg = getCfg(cat._id);
                  return (
                    <div key={cat._id} className="flex items-center gap-3 p-3.5 rounded-xl border border-surface-border/60 bg-surface-raised hover:bg-surface-hover hover:border-surface-border-light transition-all duration-200 cursor-pointer group" onClick={() => navigate(`/customer/services?category=${cat._id}`)}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base shrink-0 transition-transform duration-200 group-hover:scale-110" style={{ background: cfg.bg }}>{cfg.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-content-primary capitalize">{cfg.label}</p>
                        <p className="text-[11px] text-content-muted">{cat.count} booking{cat.count !== 1 ? 's' : ''}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-content-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
                <div className="pt-3 mt-1 border-t border-surface-border/40">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-content-muted/60 mb-2.5 px-1">Quick Actions</p>
                  {[
                    { to: '/customer/services', icon: Search, label: 'Browse Services' },
                    { to: '/customer/bookings', icon: Calendar, label: 'My Bookings' },
                    { to: '/customer/profile', icon: User, label: 'Edit Profile' },
                  ].map(({ to, icon: Ic, label }) => (
                    <Link key={to} to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-hover transition-colors group">
                      <Ic className="w-4 h-4 text-coral-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[12px] font-medium text-content-secondary group-hover:text-content-primary transition-colors">{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════ ⑤ + ⑥ ACTIVITY + QUICK REBOOK ═══════ */}
      <section className="cd-section grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Activity Timeline */}
        <div className="cd-panel">
          <div className="cd-panel-header">
            <h2 className="text-[15px] font-bold text-content-primary tracking-tight">Recent Activity</h2>
            <Link to="/customer/bookings" className="cd-panel-link">See all <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="p-4 sm:p-5">
            {activityItems.length === 0 ? (
              <div className="text-center py-10">
                <Sparkles className="w-8 h-8 text-content-muted mx-auto mb-3 opacity-50" />
                <p className="text-sm text-content-secondary">No recent activity</p>
                <p className="text-[11px] text-content-muted mt-1">Your booking history will appear here</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {activityItems.map((item) => {
                  const sm = {
                    completed: { emoji: '\u2705', cls: 'bg-emerald-500/10' },
                    cancelled: { emoji: '\u274C', cls: 'bg-rose-500/10' },
                    pending:   { emoji: '\u{1F4C5}', cls: 'bg-yellow-500/10' },
                    confirmed: { emoji: '\u2705', cls: 'bg-blue-500/10' },
                  }[item.type] || { emoji: '\u2B50', cls: 'bg-surface-raised' };
                  return (
                    <div key={item.id} className="cd-activity-item">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${sm.cls}`}>{sm.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] text-content-secondary leading-relaxed">{item.text}</p>
                        <p className="text-[10px] text-content-muted mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Rebook */}
        <div className="cd-panel">
          <div className="cd-panel-header">
            <h2 className="text-[15px] font-bold text-content-primary tracking-tight">Quick Rebook</h2>
            <Link to="/customer/bookings?status=completed" className="cd-panel-link">History <ArrowRight className="w-3 h-3" /></Link>
          </div>
          <div className="p-4 sm:p-5">
            {recentBookings.filter(b => b.status === 'completed').length === 0 ? (
              <div className="text-center py-10">
                <RotateCcw className="w-8 h-8 text-content-muted mx-auto mb-3 opacity-50" />
                <p className="text-sm text-content-secondary">No completed bookings yet</p>
                <p className="text-[11px] text-content-muted mt-1">Completed services appear here for quick rebooking</p>
              </div>
            ) : (
              <div className="cd-rebook-grid">
                {recentBookings.filter(b => b.status === 'completed').slice(0, 4).map((booking) => {
                  const cfg = getCfg(booking.service?.category);
                  return (
                    <div key={booking._id} className="cd-rebook-card group" onClick={() => navigate(`/customer/services?category=${booking.service?.category}`)}>
                      <div className="h-20 rounded-t-xl overflow-hidden relative" style={{ background: cfg.bg }}>
                        <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-40">{cfg.emoji}</div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[#13161E]/70 to-transparent" />
                        <span className="absolute bottom-2 left-2.5 text-[9px] font-bold text-white/90 uppercase tracking-wide">{cfg.label}</span>
                      </div>
                      <div className="p-3">
                        <p className="text-[12px] font-semibold text-content-primary truncate mb-0.5">{booking.service?.title || 'Service'}</p>
                        <p className="text-[10px] text-content-muted truncate mb-3">{booking.provider?.name || 'Provider'}</p>
                        <button className="cd-rebook-btn"><RotateCcw className="w-3 h-3" /> Rebook</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══════ RECOMMENDATIONS ═══════ */}
      {recommendations.length > 0 && (
        <section className="cd-section mt-5">
          <div className="cd-panel">
            <div className="cd-panel-header">
              <h2 className="text-[15px] font-bold text-content-primary tracking-tight flex items-center gap-2">
                {recSection.icon === 'sparkles' && <Sparkles className="w-4 h-4 text-violet-400" />}
                {recSection.icon === 'zap' && <Zap className="w-4 h-4 text-amber-400" />}
                {recSection.icon === 'star' && <Star className="w-4 h-4 text-amber-400" />}
                {recSection.title}
              </h2>
              <Link to="/customer/services" className="cd-panel-link">View All <ArrowRight className="w-3 h-3" /></Link>
            </div>
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {recommendations.map((svc) => {
                const cfg = getCfg(svc.category);
                const reasons = svc.reasons || [];
                const providerName = svc.provider?.name || svc.providerData?.[0]?.name || '';
                const ratingVal = svc.rating?.average || 0;
                const price = svc.pricing?.amount;
                return (
                  <div key={svc._id} className="cd-rec-card group cursor-pointer" onClick={() => navigate(`/customer/services/${svc._id}`)}>
                    {/* Cover */}
                    <div className="cd-rec-cover" style={{ background: cfg.bg }}>
                      {svc.images?.[0]?.url ? (
                        <img src={svc.images[0].url} alt={svc.title} className="cd-rec-cover-img" />
                      ) : (
                        <div className="cd-rec-cover-emoji">{cfg.emoji}</div>
                      )}
                      <div className="cd-rec-cover-fade" />
                      {/* Reason tag */}
                      {reasons.length > 0 && (
                        <span className={`cd-rec-tag cd-rec-tag-${reasons[0]}`}>
                          {reasons[0] === 'based_on_history' && '📋 For You'}
                          {reasons[0] === 'highly_rated' && '⭐ Top Rated'}
                          {reasons[0] === 'popular' && '🔥 Popular'}
                          {reasons[0] === 'new' && '✨ New'}
                          {reasons[0] === 'suggested' && '💡 Suggested'}
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="cd-rec-info">
                      <p className="cd-rec-title">{svc.title}</p>
                      {providerName && (
                        <p className="cd-rec-provider">by {providerName}</p>
                      )}
                      <div className="cd-rec-meta">
                        {ratingVal > 0 && (
                          <span className="cd-rec-rating">
                            <Star className="w-3 h-3" /> {ratingVal.toFixed(1)}
                          </span>
                        )}
                        {price ? (
                          <span className="cd-rec-price">₹{Number(price).toLocaleString('en-IN')}{svc.pricing?.type === 'hourly' ? '/hr' : ''}</span>
                        ) : (
                          <span className="cd-rec-price">{svc.pricing?.type === 'negotiable' ? 'Negotiable' : ''}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default CustomerDashboard;
