import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle, Clock, Image as ImageIcon, ChevronRight,
  ShieldCheck, X, RefreshCw, FileText, Calendar
} from 'lucide-react';
import { customerAPI } from '../../services/api';

/* ─── Helpers ─── */
const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—';

const fmtDay = (d) => d ? new Date(d).toLocaleDateString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric'
}) : '—';

const STATUS_META = {
  open:     { label: 'Under review',  color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.30)', icon: Clock },
  resolved: { label: 'Resolved',      color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.30)', icon: CheckCircle },
  rejected: { label: 'Closed',        color: '#6b7385', bg: 'rgba(107,115,133,0.08)', border: 'rgba(107,115,133,0.30)', icon: X },
};

const Disputes = () => {
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [lightbox, setLightbox] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await customerAPI.getMyDisputes();
      const list = res?.data?.disputes || res?.disputes || [];
      setDisputes(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = {
    all: disputes.length,
    open: disputes.filter((d) => d.dispute?.status === 'open').length,
    resolved: disputes.filter((d) => d.dispute?.status === 'resolved').length,
    rejected: disputes.filter((d) => d.dispute?.status === 'rejected').length,
  };

  const filtered = disputes.filter((d) => filter === 'all' || d.dispute?.status === filter);

  return (
    <div className="dp-page">
      {/* ─── Header ─── */}
      <header className="dp-header">
        <div className="dp-header-left">
          <div className="dp-header-icon">
            <ShieldCheck style={{ width: 22, height: 22 }} />
          </div>
          <div>
            <h1 className="dp-title">My Disputes</h1>
            <p className="dp-subtitle">Track issues you've raised — admins typically review within 24 hours.</p>
          </div>
        </div>
        <button className="dp-refresh" onClick={load} disabled={loading}>
          <RefreshCw style={{ width: 14, height: 14 }} className={loading ? 'dp-spin' : ''} />
          Refresh
        </button>
      </header>

      {/* ─── Filter chips ─── */}
      <div className="dp-tabs">
        {[
          { v: 'all', l: 'All' },
          { v: 'open', l: 'Under review' },
          { v: 'resolved', l: 'Resolved' },
          { v: 'rejected', l: 'Closed' },
        ].map((t) => (
          <button
            key={t.v}
            className={`dp-tab ${filter === t.v ? 'dp-tab-active' : ''}`}
            onClick={() => setFilter(t.v)}
          >
            {t.l}
            <span className="dp-tab-count">{counts[t.v]}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="dp-error">
          <AlertTriangle style={{ width: 16, height: 16 }} /> {error}
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && (
        <div className="dp-loading">
          <div className="dp-spinner" />
          <span>Loading your disputes…</span>
        </div>
      )}

      {/* ─── Empty ─── */}
      {!loading && filtered.length === 0 && (
        <div className="dp-empty">
          <ShieldCheck style={{ width: 56, height: 56, color: '#10B981' }} />
          <h3 className="dp-empty-title">
            {filter === 'all' ? 'No disputes — great!' : 'Nothing here'}
          </h3>
          <p className="dp-empty-sub">
            {filter === 'all'
              ? 'When something goes wrong with a completed booking you can raise a dispute and our team will step in.'
              : 'Try a different filter to see other disputes.'}
          </p>
          <Link to="/customer/bookings" className="dp-empty-cta">
            <FileText style={{ width: 14, height: 14 }} /> Go to my bookings
          </Link>
        </div>
      )}

      {/* ─── Cards ─── */}
      <div className="dp-list">
        {filtered.map((b) => {
          const dispute = b.dispute || {};
          const meta = STATUS_META[dispute.status] || STATUS_META.open;
          const Icon = meta.icon;
          return (
            <div key={b._id} className="dp-card">
              <div
                className="dp-card-status"
                style={{
                  background: meta.bg,
                  borderColor: meta.border,
                  color: meta.color,
                }}
              >
                <Icon style={{ width: 12, height: 12 }} />
                <span>{meta.label}</span>
              </div>

              <div className="dp-card-head">
                <div className="dp-service">
                  <span className="dp-service-title">{b.service?.title || 'Service'}</span>
                  <span className="dp-service-cat">{b.service?.category}</span>
                </div>
                <Link to={`/customer/bookings/${b._id}`} className="dp-view">
                  View booking <ChevronRight style={{ width: 14, height: 14 }} />
                </Link>
              </div>

              <div className="dp-card-meta">
                <div className="dp-meta-row">
                  <Calendar style={{ width: 13, height: 13 }} />
                  <span className="dp-meta-label">Service date</span>
                  <span className="dp-meta-val">{fmtDay(b.scheduledDate)}</span>
                </div>
                <div className="dp-meta-row">
                  <AlertTriangle style={{ width: 13, height: 13 }} />
                  <span className="dp-meta-label">Raised</span>
                  <span className="dp-meta-val">{fmt(dispute.raisedAt)}</span>
                </div>
                {dispute.resolvedAt && (
                  <div className="dp-meta-row">
                    <CheckCircle style={{ width: 13, height: 13 }} />
                    <span className="dp-meta-label">Resolved</span>
                    <span className="dp-meta-val">{fmt(dispute.resolvedAt)}</span>
                  </div>
                )}
              </div>

              <div className="dp-section">
                <span className="dp-section-label">Your reason</span>
                <p className="dp-reason">{dispute.reason || '—'}</p>
              </div>

              {dispute.evidencePhotos?.length > 0 && (
                <div className="dp-section">
                  <span className="dp-section-label">
                    <ImageIcon style={{ width: 12, height: 12 }} /> Evidence ({dispute.evidencePhotos.length})
                  </span>
                  <div className="dp-evidence">
                    {dispute.evidencePhotos.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        className="dp-evidence-tile"
                        onClick={() => setLightbox(src)}
                      >
                        <img src={src} alt={`Evidence ${i + 1}`} className="dp-evidence-img" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {dispute.resolution && (
                <div className="dp-resolution">
                  <span className="dp-section-label">
                    <ShieldCheck style={{ width: 12, height: 12 }} /> Admin resolution
                  </span>
                  <p className="dp-resolution-text">{dispute.resolution}</p>
                  {Number(dispute.refundAmount) > 0 && (
                    <span className="dp-refund">
                      Refund recorded: ₹{Number(dispute.refundAmount).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Lightbox ─── */}
      {lightbox && (
        <div className="dp-lightbox" onClick={() => setLightbox(null)}>
          <button className="dp-lightbox-close" onClick={() => setLightbox(null)}>
            <X style={{ width: 18, height: 18 }} />
          </button>
          <img src={lightbox} alt="Evidence" className="dp-lightbox-img" />
        </div>
      )}
    </div>
  );
};

export default Disputes;
