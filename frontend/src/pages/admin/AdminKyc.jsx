import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, CheckCircle, X as XIcon, Search, RefreshCw,
  Loader2, ExternalLink, AlertTriangle, FileText, CreditCard, Camera
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import { toast } from 'react-hot-toast';

const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—';

const AdminKyc = () => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await adminAPIService.listPendingKyc();
      const list = res?.data?.items || res?.data?.users || res?.users || [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to load KYC queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    if (!lower) return users;
    return users.filter((u) => (
      u.name?.toLowerCase().includes(lower) ||
      u.email?.toLowerCase().includes(lower) ||
      u.phone?.toLowerCase().includes(lower)
    ));
  }, [users, search]);

  const approve = async (userId) => {
    try {
      setBusy(true);
      await adminAPIService.approveKyc(userId);
      toast.success('KYC approved · Verified badge awarded');
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to approve');
    } finally {
      setBusy(false);
    }
  };

  const reject = async (userId) => {
    if (!rejectReason || rejectReason.trim().length < 10) {
      toast.error('Reason must be at least 10 characters');
      return;
    }
    try {
      setBusy(true);
      await adminAPIService.rejectKyc(userId, { reason: rejectReason.trim() });
      toast.success('KYC rejected · Provider notified');
      setSelected(null);
      setRejectReason('');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to reject');
    } finally {
      setBusy(false);
    }
  };

  const docs = (u) => [
    { key: 'aadhaar', label: 'Aadhaar', icon: CreditCard, src: u?.kyc?.aadhaarUrl },
    { key: 'pan',     label: 'PAN',     icon: FileText,   src: u?.kyc?.panUrl },
    { key: 'selfie',  label: 'Selfie',  icon: Camera,     src: u?.kyc?.selfieUrl },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-300">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-heading text-content-primary">KYC Verification Queue</h1>
            <p className="text-xs text-content-muted">Review provider documents and approve or reject submissions.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-content-muted" size={14} />
            <input
              type="text"
              placeholder="Search name, email, phone…"
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

      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
        <ShieldAlert size={16} className="text-blue-300 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-200">Verify carefully</p>
          <p className="text-xs text-content-secondary mt-0.5">
            Approving auto-grants the <strong>Verified</strong> badge and lifts trust signals across the platform. Reject if any document is unclear, expired, or the selfie doesn't match.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-content-muted">
          <Loader2 className="animate-spin mr-3" size={20} /> Loading queue…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-surface-border bg-surface-overlay p-12 text-center">
          <ShieldCheck className="mx-auto text-green-400 mb-3" size={48} />
          <h3 className="text-content-primary font-semibold mb-1">Inbox zero!</h3>
          <p className="text-content-muted text-sm">No pending KYC submissions right now.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-overlay">
          <table className="w-full text-sm">
            <thead className="bg-surface-hover/30">
              <tr className="text-left text-xs text-content-muted">
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Documents</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id} className="border-t border-surface-border hover:bg-surface-hover/30 transition-colors">
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-3">
                      {u.profileImage ? (
                        <img src={u.profileImage} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 font-semibold flex items-center justify-center text-xs">
                          {(u.name || 'U').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-content-primary font-medium">{u.name || 'Provider'}</p>
                        <p className="text-xs text-content-muted">{u.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-content-secondary">
                    <p>{u.email || '—'}</p>
                    <p className="text-content-muted">{u.phone || '—'}</p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-1.5 text-xs">
                      {docs(u).map((d) => (
                        <span
                          key={d.key}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                            d.src
                              ? 'border-green-500/30 bg-green-500/10 text-green-300'
                              : 'border-red-500/30 bg-red-500/10 text-red-300'
                          }`}
                        >
                          <d.icon size={10} /> {d.label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-content-secondary">
                    {fmt(u.kyc?.submittedAt)}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <button
                      onClick={() => { setSelected(u); setRejectReason(''); }}
                      className="btn btn-secondary text-xs px-3 py-1"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review modal */}
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
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-300">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-heading text-content-primary">Verify {selected.name}</h3>
                  <p className="text-xs text-content-muted">{selected.email} · {selected.phone}</p>
                </div>
              </div>
              <button
                onClick={() => !busy && setSelected(null)}
                className="text-content-muted hover:text-content-primary"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              {docs(selected).map((d) => (
                <div key={d.key} className="rounded-xl border border-surface-border bg-surface-base overflow-hidden">
                  <div className="px-3 py-2 flex items-center gap-2 text-xs text-content-secondary border-b border-surface-border">
                    <d.icon size={12} className="text-orange-300" /> {d.label}
                  </div>
                  {d.src ? (
                    <button
                      type="button"
                      onClick={() => setLightbox(d.src)}
                      className="block w-full bg-black/30 aspect-[4/3]"
                    >
                      <img src={d.src} alt={d.label} className="w-full h-full object-cover" />
                    </button>
                  ) : (
                    <div className="aspect-[4/3] flex flex-col items-center justify-center text-red-300 text-xs">
                      <AlertTriangle size={20} className="mb-1" /> Missing
                    </div>
                  )}
                  {d.src && (
                    <a
                      href={d.src}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-content-muted hover:text-orange-400 inline-flex items-center gap-1 px-3 py-1.5"
                    >
                      Open original <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-surface-border pt-4 space-y-3">
              <label className="text-xs font-semibold text-content-primary block">Rejection reason <span className="text-content-muted font-normal">(only needed if rejecting)</span></label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-surface-base border border-surface-border rounded-lg px-3 py-2 text-sm text-content-primary resize-y focus:outline-none focus:border-orange-500/40"
                placeholder="e.g. Aadhaar photo is blurry on the right edge — please re-upload"
                maxLength={500}
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => reject(selected._id)}
                  className="btn btn-secondary flex-1 flex items-center justify-center gap-2 border-red-500/30 text-red-300 hover:bg-red-500/10"
                  disabled={busy || !rejectReason.trim()}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <XIcon size={14} />}
                  Reject
                </button>
                <button
                  onClick={() => approve(selected._id)}
                  className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={busy}
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                  Approve & verify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Document" className="max-w-[92vw] max-h-[92vh] rounded-xl" />
        </div>
      )}
    </div>
  );
};

export default AdminKyc;
