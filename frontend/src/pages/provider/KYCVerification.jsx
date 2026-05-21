import React, { useEffect, useRef, useState } from 'react';
import {
  ShieldCheck, ShieldAlert, UploadCloud, FileText, User as UserIcon,
  CreditCard, CheckCircle, AlertTriangle, Camera, Loader2, X
} from 'lucide-react';
import { kycAPI } from '../../services/api';

const STATUS_META = {
  none:     { label: 'Not submitted', color: '#6b7385', icon: ShieldAlert,  bg: 'rgba(107,115,133,0.10)', border: 'rgba(107,115,133,0.30)' },
  pending:  { label: 'Under review',  color: '#F59E0B', icon: Loader2,      bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.30)' },
  verified: { label: 'Verified',      color: '#10B981', icon: ShieldCheck,  bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.30)' },
  rejected: { label: 'Rejected',      color: '#EF4444', icon: AlertTriangle,bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.30)' },
};

const FIELDS = [
  { key: 'aadhaar', label: 'Aadhaar card', icon: CreditCard, hint: 'Front side, all corners visible' },
  { key: 'pan',     label: 'PAN card',     icon: FileText,   hint: 'Clear photo of your PAN' },
  { key: 'selfie',  label: 'Selfie',       icon: Camera,     hint: 'Hold up your Aadhaar next to your face' },
];

