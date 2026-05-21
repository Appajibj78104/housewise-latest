import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserCheck,
  Calendar,
  Star,
  Clock,
  TrendingUp,
  AlertTriangle,
  Activity,
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  BarChart3,
  PieChart,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend,
} from 'recharts';
import { adminAPIService } from '../../services/adminAPI';
import { useAdminSocket } from '../../hooks/useAdminSocket';
import Sparkline, { StatusBar } from '../../components/admin/Sparkline';
import AdminErrorBoundary from '../../components/admin/AdminErrorBoundary';

/* ─── Constants ─── */
const PERIOD_OPTIONS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '365d', label: 'Last year' },
];

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
const STATUS_COLORS = { pending: '#f59e0b', confirmed: '#6366f1', completed: '#10b981', cancelled: '#ef4444', declined: '#9ca3af' };

/* ─── Helpers ─── */
const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;
const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
};

/* ─── Skeleton ─── */
const SkeletonPulse = ({ className = '' }) => (
  <div className={`animate-pulse bg-surface-hover rounded-lg ${className}`} />
);

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <SkeletonPulse className="h-10 w-64" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1,2,3,4,5,6].map(i => <SkeletonPulse key={i} className="h-28" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonPulse className="h-80" />
      <SkeletonPulse className="h-80" />
    </div>
  </div>
);

/* ─── Custom Tooltip ─── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-content-muted mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm font-medium" style={{ color: entry.color }}>
          {entry.name}: {entry.name.includes('Revenue') ? formatCurrency(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ═══════════════════════════════════════ */
