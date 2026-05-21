import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ShieldCheck, CheckCircle, X as XIcon, Search,
  Image as ImageIcon, Calendar, User as UserIcon, RefreshCw, ArrowRight
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import { toast } from 'react-hot-toast';

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—';

const STATUS_PILL = {
  open:     'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
  resolved: 'bg-green-500/10 text-green-300 border-green-500/30',
  rejected: 'bg-gray-500/10 text-gray-300 border-gray-500/30',
};

const AdminDisputes = () => {
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState([]);
  const [tab, setTab] = useState('open');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [actionForm, setActionForm] = useState({ resolution: '', refundAmount: '', action: 'resolve' });
  const [busy, setBusy] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminAPIService.listDisputes();
      const list = res?.data?.disputes || res?.disputes || [];
      setDisputes(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all: disputes.length,
    open: disputes.filter((d) => d.dispute?.status === 'open').length,
    resolved: disputes.filter((d) => d.dispute?.status === 'resolved').length,
    rejected: disputes.filter((d) => d.dispute?.status === 'rejected').length,
  }), [disputes]);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    return disputes.filter((b) => {
      if (tab !== 'all' && b.dispute?.status !== tab) return false;
      if (!lower) return true;
      return (
        b.customer?.name?.toLowerCase().includes(lower) ||
        b.provider?.name?.toLowerCase().includes(lower) ||
        b.service?.title?.toLowerCase().includes(lower) ||
        b.bookingId?.toLowerCase().includes(lower) ||
        b.dispute?.reason?.toLowerCase().includes(lower)
      );
    });
  }, [disputes, tab, search]);

  const openModal = (b) => {
    setSelected(b);
    setActionForm({
      resolution: b.dispute?.resolution || '',
      refundAmount: b.dispute?.refundAmount ? String(b.dispute.refundAmount) : '',
      action: 'resolve',
    });
  };

  const submitResolution = async () => {
    if (!selected) return;
    if (!actionForm.resolution || actionForm.resolution.trim().length < 10) {
      toast.error('Resolution note must be at least 10 characters');
      return;
    }
    try {
      setBusy(true);
      await adminAPIService.resolveDispute(selected._id, {
        decision: actionForm.action === 'resolve' ? 'resolved' : 'rejected',
        resolution: actionForm.resolution.trim(),
        refundAmount: actionForm.refundAmount ? Number(actionForm.refundAmount) : 0,
      });
      toast.success(actionForm.action === 'resolve' ? 'Dispute resolved' : 'Dispute closed');
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update dispute');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-300">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-heading text-content-primary">Disputes</h1>
            <p className="text-xs text-content-muted">Review customer complaints and resolve them with notes & optional refunds.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={14} />
            <input
              type="text"
              placeholder="Search booking, customer, provider…"
              className="bg-surface-overlay border border-surface-border rounded-lg pl-9 pr-3 py-2 text-sm text-content-primary w-72"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button onClick={load} className="btn btn-secondary flex items-center gap-2 text-sm" disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { k: 'all', l: 'Total', c: counts.all, color: 'text-content-primary' },
          { k: 'open', l: 'Under review', c: counts.open, color: 'text-yellow-400' },
          { k: 'resolved', l: 'Resolved', c: counts.resolved, color: 'text-green-400' },
          { k: 'rejected', l: 'Closed', c: counts.rejected, color: 'text-gray-400' },
        ].map((s) => (
          <button
            key={s.k}
            onClick={() => setTab(s.k)}
            className={`text-left rounded-xl border px-4 py-3 transition-all ${
              tab === s.k
                ? 'border-orange-500/40 bg-orange-500/5'
                : 'border-surface-border bg-surface-overlay hover:border-surface-border-hover'
            }`}
          >
            <p className="text-xs text-content-muted">{s.l}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.c}</p>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-content-muted">
          <div className="w-6 h-6 rounded-full border-2 border-orange-500/30 border-t-orange-500 animate-spin mr-3" />
          Loading disputes…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-surface-overlay p-12 text-center">
          <ShieldCheck className="mx-auto text-green-400 mb-3" size={48} />
          <h3 className="text-content-primary font-semibold mb-1">No disputes here</h3>
          <p className="text-content-muted text-sm">When a customer raises a dispute it will land in this queue.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-overlay">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover/30">
              <tr className="text-left text-xs text-content-muted">
                <th className="px-4 py-3 font-medium">Booking</th>
                <th className="px-4 py-3 font-medium">Customer / Provider</th>
                <th className="px-4 py-3 font-medium">Reason</th>
                <th className="px-4 py-3 font-medium">Raised</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const status = b.dispute?.status || 'open';
                return (
                  <tr key={b._id} className="border-t border-surface-border hover:bg-surface-hover/30 transition-colors">
                    <td className="px-4 py-3 align-top">
                      <p className="text-content-primary font-medium">{b.service?.title || 'Service'}</p>
                      <p className="text-xs text-content-muted font-mono">{b.bookingId || b._id.slice(-8)}</p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-content-primary text-xs">{b.customer?.name || '—'}</p>
                      <p className="text-content-muted text-xs flex items-center gap-1 mt-0.5">
                        <ArrowRight size={10} /> {b.provider?.name || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top max-w-xs">
                      <p className="text-content-secondary line-clamp-2 text-xs">{b.dispute?.reason || '—'}</p>
                      {b.dispute?.evidencePhotos?.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-orange-300 mt-1">
                          <ImageIcon size={10} /> {b.dispute.evidencePhotos.length} photo{b.dispute.evidencePhotos.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-content-secondary whitespace-nowrap">
                      {fmt(b.dispute?.raisedAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold ${STATUS_PILL[status] || ''}`}>
                        {status === 'open' ? 'Under review' : status === 'resolved' ? 'Resolved' : 'Closed'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <button
                        onClick={() => openModal(b)}
                        className="btn btn-secondary text-xs px-3 py-1"
                      >
                        {status === 'open' ? 'Review' : 'View'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Resolution modal ─── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => !busy && setSelected(null)}
        >
          <div
            className="bg-surface-overlay border border-surface-border rounded-2xl p-6 max-w-3xl w-full max-h-[88vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-300">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-heading text-content-primary">Resolve Dispute</h3>
                  <p className="text-xs text-content-muted font-mono">{selected.bookingId || selected._id}</p>
                </div>
              </div>
              <button
                onClick={() => !busy && setSelected(null)}
                className="text-content-muted hover:text-content-primary"
              >
                <XIcon size={18} />
              </button>
            </div>

            {/* Booking facts */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-4 p-3 rounded-lg bg-surface-base border border-surface-border">
              <div><p className="text-content-muted">Service</p><p className="text-content-primary">{selected.service?.title}</p></div>
              <div><p className="text-content-muted">Amount</p><p className="text-content-primary">₹{selected.pricing?.agreedAmount || 0}</p></div>
              <div className="flex items-center gap-1.5"><UserIcon size={11} className="text-content-muted" /><span className="text-content-muted">Customer:</span><span className="text-content-primary">{selected.customer?.name}</span></div>
              <div className="flex items-center gap-1.5"><UserIcon size={11} className="text-content-muted" /><span className="text-content-muted">Provider:</span><span className="text-content-primary">{selected.provider?.name}</span></div>
              <div className="flex items-center gap-1.5"><Calendar size={11} className="text-content-muted" /><span className="text-content-muted">Service date:</span><span className="text-content-primary">{selected.scheduledDate ? new Date(selected.scheduledDate).toLocaleDateString('en-IN') : '—'}</span></div>
              <div><p className="text-content-muted">Raised</p><p className="text-content-primary">{fmt(selected.dispute?.raisedAt)}</p></div>
            </div>

            {/* Reason */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-orange-300 uppercase tracking-wider mb-1.5">Customer complaint</p>
              <p className="text-sm text-content-secondary p-3 rounded-lg bg-surface-base border border-surface-border whitespace-pre-wrap">
                {selected.dispute?.reason || '—'}
              </p>
            </div>

            {/* Evidence */}
            {selected.dispute?.evidencePhotos?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-orange-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <ImageIcon size={12} /> Evidence ({selected.dispute.evidencePhotos.length})
                </p>
                <div className="flex gap-2 flex-wrap">
                  {selected.dispute.evidencePhotos.map((src, i) => (
                    <button
                      key={i}
                      type="button"
                      className="w-24 h-24 rounded-lg overflow-hidden border border-surface-border hover:border-orange-500/40 transition-all"
                      onClick={() => setLightbox(src)}
                    >
                      <img src={src} alt={`Evidence ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action form (only for open) */}
            {selected.dispute?.status === 'open' ? (
              <div className="space-y-3 border-t border-surface-border pt-4">
                <div>
                  <label className="text-xs font-semibold text-content-primary block mb-1.5">Decision</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActionForm((p) => ({ ...p, action: 'resolve' }))}
                      className={`flex-1 text-sm px-3 py-2 rounded-lg border font-semibold transition-all ${
                        actionForm.action === 'resolve'
                          ? 'border-green-500/40 bg-green-500/10 text-green-300'
                          : 'border-surface-border text-content-muted hover:text-content-primary'
                      }`}
                    >
                      <CheckCircle size={14} className="inline mr-1" /> Resolve in customer's favor
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionForm((p) => ({ ...p, action: 'reject' }))}
                      className={`flex-1 text-sm px-3 py-2 rounded-lg border font-semibold transition-all ${
                        actionForm.action === 'reject'
                          ? 'border-red-500/40 bg-red-500/10 text-red-300'
                          : 'border-surface-border text-content-muted hover:text-content-primary'
                      }`}
                    >
                      <XIcon size={14} className="inline mr-1" /> Reject / close
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-content-primary block mb-1.5">Resolution notes <span className="text-content-muted font-normal">(visible to both parties)</span></label>
                  <textarea
                    rows={3}
                    value={actionForm.resolution}
                    onChange={(e) => setActionForm((p) => ({ ...p, resolution: e.target.value }))}
                    className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-content-primary resize-y focus:outline-none focus:border-orange-500/40"
                    placeholder="Explain the decision and any next steps..."
                    maxLength={2000}
                  />
                </div>

                {actionForm.action === 'resolve' && (
                  <div>
                    <label className="text-xs font-semibold text-content-primary block mb-1.5">
                      Refund amount <span className="text-content-muted font-normal">(metadata only — no payment is moved)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={selected.pricing?.agreedAmount || 100000}
                      value={actionForm.refundAmount}
                      onChange={(e) => setActionForm((p) => ({ ...p, refundAmount: e.target.value }))}
                      className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-content-primary focus:outline-none focus:border-orange-500/40"
                      placeholder="0"
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSelected(null)}
                    className="btn btn-secondary flex-1"
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitResolution}
                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                    disabled={busy}
                  >
                    {busy ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                    {busy ? 'Submitting…' : actionForm.action === 'resolve' ? 'Resolve dispute' : 'Close dispute'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-surface-border pt-4">
                <p className="text-xs font-semibold text-orange-300 uppercase tracking-wider mb-1.5">Resolution</p>
                <p className="text-sm text-content-secondary p-3 rounded-lg bg-surface-base border border-surface-border whitespace-pre-wrap">
                  {selected.dispute?.resolution || '—'}
                </p>
                {Number(selected.dispute?.refundAmount) > 0 && (
                  <p className="text-xs text-green-400 mt-2">
                    Refund recorded: ₹{Number(selected.dispute.refundAmount).toLocaleString('en-IN')}
                  </p>
                )}
                {selected.dispute?.resolvedAt && (
                  <p className="text-[11px] text-content-muted mt-1">Closed on {fmt(selected.dispute.resolvedAt)}</p>
                )}
                <button onClick={() => setSelected(null)} className="btn btn-secondary w-full mt-3">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Evidence" className="max-w-[92vw] max-h-[92vh] rounded-xl" />
        </div>
      )}
    </div>
  );
};

export default AdminDisputes;