const KYCVerification = () => {
  const [loading, setLoading] = useState(true);
  const [kyc, setKyc] = useState(null);
  const [error, setError] = useState('');
  const [files, setFiles] = useState({ aadhaar: null, pan: null, selfie: null });
  const [previews, setPreviews] = useState({ aadhaar: '', pan: '', selfie: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef({ aadhaar: null, pan: null, selfie: null });

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await kycAPI.getMine();
      const data = res?.data?.kyc || res?.kyc || null;
      setKyc(data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load KYC status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((u) => { if (u) URL.revokeObjectURL(u); });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = (key, e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) {
      setError('Each file must be under 8MB');
      return;
    }
    setError('');
    setFiles((prev) => ({ ...prev, [key]: f }));
    const oldUrl = previews[key];
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    setPreviews((prev) => ({ ...prev, [key]: URL.createObjectURL(f) }));
  };

  const onClear = (key) => {
    setFiles((prev) => ({ ...prev, [key]: null }));
    const oldUrl = previews[key];
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    setPreviews((prev) => ({ ...prev, [key]: '' }));
    if (inputRefs.current[key]) inputRefs.current[key].value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.aadhaar || !files.pan || !files.selfie) {
      setError('Please upload all three documents');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await kycAPI.submit(files);
      setSuccess(true);
      await load();
      setFiles({ aadhaar: null, pan: null, selfie: null });
      Object.values(previews).forEach((u) => { if (u) URL.revokeObjectURL(u); });
      setPreviews({ aadhaar: '', pan: '', selfie: '' });
      setTimeout(() => setSuccess(false), 4500);
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to submit KYC');
    } finally {
      setSubmitting(false);
    }
  };

  const status = kyc?.status || 'none';
  const meta = STATUS_META[status] || STATUS_META.none;
  const Icon = meta.icon;
  const canResubmit = status === 'none' || status === 'rejected';

  return (
    <div className="kyc-page">
      <header className="kyc-header">
        <div className="kyc-head-icon">
          <ShieldCheck style={{ width: 22, height: 22 }} />
        </div>
        <div>
          <h1 className="kyc-title">KYC Verification</h1>
          <p className="kyc-subtitle">Submit your documents to earn the Verified badge and unlock more bookings.</p>
        </div>
      </header>

      {/* Status card */}
      <div
        className="kyc-status-card"
        style={{
          background: `linear-gradient(135deg, ${meta.bg}, transparent)`,
          borderColor: meta.border,
        }}
      >
        <div className="kyc-status-icon" style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}>
          <Icon style={{ width: 22, height: 22 }} className={status === 'pending' ? 'kyc-spin' : ''} />
        </div>
        <div className="kyc-status-body">
          <span className="kyc-status-label" style={{ color: meta.color }}>{meta.label}</span>
          <p className="kyc-status-desc">
            {status === 'verified' && 'Your account is verified — the Verified badge is now visible on your profile.'}
            {status === 'pending' && 'Our team is reviewing your documents. We typically respond within 24 hours.'}
            {status === 'rejected' && (kyc?.rejectedReason || 'Your last submission was rejected. Please re-upload clearer photos.')}
            {status === 'none' && 'Upload Aadhaar, PAN and a selfie to start the verification process.'}
          </p>
          {kyc?.submittedAt && (
            <span className="kyc-status-date">Submitted {new Date(kyc.submittedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          )}
        </div>
      </div>

      {success && (
        <div className="kyc-success">
          <CheckCircle style={{ width: 16, height: 16 }} /> Documents submitted! We'll notify you once review completes.
        </div>
      )}
      {error && (
        <div className="kyc-error"><AlertTriangle style={{ width: 16, height: 16 }} /> {error}</div>
      )}

      {/* Upload form (hidden when verified or pending) */}
      {(canResubmit || status === 'pending') && (
        <form className="kyc-upload" onSubmit={handleSubmit}>
          <h3 className="kyc-upload-title">
            {status === 'pending' ? 'Documents under review' : 'Upload your documents'}
          </h3>
          <p className="kyc-upload-sub">
            {status === 'pending'
              ? 'Want to replace what you submitted? Upload again below; the latest submission overrides the previous one.'
              : 'All three documents are required. Photos must be clear and uncropped.'}
          </p>

          <div className="kyc-fields">
            {FIELDS.map((f) => {
              const FIcon = f.icon;
              const preview = previews[f.key];
              const existing = kyc?.[`${f.key}Url`];
              const showImg = preview || (existing && !preview);
              return (
                <div key={f.key} className="kyc-field">
                  <div className="kyc-field-head">
                    <FIcon style={{ width: 14, height: 14, color: '#FF6B4A' }} />
                    <span className="kyc-field-label">{f.label}</span>
                  </div>
                  <p className="kyc-field-hint">{f.hint}</p>

                  {showImg ? (
                    <div className="kyc-preview">
                      <img src={preview || existing} alt={f.label} className="kyc-preview-img" />
                      <button
                        type="button"
                        className="kyc-preview-remove"
                        onClick={() => onClear(f.key)}
                        aria-label="Remove file"
                      >
                        <X style={{ width: 14, height: 14 }} />
                      </button>
                      {!preview && (
                        <span className="kyc-preview-tag">Already uploaded</span>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="kyc-pick"
                      onClick={() => inputRefs.current[f.key]?.click()}
                    >
                      <UploadCloud style={{ width: 22, height: 22 }} />
                      <span>Tap to upload</span>
                      <span className="kyc-pick-meta">JPG/PNG · max 8MB</span>
                    </button>
                  )}

                  <input
                    ref={(el) => { inputRefs.current[f.key] = el; }}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => onPick(f.key, e)}
                  />
                </div>
              );
            })}
          </div>

          <div className="kyc-actions">
            <button
              type="submit"
              className="kyc-submit"
              disabled={submitting || !files.aadhaar || !files.pan || !files.selfie}
            >
              {submitting ? <Loader2 style={{ width: 14, height: 14 }} className="kyc-spin" /> : <UploadCloud style={{ width: 14, height: 14 }} />}
              {submitting ? 'Submitting…' : 'Submit for review'}
            </button>
          </div>
        </form>
      )}

      {/* Why KYC matters */}
      <div className="kyc-why">
        <h3 className="kyc-why-title"><ShieldCheck style={{ width: 14, height: 14, color: '#10B981' }} /> Why verify?</h3>
        <ul>
          <li><UserIcon style={{ width: 12, height: 12 }} /> Customers prefer verified providers — visible badge on every card.</li>
          <li><CheckCircle style={{ width: 12, height: 12 }} /> Higher placement in search results.</li>
          <li><ShieldCheck style={{ width: 12, height: 12 }} /> Required to unlock the Super Provider tier.</li>
        </ul>
      </div>

      {loading && (
        <div className="kyc-loading">
          <Loader2 style={{ width: 14, height: 14 }} className="kyc-spin" /> Loading…
        </div>
      )}
    </div>
  );
};

export default KYCVerification;
