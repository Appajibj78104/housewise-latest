import React, { useState, useEffect } from 'react';
import {
  Bell, Send, Users, UserCheck, Filter, Clock,
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import AdminSkeleton from '../../components/admin/AdminSkeleton';

const AdminNotifications = () => {
  const [tab, setTab] = useState('send');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', targetRole: 'all' });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await adminAPIService.getNotificationHistory({ limit: 50 });
      if (response.success) setHistory(response.data.campaigns || []);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab]);

  const handleSend = async () => {
    if (!form.title || !form.message) return;
    try {
      setSending(true);
      setResult(null);
      const response = await adminAPIService.broadcastNotification(form);
      if (response.success) {
        setResult({ type: 'success', message: response.message });
        setForm({ title: '', message: '', targetRole: 'all' });
      }
    } catch (err) {
      setResult({ type: 'error', message: err.response?.data?.message || 'Failed to send' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-display text-content-primary">Notifications Center</h1>
        <p className="text-body text-content-muted mt-1">Send broadcast or targeted notifications to users</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-hover rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab('send')}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${tab === 'send' ? 'bg-surface-overlay text-content-primary shadow-sm' : 'text-content-muted'}`}
        >
          <Send className="w-3.5 h-3.5 inline mr-1.5" />Send New
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 text-sm rounded-md transition-colors ${tab === 'history' ? 'bg-surface-overlay text-content-primary shadow-sm' : 'text-content-muted'}`}
        >
          <Clock className="w-3.5 h-3.5 inline mr-1.5" />History
        </button>
      </div>

      {tab === 'send' && (
        <div className="card p-6 max-w-2xl">
          <h3 className="text-heading text-content-primary mb-4">Compose Notification</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-content-muted mb-1 block">Target Audience</label>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'All Users', icon: Users },
                  { value: 'customer', label: 'Customers', icon: Users },
                  { value: 'provider', label: 'Providers', icon: UserCheck },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({...form, targetRole: opt.value})}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      form.targetRole === opt.value
                        ? 'bg-accent-blue-muted text-accent-blue-light'
                        : 'bg-surface-hover text-content-muted hover:text-content-secondary'
                    }`}
                  >
                    <opt.icon className="w-3.5 h-3.5" /> {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-content-muted mb-1 block">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="form-input w-full"
                placeholder="Notification title..."
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-xs text-content-muted mb-1 block">Message</label>
              <textarea
                value={form.message}
                onChange={e => setForm({...form, message: e.target.value})}
                className="form-input w-full min-h-[100px] resize-y"
                placeholder="Write your notification message..."
                maxLength={500}
              />
              <p className="text-xs text-content-muted mt-1">{form.message.length}/500</p>
            </div>

            {result && (
              <div className={`p-3 rounded-lg text-sm ${result.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {result.message}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !form.title || !form.message}
              className="btn btn-primary flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send Notification'}
            </button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card overflow-hidden">
          {loading ? (
            <AdminSkeleton type="table" rows={6} cols={4} />
          ) : history.length > 0 ? (
            <div className="divide-y divide-surface-border">
              {history.map((campaign, i) => (
                <div key={i} className="p-4 hover:bg-surface-hover/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-content-primary">{campaign.title}</h4>
                      <p className="text-xs text-content-muted mt-0.5">{campaign.message}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-hover text-content-muted">
                        {campaign.recipients} recipients
                      </span>
                      <p className="text-xs text-content-muted mt-1">
                        {new Date(campaign.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bell className="w-10 h-10 text-content-muted mx-auto mb-3" />
              <p className="text-content-muted">No notifications sent yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminNotifications;
