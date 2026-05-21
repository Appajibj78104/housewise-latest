import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Repeat, Pause, Play, SkipForward, X, RefreshCw, Calendar, Clock,
  AlertCircle, Sparkles, CheckCircle, ChevronRight
} from 'lucide-react';
import { customerAPI } from '../../services/api';

const FREQ_LABEL = {
  weekly: 'Every week',
  biweekly: 'Every 2 weeks',
  monthly: 'Every month',
};

const STATUS_META = {
  active:  { label: 'Active',     color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.30)' },
  paused:  { label: 'Paused',     color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.30)' },
  ended:   { label: 'Ended',      color: '#6b7385', bg: 'rgba(107,115,133,0.10)', border: 'rgba(107,115,133,0.30)' },
};

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric'
}) : '—';

const RecurringBookings = () => {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await customerAPI.getRecurringSeries();
      const list = res?.data?.series || res?.series || [];
      setSeries(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load recurring series');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    total: series.length,
    active: series.filter((s) => s.recurrence?.recurrenceStatus === 'active').length,
    paused: series.filter((s) => s.recurrence?.recurrenceStatus === 'paused').length,
  }), [series]);

  const runAction = async (id, action) => {
    setBusyId(id + ':' + action);
    try {
      if (action === 'pause') await customerAPI.pauseRecurring(id);
      else if (action === 'resume') await customerAPI.resumeRecurring(id);
      else if (action === 'skip-next') await customerAPI.skipNextRecurring(id);
      else if (action === 'cancel') await customerAPI.cancelRecurring(id);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update series');
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  };

  return (
    <div className="rb-page">
      <header className="rb-header">
        <div className="rb-head-left">
          <div className="rb-head-icon">
            <Repeat style={{ width: 20, height: 20 }} />
          </div>
          <div>
            <h1 className="rb-title">Recurring Bookings</h1>
            <p className="rb-subtitle">Manage your subscriptions — pause, skip, or cancel anytime.</p>
          </div>
        </div>
        <button className="rb-refresh" onClick={load} disabled={loading}>
          <RefreshCw style={{ width: 14, height: 14 }} className={loading ? 'rb-spin' : ''} />
          Refresh
        </button>
      </header>

      {/* Stats row */}
      <div className="rb-stats">
        <div className="rb-stat">
          <span className="rb-stat-label">Series</span>
          <span className="rb-stat-num">{counts.total}</span>
        </div>
        <div className="rb-stat rb-stat-active">
          <span className="rb-stat-label">Active</span>
          <span className="rb-stat-num">{counts.active}</span>
        </div>
        <div className="rb-stat rb-stat-paused">
          <span className="rb-stat-label">Paused</span>
          <span className="rb-stat-num">{counts.paused}</span>
        </div>
      </div>

      {error && <div className="rb-error"><AlertCircle style={{ width: 16, height: 16 }} /> {error}</div>}

      {loading ? (
        <div className="rb-loading">
          <div className="rb-spinner" />
          <span>Loading your subscriptions…</span>
        </div>
      ) : series.length === 0 ? (
        <div className="rb-empty">
          <Sparkles style={{ width: 48, height: 48, color: '#FF6B4A' }} />
          <h3 className="rb-empty-title">No recurring bookings yet</h3>
          <p className="rb-empty-sub">When you book a service that repeats — like weekly cleaning — it'll show up here so you can manage the whole series in one place.</p>
          <Link to="/customer/services" className="rb-empty-cta">
            Browse services <ChevronRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      ) : (
        <div className="rb-list">
          {series.map((s) => {
            const status = s.recurrence?.recurrenceStatus || 'active';
            const meta = STATUS_META[status] || STATUS_META.active;
            const freq = FREQ_LABEL[s.recurrence?.frequency] || s.recurrence?.frequency || 'Recurring';
            const isPaused = status === 'paused';
            const isEnded = status === 'ended';
            return (
              <div key={s._id} className="rb-card">
                <div className="rb-card-status" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
                  {meta.label}
                </div>

                <div className="rb-card-head">
                  <div className="rb-service">
                    <span className="rb-service-title">{s.service?.title || 'Service'}</span>
                    <span className="rb-service-cat">{s.service?.category}</span>
                  </div>
                  <Link to={`/customer/bookings/${s._id}`} className="rb-view">
                    View parent <ChevronRight style={{ width: 13, height: 13 }} />
                  </Link>
                </div>

                <div className="rb-card-meta">
                  <div className="rb-meta-row">
                    <Repeat style={{ width: 13, height: 13 }} />
                    <span className="rb-meta-label">Frequency</span>
                    <span className="rb-meta-val">{freq}</span>
                  </div>
                  <div className="rb-meta-row">
                    <Calendar style={{ width: 13, height: 13 }} />
                    <span className="rb-meta-label">Started</span>
                    <span className="rb-meta-val">{fmt(s.scheduledDate)}</span>
                  </div>
                  {s.recurrence?.endDate && (
                    <div className="rb-meta-row">
                      <Clock style={{ width: 13, height: 13 }} />
                      <span className="rb-meta-label">Ends</span>
                      <span className="rb-meta-val">{fmt(s.recurrence.endDate)}</span>
                    </div>
                  )}
                  <div className="rb-meta-row">
                    <CheckCircle style={{ width: 13, height: 13 }} />
                    <span className="rb-meta-label">Occurrences</span>
                    <span className="rb-meta-val">{s.childOccurrences || 0}</span>
                  </div>
                </div>

                {s.provider?.name && (
                  <div className="rb-provider">
                    With <strong>{s.provider.name}</strong>
                  </div>
                )}

                {s.recurrence?.skipNext && (
                  <div className="rb-skip-flag">
                    <SkipForward style={{ width: 12, height: 12 }} /> Next occurrence will be skipped
                  </div>
                )}

                {!isEnded && (
                  <div className="rb-actions">
                    {isPaused ? (
                      <button
                        className="rb-btn rb-btn-resume"
                        disabled={busyId === s._id + ':resume'}
                        onClick={() => runAction(s._id, 'resume')}
                      >
                        <Play style={{ width: 13, height: 13 }} /> Resume
                      </button>
                    ) : (
                      <button
                        className="rb-btn rb-btn-pause"
                        disabled={busyId === s._id + ':pause'}
                        onClick={() => runAction(s._id, 'pause')}
                      >
                        <Pause style={{ width: 13, height: 13 }} /> Pause
                      </button>
                    )}
                    {!s.recurrence?.skipNext && (
                      <button
                        className="rb-btn rb-btn-skip"
                        disabled={busyId === s._id + ':skip-next' || isPaused}
                        onClick={() => runAction(s._id, 'skip-next')}
                      >
                        <SkipForward style={{ width: 13, height: 13 }} /> Skip next
                      </button>
                    )}
                    <button
                      className="rb-btn rb-btn-cancel"
                      onClick={() => setConfirm({ id: s._id, title: s.service?.title })}
                    >
                      <X style={{ width: 13, height: 13 }} /> End series
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel confirmation modal */}
      {confirm && (
        <div className="rb-modal-backdrop" onClick={() => setConfirm(null)}>
          <div className="rb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rb-modal-icon">
              <AlertCircle style={{ width: 22, height: 22, color: '#EF4444' }} />
            </div>
            <h3 className="rb-modal-title">End recurring series?</h3>
            <p className="rb-modal-sub">
              No new bookings will be created for <strong>{confirm.title}</strong>. Existing scheduled bookings stay as-is. This cannot be undone.
            </p>
            <div className="rb-modal-actions">
              <button className="rb-modal-cancel" onClick={() => setConfirm(null)}>Keep active</button>
              <button
                className="rb-modal-confirm"
                disabled={busyId === confirm.id + ':cancel'}
                onClick={() => runAction(confirm.id, 'cancel')}
              >
                {busyId === confirm.id + ':cancel' ? 'Ending…' : 'Yes, end series'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringBookings;