const AdminDashboard = () => {
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  // WebSocket connection
  const { connected, liveEvents } = useAdminSocket();

  /* ─── Fetch overview metrics ─── */
  const fetchOverview = useCallback(async () => {
    try {
      setError('');
      const response = await adminAPIService.getOverview();
      if (response.success) {
        setOverview(response.data);
      } else {
        setError(response.message || 'Failed to fetch overview');
      }
    } catch (err) {
      setError(err?.message || 'Failed to fetch overview data');
    }
  }, []);

  /* ─── Fetch analytics (charts) ─── */
  const fetchAnalytics = useCallback(async (selectedPeriod) => {
    try {
      setAnalyticsLoading(true);
      const response = await adminAPIService.getAnalytics({ period: selectedPeriod });
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  /* ─── Initial load ─── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchOverview(), fetchAnalytics(period)]);
      setLoading(false);
    };
    load();
  }, [fetchOverview, fetchAnalytics, period]);

  /* ─── Refresh on live events ─── */
  useEffect(() => {
    if (liveEvents.length > 0) {
      const t = setTimeout(() => fetchOverview(), 2000);
      return () => clearTimeout(t);
    }
  }, [liveEvents.length, fetchOverview]);

  /* ─── Period change ─── */
  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  /* ─── Manual refresh ─── */
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOverview(), fetchAnalytics(period)]);
    setRefreshing(false);
  };

  /* ─── Export ─── */
  const handleExport = async (type) => {
    try {
      const response = await adminAPIService.exportData({ type, period });
      const blob = response.data || response;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${period}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  /* ─── Build chart data ─── */
  const revenueChartData = analytics?.revenueByDay?.map(d => ({
    date: formatDate(d._id),
    Revenue: d.revenue || 0,
    Bookings: d.count || 0,
  })) || [];

  const bookingsChartData = analytics?.bookingsByDay?.map(d => ({
    date: formatDate(d._id),
    Bookings: d.count || 0,
    Revenue: d.revenue || 0,
  })) || [];

  // User growth: reshape aggregation into per-day customers/providers
  const userGrowthMap = {};
  analytics?.userGrowth?.forEach(item => {
    const date = item._id?.date;
    if (!date) return;
    if (!userGrowthMap[date]) userGrowthMap[date] = { date: formatDate(date), Customers: 0, Providers: 0 };
    if (item._id.role === 'customer') userGrowthMap[date].Customers = item.count;
    else if (item._id.role === 'housewife') userGrowthMap[date].Providers = item.count;
  });
  const userGrowthData = Object.values(userGrowthMap);

  // Booking funnel (status distribution)
  const funnelData = analytics?.statusDistribution?.map(s => ({
    name: s._id?.charAt(0).toUpperCase() + s._id?.slice(1),
    value: s.count,
  })) || [];

  // Category distribution
  const categoryData = analytics?.categoryDistribution?.map(c => ({
    name: c._id?.charAt(0).toUpperCase() + c._id?.slice(1),
    value: c.count,
  })) || [];

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="w-10 h-10 text-danger-text" />
        <p className="text-body text-danger-text">{error}</p>
        <button onClick={handleRefresh} className="btn btn-primary">Try Again</button>
      </div>
    );
  }

  const { metrics, recentActivity } = overview || {};

  const metricCards = [
    { title: 'Total Customers', value: metrics?.totalCustomers || 0, icon: Users, color: 'bg-blue-600', sparkColor: '#60a5fa' },
    { title: 'Active Providers', value: metrics?.totalProviders || 0, icon: UserCheck, color: 'bg-green-600', sparkColor: '#34d399' },
    { title: 'Pending Approvals', value: metrics?.pendingProviders || 0, icon: Clock, color: 'bg-yellow-600', sparkColor: '#fbbf24' },
    { title: 'Total Bookings', value: metrics?.totalBookings || 0, icon: Calendar, color: 'bg-purple-600', sub: `${metrics?.todayBookings || 0} today`, sparkColor: '#a78bfa' },
    { title: 'Avg Rating', value: metrics?.averageProviderRating?.toFixed(1) || '0.0', icon: Star, color: 'bg-orange-600', sparkColor: '#fb923c' },
    { title: 'Total Revenue', value: formatCurrency(metrics?.totalRevenue), icon: TrendingUp, color: 'bg-emerald-600', sparkColor: '#6ee7b7' },
  ];

  // Generate sparkline data from bookings/revenue trends
  const sparklineData = bookingsChartData.map(d => d.Bookings);
  const revenueSparkData = revenueChartData.map(d => d.Revenue);

  // Build status distribution segments for the StatusBar
  const statusSegments = funnelData.map((s) => ({
    value: s.value,
    label: s.name,
    color: STATUS_COLORS[s.name?.toLowerCase()] || '#6b7385',
  }));

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display text-content-primary">Dashboard Overview</h1>
          <p className="text-body text-content-muted mt-1">Real-time platform monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
            {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connected ? 'Live' : 'Offline'}
          </span>
          {/* Refresh */}
          <button onClick={handleRefresh} className="btn btn-secondary btn-sm" disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {/* Export dropdown */}
          <div className="relative group">
            <button className="btn btn-secondary btn-sm flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <div className="absolute right-0 top-full mt-1 bg-surface-overlay border border-surface-border rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[140px]">
              <button onClick={() => handleExport('bookings')} className="block w-full text-left px-3 py-2 text-sm text-content-secondary hover:bg-surface-hover rounded-t-lg">Bookings CSV</button>
              <button onClick={() => handleExport('revenue')} className="block w-full text-left px-3 py-2 text-sm text-content-secondary hover:bg-surface-hover">Revenue CSV</button>
              <button onClick={() => handleExport('users')} className="block w-full text-left px-3 py-2 text-sm text-content-secondary hover:bg-surface-hover rounded-b-lg">Users CSV</button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Time Range Selector ─── */}
      <div className="flex items-center gap-2">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => handlePeriodChange(opt.value)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              period === opt.value
                ? 'bg-accent-blue-muted text-accent-blue-light font-medium'
                : 'text-content-muted hover:bg-surface-hover'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ─── Metric Cards with Sparklines ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((metric, index) => (
          <div key={index} className="stat-card">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-caption text-content-muted uppercase tracking-wider">{metric.title}</p>
                <p className="text-display text-content-primary">{metric.value}</p>
                {metric.sub && <p className="text-micro text-content-muted">{metric.sub}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`${metric.color}/15 h-10 w-10 rounded-xl flex items-center justify-center`}>
                  <metric.icon className={`w-5 h-5 ${metric.color.replace('bg-', 'text-').replace('-600', '-400')}`} />
                </div>
                {(index === 3 ? sparklineData : index === 5 ? revenueSparkData : null)?.length > 2 && (
                  <Sparkline data={index === 3 ? sparklineData : revenueSparkData} width={64} height={24} color={metric.sparkColor} />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Booking Status Distribution Bar ─── */}
      {statusSegments.length > 0 && (
        <div className="card p-4">
          <p className="text-caption text-content-muted mb-2">Booking Status Distribution</p>
          <StatusBar segments={statusSegments} height={8} showLegend />
        </div>
      )}

      {/* ─── Charts Section ─── */}
      {analyticsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonPulse className="h-80" />
          <SkeletonPulse className="h-80" />
        </div>
      ) : (
        <AdminErrorBoundary section="charts" title="Charts failed to render">
          {/* Revenue & Bookings Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-accent-blue-light" />
                <h3 className="text-heading text-content-primary">Revenue Trend</h3>
              </div>
              {revenueChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={revenueChartData}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="Revenue" stroke="#10b981" fill="url(#revenueGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-content-muted text-sm">No revenue data for this period</div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-purple-400" />
                <h3 className="text-heading text-content-primary">Bookings Over Time</h3>
              </div>
              {bookingsChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={bookingsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Bookings" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-content-muted text-sm">No booking data for this period</div>
              )}
            </div>
          </div>

          {/* User Growth & Booking Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <h3 className="text-heading text-content-primary">User Growth</h3>
              </div>
              {userGrowthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="Customers" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Providers" stroke="#10b981" strokeWidth={2} dot={false} />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-content-muted text-sm">No growth data for this period</div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-4 h-4 text-yellow-400" />
                <h3 className="text-heading text-content-primary">Booking Status Funnel</h3>
              </div>
              {funnelData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <RechartsPie>
                    <Pie
                      data={funnelData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {funnelData.map((entry, index) => (
                        <Cell key={index} fill={STATUS_COLORS[entry.name.toLowerCase()] || CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-content-muted text-sm">No status data for this period</div>
              )}
            </div>
          </div>

          {/* Category Distribution */}
          {categoryData.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-heading text-content-primary">Service Category Distribution</h3>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" name="Services" radius={[0, 4, 4, 0]}>
                    {categoryData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </AdminErrorBoundary>
      )}

      {/* ─── Recent Activity ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-border">
            <Activity className="w-4 h-4 text-accent-blue-light" />
            <h2 className="text-heading text-content-primary">Recent Bookings</h2>
            {liveEvents.filter(e => e.type === 'booking').length > 0 && (
              <span className="ml-auto text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full animate-pulse">Live</span>
            )}
          </div>
          <div className="p-4 space-y-2 max-h-[320px] overflow-y-auto">
            {recentActivity?.bookings?.length > 0 ? (
              recentActivity.bookings.map((booking, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-surface-hover/50 hover:bg-surface-hover transition-colors duration-150">
                  <div className="min-w-0">
                    <p className="text-body font-medium text-content-primary truncate">
                      {booking.customer?.name} → {booking.provider?.name}
                    </p>
                    <p className="text-detail text-content-muted">{booking.service?.title}</p>
                  </div>
                  <span className={`ml-3 flex-shrink-0 text-xs px-2 py-1 rounded-full ${
                    booking.status === 'confirmed' ? 'bg-indigo-500/10 text-indigo-400' :
                    booking.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                    booking.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-content-muted mx-auto mb-2" />
                <p className="text-body text-content-muted">No recent bookings</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Signups */}
        <div className="card p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-border">
            <TrendingUp className="w-4 h-4 text-success-text" />
            <h2 className="text-heading text-content-primary">Recent Signups</h2>
          </div>
          <div className="p-4 space-y-2 max-h-[320px] overflow-y-auto">
            {recentActivity?.signups?.length > 0 ? (
              recentActivity.signups.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-surface-hover/50 hover:bg-surface-hover transition-colors duration-150">
                  <div className="min-w-0">
                    <p className="text-body font-medium text-content-primary truncate">{user.name}</p>
                    <p className="text-detail text-content-muted">{user.email}</p>
                  </div>
                  <span className={`ml-3 flex-shrink-0 text-xs px-2 py-1 rounded-full ${
                    user.role === 'customer' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                  }`}>
                    {user.role === 'housewife' ? 'Provider' : 'Customer'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <TrendingUp className="h-8 w-8 text-content-muted mx-auto mb-2" />
                <p className="text-body text-content-muted">No recent signups</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Live Events Feed ─── */}
      {liveEvents.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <h3 className="text-heading text-content-primary">Live Activity Feed</h3>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {liveEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface-hover/30 text-sm">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${event.type === 'booking' ? 'bg-indigo-400' : 'bg-green-400'}`} />
                <span className="text-content-secondary">
                  {event.type === 'booking' ? `Booking ${event.status}` : `New ${event.role} registered: ${event.name}`}
                </span>
                <span className="ml-auto text-content-muted text-xs">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Flagged Reviews ─── */}
      {recentActivity?.flaggedReviews?.length > 0 && (
        <div className="card p-5 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h2 className="text-heading text-content-primary">Flagged Reviews</h2>
            <span className="ml-auto text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full">
              {recentActivity.flaggedReviews.length} flagged
            </span>
          </div>
          <div className="space-y-3">
            {recentActivity.flaggedReviews.map((review, index) => (
              <div key={index} className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-content-primary">
                    {review.customer?.name} → {review.provider?.name}
                  </p>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < (review.rating?.overall || 0) ? 'text-yellow-400 fill-current' : 'text-surface-border'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-content-muted truncate">{review.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
