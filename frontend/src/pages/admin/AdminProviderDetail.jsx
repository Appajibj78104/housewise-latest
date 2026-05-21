import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, MapPin, Phone, Mail, Calendar, DollarSign,
  Award, TrendingUp, Package, Clock, CheckCircle, XCircle, Send,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { adminAPIService } from '../../services/adminAPI';

const AdminProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifyForm, setNotifyForm] = useState({ show: false, title: '', message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await adminAPIService.getProviderDetail(id);
        if (response.success) setData(response.data);
      } catch (err) {
        console.error('Provider detail error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleNotify = async () => {
    if (!notifyForm.title || !notifyForm.message) return;
    try {
      setSending(true);
      await adminAPIService.notifyProviders({
        providerIds: [id],
        title: notifyForm.title,
        message: notifyForm.message,
      });
      setNotifyForm({ show: false, title: '', message: '' });
    } catch (err) {
      console.error('Notify error:', err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse bg-surface-hover rounded-lg" />
        <div className="h-64 animate-pulse bg-surface-hover rounded-lg" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-content-muted">Provider not found</p>
        <button onClick={() => navigate(-1)} className="btn btn-secondary mt-4">Go Back</button>
      </div>
    );
  }

  const { provider, services, recentBookings, recentReviews, earningsBreakdown, stats, performanceScore } = data;

  const earningsChartData = earningsBreakdown?.map(e => ({
    month: e._id,
    earnings: e.earnings,
    bookings: e.count,
  })).reverse() || [];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-content-muted hover:text-content-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Providers
      </button>

      {/* Profile Header */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-hover flex items-center justify-center overflow-hidden flex-shrink-0">
            {provider.profileImage ? (
              <img src={provider.profileImage} alt={provider.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-content-muted">{provider.name?.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-display text-content-primary">{provider.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full ${provider.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {provider.isActive ? 'Active' : 'Inactive'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${provider.isApproved ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                {provider.isApproved ? 'Approved' : 'Pending'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-content-muted">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {provider.email}</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {provider.phone}</span>
              {provider.address?.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {provider.address.city}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {new Date(provider.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
            </div>
            {provider.bio && <p className="text-sm text-content-secondary mt-2">{provider.bio}</p>}
          </div>
          <button
            onClick={() => setNotifyForm({ show: true, title: '', message: '' })}
            className="btn btn-secondary flex items-center gap-1.5 flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" /> Send Notice
          </button>
        </div>
      </div>

      {/* Performance Score & Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="stat-card text-center">
          <p className="text-xs text-content-muted uppercase">Performance</p>
          <p className={`text-2xl font-bold ${performanceScore >= 70 ? 'text-green-400' : performanceScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {performanceScore}
          </p>
          <p className="text-xs text-content-muted">/100</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-content-muted uppercase">Rating</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.averageRating?.toFixed(1)}</p>
          <p className="text-xs text-content-muted">{stats.totalReviews} reviews</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-content-muted uppercase">Bookings</p>
          <p className="text-2xl font-bold text-content-primary">{stats.totalBookings}</p>
          <p className="text-xs text-green-400">{stats.completedBookings} completed</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-content-muted uppercase">Cancelled</p>
          <p className="text-2xl font-bold text-red-400">{stats.cancelledBookings}</p>
          <p className="text-xs text-content-muted">bookings</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-content-muted uppercase">Earnings</p>
          <p className="text-2xl font-bold text-green-400">₹{(stats.totalEarnings || 0).toLocaleString('en-IN')}</p>
          <p className="text-xs text-content-muted">total</p>
        </div>
        <div className="stat-card text-center">
          <p className="text-xs text-content-muted uppercase">Services</p>
          <p className="text-2xl font-bold text-content-primary">{stats.totalServices}</p>
          <p className="text-xs text-content-muted">{stats.activeServices} active</p>
        </div>
      </div>

      {/* Earnings Chart */}
      {earningsChartData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-heading text-content-primary mb-4">Monthly Earnings</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={earningsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v, n) => [n === 'earnings' ? `₹${v.toLocaleString()}` : v, n]} contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
              <Bar dataKey="earnings" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Services & Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Services */}
        <div className="card p-5">
          <h3 className="text-heading text-content-primary mb-3">Services ({services.length})</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {services.map(svc => (
              <div key={svc._id} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-hover/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-content-primary truncate">{svc.title}</p>
                  <p className="text-xs text-content-muted">{svc.category} · ₹{svc.pricing?.amount}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-0.5 text-xs">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    {svc.rating?.average?.toFixed(1) || '0.0'}
                  </span>
                  {svc.isActive ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                </div>
              </div>
            ))}
            {services.length === 0 && <p className="text-sm text-content-muted text-center py-4">No services listed</p>}
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="card p-5">
          <h3 className="text-heading text-content-primary mb-3">Recent Reviews</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {recentReviews.map(rev => (
              <div key={rev._id} className="p-2.5 rounded-lg bg-surface-hover/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-content-muted">{rev.customer?.name}</span>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < (rev.rating?.overall || 0) ? 'text-yellow-400 fill-current' : 'text-surface-border'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-content-secondary truncate">{rev.comment}</p>
              </div>
            ))}
            {recentReviews.length === 0 && <p className="text-sm text-content-muted text-center py-4">No reviews yet</p>}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card p-5">
        <h3 className="text-heading text-content-primary mb-3">Recent Bookings</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left px-3 py-2 text-xs text-content-muted">Customer</th>
                <th className="text-left px-3 py-2 text-xs text-content-muted">Service</th>
                <th className="text-left px-3 py-2 text-xs text-content-muted">Date</th>
                <th className="text-left px-3 py-2 text-xs text-content-muted">Amount</th>
                <th className="text-left px-3 py-2 text-xs text-content-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.slice(0, 10).map(booking => (
                <tr key={booking._id} className="border-b border-surface-border/30">
                  <td className="px-3 py-2 text-content-primary">{booking.customer?.name}</td>
                  <td className="px-3 py-2 text-content-secondary">{booking.service?.title}</td>
                  <td className="px-3 py-2 text-content-muted">{new Date(booking.scheduledDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</td>
                  <td className="px-3 py-2 text-content-secondary">₹{booking.pricing?.agreedAmount || 0}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      booking.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                      booking.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                      booking.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>{booking.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recentBookings.length === 0 && <p className="text-center text-content-muted py-6">No bookings</p>}
        </div>
      </div>

      {/* Notify Modal */}
      {notifyForm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-overlay border border-surface-border rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-heading text-content-primary mb-4">Send Notice to {provider.name}</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={notifyForm.title}
                onChange={e => setNotifyForm({...notifyForm, title: e.target.value})}
                className="form-input w-full"
                placeholder="Notice title"
              />
              <textarea
                value={notifyForm.message}
                onChange={e => setNotifyForm({...notifyForm, message: e.target.value})}
                className="form-input w-full min-h-[100px] resize-y"
                placeholder="Notice message..."
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleNotify} disabled={sending} className="btn btn-primary flex-1">{sending ? 'Sending...' : 'Send'}</button>
              <button onClick={() => setNotifyForm({ show: false, title: '', message: '' })} className="btn btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProviderDetail;
