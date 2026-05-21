import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPIService } from '../../services/adminAPI';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Calendar, DollarSign, Users } from 'lucide-react';

const COLORS = ['#ff3cac', '#784ba0', '#2b86c5', '#ff6b35', '#10b981', '#f59e0b'];

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('30d');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-analytics', period],
    queryFn: () => adminAPIService.getAnalytics({ period }),
    staleTime: 5 * 60 * 1000,
  });

  const analytics = data?.data;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-white/5 rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-white/5 rounded-xl" />
          <div className="h-64 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const bookingChartData = (analytics.bookingsByDay || []).map(d => ({
    date: d._id.slice(5), // MM-DD
    bookings: d.count,
    revenue: d.revenue,
  }));

  const revenueChartData = (analytics.revenueByDay || []).map(d => ({
    date: d._id.slice(5),
    revenue: d.revenue,
    completed: d.count,
  }));

  const categoryData = (analytics.categoryDistribution || []).map(d => ({
    name: d._id,
    value: d.count,
    rating: d.avgRating?.toFixed(1) || '0',
  }));

  const statusData = (analytics.statusDistribution || []).map(d => ({
    name: d._id.replace('_', ' '),
    value: d.count,
  }));

  // Summary stats
  const totalBookings = bookingChartData.reduce((sum, d) => sum + d.bookings, 0);
  const totalRevenue = revenueChartData.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-pink-400" />
          Analytics
        </h2>
        <div className="flex gap-2">
          {['7d', '30d', '90d'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                period === p
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Calendar className="w-4 h-4" /> Total Bookings
          </div>
          <p className="text-2xl font-bold text-white">{totalBookings}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <DollarSign className="w-4 h-4" /> Revenue
          </div>
          <p className="text-2xl font-bold text-white">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Users className="w-4 h-4" /> Categories
          </div>
          <p className="text-2xl font-bold text-white">{categoryData.length}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookings Line Chart */}
        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
          <h3 className="text-white font-medium mb-4">Bookings Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={bookingChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 11 }} />
              <YAxis stroke="#888" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="bookings" stroke="#ff3cac" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Bar Chart */}
        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
          <h3 className="text-white font-medium mb-4">Revenue (Completed)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" tick={{ fontSize: 11 }} />
              <YAxis stroke="#888" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [`₹${value}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#784ba0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution Pie */}
        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
          <h3 className="text-white font-medium mb-4">Service Categories</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                {categoryData.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
          <h3 className="text-white font-medium mb-4">Booking Status</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis type="number" stroke="#888" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" stroke="#888" tick={{ fontSize: 11 }} width={80} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#2b86c5" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
