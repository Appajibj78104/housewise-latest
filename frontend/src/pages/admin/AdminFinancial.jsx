import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, TrendingUp, Users, PieChart, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { adminAPIService } from '../../services/adminAPI';

const PERIOD_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
];

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

const AdminFinancial = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminAPIService.getFinancialOverview({ period: period + 'd' });
      if (response.success) setData(response.data);
    } catch (err) {
      console.error('Financial data error:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 animate-pulse bg-surface-hover rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 animate-pulse bg-surface-hover rounded-lg" />)}
        </div>
        <div className="h-80 animate-pulse bg-surface-hover rounded-lg" />
      </div>
    );
  }

  const revenueChartData = data?.revenueByDay?.map(d => ({
    date: new Date(d._id).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    Revenue: d.revenue || 0,
    Bookings: d.count || 0,
  })) || [];

  const categoryData = data?.revenueByCategory?.map(d => ({
    name: d._id?.charAt(0).toUpperCase() + d._id?.slice(1),
    revenue: d.revenue,
    bookings: d.count,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display text-content-primary">Financial Reports</h1>
          <p className="text-body text-content-muted mt-1">Revenue, commissions, and payout tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {PERIOD_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                period === opt.value
                  ? 'bg-accent-blue-muted text-accent-blue-light font-medium'
                  : 'text-content-muted hover:bg-surface-hover'
              }`}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-content-muted uppercase">Total Revenue (All-time)</p>
              <p className="text-display text-content-primary">{formatCurrency(data?.totalRevenue)}</p>
              <p className="text-micro text-content-muted">{data?.totalBookings} bookings</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-600/15 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-content-muted uppercase">Period Revenue</p>
              <p className="text-display text-content-primary">{formatCurrency(data?.periodRevenue)}</p>
              <p className="text-micro text-content-muted">{data?.periodBookings} bookings</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-600/15 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-content-muted uppercase">Platform Commission</p>
              <p className="text-display text-content-primary">{formatCurrency(data?.platformCommission)}</p>
              <p className="text-micro text-green-400">{data?.platformFeePercent}% fee</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-600/15 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-caption text-content-muted uppercase">Provider Payouts</p>
              <p className="text-display text-content-primary">{formatCurrency(data?.providerPayouts)}</p>
              <p className="text-micro text-content-muted">{100 - (data?.platformFeePercent || 10)}% to providers</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-600/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="card p-5">
        <h3 className="text-heading text-content-primary mb-4">Revenue Trend</h3>
        {revenueChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="finRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v, name) => [name === 'Revenue' ? formatCurrency(v) : v, name]} contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="Revenue" stroke="#10b981" fill="url(#finRevGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-content-muted">No revenue data for this period</div>
        )}
      </div>

      {/* Revenue by Category & Top Earners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-heading text-content-primary mb-4">Revenue by Category</h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-content-muted">No data</div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-heading text-content-primary mb-4">Top Earning Providers</h3>
          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            {data?.topEarners?.map((earner, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface-hover/50">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-content-muted w-5">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-content-primary">{earner.provider?.name}</p>
                    <p className="text-xs text-content-muted">{earner.bookings} bookings</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-green-400">{formatCurrency(earner.earnings)}</span>
              </div>
            ))}
            {(!data?.topEarners || data.topEarners.length === 0) && (
              <p className="text-center text-content-muted text-sm py-8">No earnings data</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminFinancial;
