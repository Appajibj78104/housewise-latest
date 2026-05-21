import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { providerAPI } from '../../services/api';
import { cachedFetch } from '../../utils/apiCache';
import { useAuth } from '../../context/AuthContext';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Briefcase,
  User,
  ArrowUpRight,
  Filter,
  Download,
  IndianRupee,
  BarChart3,
  PieChart,
  X,
  Edit3,
  Save,
  Loader,
} from 'lucide-react';

/* ─── Category config ─── */
const CAT_CONFIG = {
  cooking:     { emoji: '🍱', label: 'Cooking',     color: '#FF6B4A' },
  tailoring:   { emoji: '✂️',  label: 'Tailoring',   color: '#8B5CF6' },
  tuition:     { emoji: '📚', label: 'Tuition',     color: '#3B82F6' },
  beauty:      { emoji: '💄', label: 'Beauty',      color: '#EC4899' },
  cleaning:    { emoji: '🧹', label: 'Cleaning',    color: '#10B981' },
  childcare:   { emoji: '👶', label: 'Childcare',   color: '#F59E0B' },
  eldercare:   { emoji: '🤝', label: 'Elder Care',  color: '#06B6D4' },
  handicrafts: { emoji: '🎨', label: 'Handicrafts', color: '#F97316' },
  catering:    { emoji: '🍽️', label: 'Catering',    color: '#EF4444' },
  other:       { emoji: '⭐', label: 'Other',       color: '#6b7385' },
};
const getCat = (c) => CAT_CONFIG[c?.toLowerCase()] || CAT_CONFIG.other;

/* ─── Format helpers ─── */
const formatCurrency = (val) => {
  if (!val && val !== 0) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN');
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatDateShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};

const formatTime = (t) => {
  if (!t) return '';
  if (t.includes(':') && !t.includes('AM') && !t.includes('PM')) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hr = h % 12 || 12;
    return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
  }
  return t;
};

const getInitials = (name) => (name || 'C').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ─── Avatar gradients ─── */
const GRADS = [
  'linear-gradient(135deg, #FF6B4A, #FF8C5A)',
  'linear-gradient(135deg, #3B82F6, #60A5FA)',
  'linear-gradient(135deg, #8B5CF6, #A78BFA)',
  'linear-gradient(135deg, #10B981, #34D399)',
  'linear-gradient(135deg, #EC4899, #F472B6)',
  'linear-gradient(135deg, #F59E0B, #FBBF24)',
];
const getGrad = (name) => GRADS[(name || '').charCodeAt(0) % GRADS.length];

/* ─── Count-up hook ─── */
const useCountUp = (end, duration = 700) => {
  const [value, setValue] = useState(0);
  const endNum = typeof end === 'number' ? end : parseFloat(end) || 0;
  useEffect(() => {
    if (endNum === 0) { setValue(0); return; }
    let start;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setValue((1 - Math.pow(1 - p, 3)) * endNum);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [endNum, duration]);
  return value;
};

/* ─── Period helpers ─── */
const getPeriodRange = (period) => {
  const now = new Date();
  const start = new Date(now);
  if (period === 'week') start.setDate(now.getDate() - 7);
  else if (period === 'month') start.setMonth(now.getMonth() - 1);
  else if (period === 'quarter') start.setMonth(now.getMonth() - 3);
  else if (period === 'year') start.setFullYear(now.getFullYear() - 1);
  else start.setFullYear(2000); // 'all'
  return start;
};

/* ─── Toast ─── */
const Toast = ({ message, type = 'success', onClose }) => (
  <div className={`pe-toast pe-toast-${type}`}>
    {type === 'success' && <CheckCircle style={{ width: 16, height: 16 }} />}
    {type === 'error' && <AlertCircle style={{ width: 16, height: 16 }} />}
    <span>{message}</span>
    <button onClick={onClose} className="pe-toast-close"><X style={{ width: 14, height: 14 }} /></button>
  </div>
);

/* ─── Payment method config ─── */
const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash',            icon: '💵', color: '#10b981', desc: 'No additional details required' },
  { value: 'upi',           label: 'UPI',             icon: '📱', color: '#818cf8', desc: 'Enter UTR / Transaction ID' },
  { value: 'online',        label: 'Online Transfer',  icon: '🌐', color: '#60a5fa', desc: 'Enter transaction reference' },
  { value: 'bank_transfer', label: 'Bank Transfer',    icon: '🏦', color: '#fbbf24', desc: 'Enter NEFT/IMPS reference' },
];
const getMethodConfig = (v) => PAYMENT_METHODS.find(m => m.value === v) || PAYMENT_METHODS[0];

/* ─── Payment Editor (inline, full-flow) ─── */
const PaymentEditor = ({ booking, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState(booking.pricing?.paymentMethod || 'cash');
  const [txnId, setTxnId] = useState(booking.pricing?.transactionId || '');
  const [bankName, setBankName] = useState('');
  const [note, setNote] = useState(booking.pricing?.paymentNote || '');
  const [validationError, setValidationError] = useState('');

  const currentMethod = booking.pricing?.paymentMethod || 'cash';
  const currentConfig = getMethodConfig(currentMethod);
  const selectedConfig = getMethodConfig(method);

  /* Reset form when switching methods */
  const handleMethodChange = (val) => {
    setMethod(val);
    setTxnId('');
    setBankName('');
    setNote('');
    setValidationError('');
  };

  /* Validate before save */
  const validate = () => {
    if (method === 'upi' && !txnId.trim()) {
      setValidationError('UTR / Transaction ID is required for UPI payments');
      return false;
    }
    if (method === 'online' && !txnId.trim()) {
      setValidationError('Transaction Reference ID is required for online payments');
      return false;
    }
    if (method === 'bank_transfer' && !txnId.trim()) {
      setValidationError('NEFT/IMPS Reference Number is required for bank transfers');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const paymentNote = method === 'bank_transfer' && bankName.trim()
        ? `Bank: ${bankName.trim()}${note.trim() ? ' | ' + note.trim() : ''}`
        : note.trim();
      await onSave(booking._id, {
        paymentMethod: method,
        transactionId: method !== 'cash' ? txnId.trim() : '',
        paymentNote,
      });
      setEditing(false);
    } catch {
      // error toast handled in parent
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setMethod(booking.pricing?.paymentMethod || 'cash');
    setTxnId(booking.pricing?.transactionId || '');
    setBankName('');
    setNote(booking.pricing?.paymentNote || '');
    setValidationError('');
    setEditing(false);
  };

  /* ── READ MODE ── */
  if (!editing) {
    return (
      <div className="pe-pay-display">
        <div className="pe-pay-display-header">
          <CreditCard style={{ width: 14, height: 14, color: '#FF6B4A' }} />
          <span className="pe-pay-display-title">Payment Info</span>
          <button className="pe-pay-edit-btn" onClick={() => setEditing(true)}>
            <Edit3 style={{ width: 12, height: 12 }} /> Update Payment
          </button>
        </div>
        <div className="pe-pay-display-row">
          <span className="pe-pay-display-label">Method</span>
          <span className="pe-pay-display-value pe-pay-method-pill" data-method={currentMethod}>
            <span className="pe-pay-pill-icon">{currentConfig.icon}</span>
            {currentConfig.label}
          </span>
        </div>
        {booking.pricing?.transactionId && (
          <div className="pe-pay-display-row">
            <span className="pe-pay-display-label">Transaction ID</span>
            <span className="pe-pay-display-value pe-pay-txn">{booking.pricing.transactionId}</span>
          </div>
        )}
        {booking.pricing?.paymentNote && (
          <div className="pe-pay-display-row">
            <span className="pe-pay-display-label">Note</span>
            <span className="pe-pay-display-value">{booking.pricing.paymentNote}</span>
          </div>
        )}
        {booking.pricing?.paymentUpdatedAt && (
          <span className="pe-pay-updated">
            <CheckCircle style={{ width: 11, height: 11 }} /> Updated {formatDate(booking.pricing.paymentUpdatedAt)}
          </span>
        )}
      </div>
    );
  }

  /* ── EDIT MODE ── */
  return (
    <div className="pe-pay-editor">
      <div className="pe-pay-editor-header">
        <CreditCard style={{ width: 14, height: 14, color: '#FF6B4A' }} />
        <span className="pe-pay-editor-title">Update Payment</span>
        <button className="pe-pay-close-btn" onClick={handleCancel}>
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>

      {/* ── Step 1: Method selector ── */}
      <div className="pe-pay-step-label">Select payment method</div>
      <div className="pe-pay-methods">
        {PAYMENT_METHODS.map(m => (
          <button
            key={m.value}
            className={`pe-pay-method-btn ${method === m.value ? 'pe-pay-method-active' : ''}`}
            onClick={() => handleMethodChange(m.value)}
            style={method === m.value ? { borderColor: m.color, boxShadow: `0 0 0 1px ${m.color}33` } : {}}
          >
            <span className="pe-pay-method-icon">{m.icon}</span>
            <span className="pe-pay-method-label">{m.label}</span>
            {method === m.value && (
              <span className="pe-pay-method-check">
                <CheckCircle style={{ width: 14, height: 14, color: m.color }} />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Step 2: Dynamic form based on selected method ── */}
      <div className="pe-pay-form-section">
        <div className="pe-pay-form-divider" />

        {/* ── CASH ── */}
        {method === 'cash' && (
          <div className="pe-pay-form-body pe-pay-animate-in">
            <div className="pe-pay-cash-msg">
              <CheckCircle style={{ width: 18, height: 18, color: '#10b981' }} />
              <div>
                <div className="pe-pay-cash-title">No additional details required</div>
                <div className="pe-pay-cash-sub">Cash payment — just confirm to update</div>
              </div>
            </div>
            <div className="pe-pay-field">
              <label className="pe-pay-field-label">Payment Note <span className="pe-pay-optional">(optional)</span></label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note if needed..."
                className="pe-pay-field-textarea"
                rows={2}
                maxLength={300}
              />
            </div>
          </div>
        )}

        {/* ── UPI ── */}
        {method === 'upi' && (
          <div className="pe-pay-form-body pe-pay-animate-in">
            <div className="pe-pay-field">
              <label className="pe-pay-field-label">
                UTR / Transaction ID <span className="pe-pay-required">*</span>
              </label>
              <input
                type="text"
                value={txnId}
                onChange={(e) => { setTxnId(e.target.value); setValidationError(''); }}
                placeholder="e.g. 425619283746 or UTR123456789"
                className={`pe-pay-field-input ${validationError ? 'pe-pay-field-error' : ''}`}
                maxLength={100}
                autoFocus
              />
              {validationError && <span className="pe-pay-error-msg">{validationError}</span>}
            </div>
            <div className="pe-pay-field">
              <label className="pe-pay-field-label">Payment Note <span className="pe-pay-optional">(optional)</span></label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Received via Google Pay"
                className="pe-pay-field-textarea"
                rows={2}
                maxLength={300}
              />
            </div>
          </div>
        )}

        {/* ── ONLINE TRANSFER ── */}
        {method === 'online' && (
          <div className="pe-pay-form-body pe-pay-animate-in">
            <div className="pe-pay-field">
              <label className="pe-pay-field-label">
                Transaction Reference ID <span className="pe-pay-required">*</span>
              </label>
              <input
                type="text"
                value={txnId}
                onChange={(e) => { setTxnId(e.target.value); setValidationError(''); }}
                placeholder="e.g. TXN-2026-0423-78901"
                className={`pe-pay-field-input ${validationError ? 'pe-pay-field-error' : ''}`}
                maxLength={100}
                autoFocus
              />
              {validationError && <span className="pe-pay-error-msg">{validationError}</span>}
            </div>
            <div className="pe-pay-field">
              <label className="pe-pay-field-label">Payment Note <span className="pe-pay-optional">(optional)</span></label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Payment via Razorpay, Paytm..."
                className="pe-pay-field-textarea"
                rows={2}
                maxLength={300}
              />
            </div>
          </div>
        )}

        {/* ── BANK TRANSFER ── */}
        {method === 'bank_transfer' && (
          <div className="pe-pay-form-body pe-pay-animate-in">
            <div className="pe-pay-field">
              <label className="pe-pay-field-label">
                NEFT / IMPS Reference Number <span className="pe-pay-required">*</span>
              </label>
              <input
                type="text"
                value={txnId}
                onChange={(e) => { setTxnId(e.target.value); setValidationError(''); }}
                placeholder="e.g. NEFT0423202600123"
                className={`pe-pay-field-input ${validationError ? 'pe-pay-field-error' : ''}`}
                maxLength={100}
                autoFocus
              />
              {validationError && <span className="pe-pay-error-msg">{validationError}</span>}
            </div>
            <div className="pe-pay-field">
              <label className="pe-pay-field-label">Bank Name <span className="pe-pay-optional">(optional)</span></label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. State Bank of India"
                className="pe-pay-field-input"
                maxLength={80}
              />
            </div>
            <div className="pe-pay-field">
              <label className="pe-pay-field-label">Payment Note <span className="pe-pay-optional">(optional)</span></label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any additional details..."
                className="pe-pay-field-textarea"
                rows={2}
                maxLength={300}
              />
            </div>
          </div>
        )}

        {/* ── Action buttons (always visible when editing) ── */}
        <div className="pe-pay-actions">
          <button className="pe-pay-cancel-btn" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="pe-pay-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader style={{ width: 14, height: 14 }} className="pe-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle style={{ width: 14, height: 14 }} />
                {method === 'cash' ? 'Confirm Payment' : 'Update Payment'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Skeleton ─── */
const Shimmer = ({ className = '' }) => <div className={`pe-shimmer ${className}`} />;
const EarningsSkeleton = () => (
  <div className="pe-page">
    <Shimmer className="pe-skel-header" />
    <div className="pe-skel-stats">
      {[1, 2, 3, 4].map(i => <Shimmer key={i} className="pe-skel-stat" />)}
    </div>
    <Shimmer className="pe-skel-bar" />
    {[1, 2, 3].map(i => <Shimmer key={i} className="pe-skel-card" />)}
  </div>
);

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */
const ProviderEarnings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [serverSummary, setServerSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [period, setPeriod] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedId, setExpandedId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [toast, setToast] = useState(null);

  /* ─── Fetch completed bookings ─── */
  const getSignal = useCallback(() => new AbortController().signal, []);

  const fetchEarnings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const signal = getSignal();
      const uid = user?._id || user?.id || '';
      const cacheKey = `provider-earnings-${uid}`;
      const response = await cachedFetch(cacheKey, () => providerAPI.getEarnings({ signal }), { staleTime: 30000, signal });

      // Validate response
      if (!response || response.success === false) {
        console.error('Earnings API returned failure:', response);
        setError(response?.message || 'Failed to load earnings data');
        return;
      }

      const payload = response?.data || response;
      const data = payload?.bookings || [];
      setBookings(Array.isArray(data) ? data : []);
      if (payload?.summary) setServerSummary(payload.summary);
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('fetchEarnings error:', err);
      setError('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  }, [getSignal, user]);

  useEffect(() => { fetchEarnings(); }, [fetchEarnings]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  /* ─── Update payment info ─── */
  const handlePaymentUpdate = async (bookingId, paymentData) => {
    try {
      const res = await providerAPI.updatePaymentInfo(bookingId, paymentData);
      const updated = res?.data?.booking || res?.booking;
      if (updated) {
        setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, pricing: { ...b.pricing, ...updated.pricing } } : b));
      }
      setToast({ message: 'Payment info updated', type: 'success' });
    } catch (err) {
      setToast({ message: 'Failed to update payment info', type: 'error' });
      throw err;
    }
  };

  /* ─── Period filtering (memoized) ─── */
  const periodStart = useMemo(() => getPeriodRange(period), [period]);
  const periodBookings = useMemo(() => bookings.filter(b => {
    const d = new Date(b.completion?.completedAt || b.scheduledDate || b.createdAt);
    return d >= periodStart;
  }), [bookings, periodStart]);

  /* ─── Category & search filtering (memoized) ─── */
  const filtered = useMemo(() => periodBookings
    .filter(b => {
      const matchesCat = categoryFilter === 'all' || b.service?.category?.toLowerCase() === categoryFilter;
      const matchesSearch = !searchTerm ||
        b.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.service?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.bookingId?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    })
    .sort((a, b) => {
      const dateA = new Date(a.completion?.completedAt || a.scheduledDate || a.createdAt);
      const dateB = new Date(b.completion?.completedAt || b.scheduledDate || b.createdAt);
      if (sortBy === 'newest') return dateB - dateA;
      if (sortBy === 'oldest') return dateA - dateB;
      if (sortBy === 'highest') return (b.pricing?.agreedAmount || 0) - (a.pricing?.agreedAmount || 0);
      if (sortBy === 'lowest') return (a.pricing?.agreedAmount || 0) - (b.pricing?.agreedAmount || 0);
      return 0;
    }), [periodBookings, categoryFilter, searchTerm, sortBy]);

  /* ─── Stats (memoized) ─── */
  const { totalEarnings, avgEarning, completedCount, growthPct, highestBooking, categoryList, paymentBreakdown, monthlyTrend, maxMonthly } = useMemo(() => {
    // Use server-calculated totals when showing all-time (most reliable)
    const clientTotal = periodBookings.reduce((s, b) => s + (b.pricing?.agreedAmount || 0), 0);
    const totalEarnings = (period === 'all' && serverSummary?.totalEarnings != null)
      ? serverSummary.totalEarnings
      : clientTotal;
    const completedCount = (period === 'all' && serverSummary?.completedCount != null)
      ? serverSummary.completedCount
      : periodBookings.length;
    const avgEarning = completedCount > 0 ? totalEarnings / completedCount : 0;

    const prevStart = new Date(periodStart);
    const periodMs = Date.now() - periodStart.getTime();
    prevStart.setTime(prevStart.getTime() - periodMs);
    const prevBookings = bookings.filter(b => {
      const d = new Date(b.completion?.completedAt || b.scheduledDate || b.createdAt);
      return d >= prevStart && d < periodStart;
    });
    const prevTotal = prevBookings.reduce((s, b) => s + (b.pricing?.agreedAmount || 0), 0);
    const growthPct = prevTotal > 0 ? ((totalEarnings - prevTotal) / prevTotal * 100) : (totalEarnings > 0 ? 100 : 0);

    const highestBooking = periodBookings.reduce((max, b) =>
      (b.pricing?.agreedAmount || 0) > (max?.pricing?.agreedAmount || 0) ? b : max, periodBookings[0]);

    const categoryBreakdown = {};
    periodBookings.forEach(b => {
      const cat = b.service?.category?.toLowerCase() || 'other';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { count: 0, total: 0 };
      categoryBreakdown[cat].count += 1;
      categoryBreakdown[cat].total += (b.pricing?.agreedAmount || 0);
    });
    const categoryList = Object.entries(categoryBreakdown)
      .map(([key, val]) => ({ key, ...getCat(key), ...val }))
      .sort((a, b) => b.total - a.total);

    const paymentBreakdown = {};
    periodBookings.forEach(b => {
      const method = b.pricing?.paymentMethod || 'cash';
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, total: 0 };
      paymentBreakdown[method].count += 1;
      paymentBreakdown[method].total += (b.pricing?.agreedAmount || 0);
    });

    const monthlyTrend = [];
    const trendMonths = period === 'week' ? 1 : period === 'month' ? 3 : period === 'quarter' ? 4 : period === 'year' ? 12 : 6;
    for (let i = trendMonths - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      const monthBookings = periodBookings.filter(b => {
        const bd = new Date(b.completion?.completedAt || b.scheduledDate || b.createdAt);
        return bd.getFullYear() === d.getFullYear() && bd.getMonth() === d.getMonth();
      });
      const total = monthBookings.reduce((s, b) => s + (b.pricing?.agreedAmount || 0), 0);
      monthlyTrend.push({ key: monthKey, label, total, count: monthBookings.length });
    }
    const maxMonthly = Math.max(...monthlyTrend.map(m => m.total), 1);

    return { totalEarnings, avgEarning, completedCount, growthPct, highestBooking, categoryList, paymentBreakdown, monthlyTrend, maxMonthly };
  }, [periodBookings, bookings, periodStart, period, serverSummary]);

  /* ─── Animated values ─── */
  const animTotal = useCountUp(totalEarnings);
  const animAvg = useCountUp(avgEarning);
  const animCount = useCountUp(completedCount, 500);

  /* ─── Period labels ─── */
  const periodOptions = [
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'Last 3 Months' },
    { value: 'year', label: 'This Year' },
    { value: 'all', label: 'All Time' },
  ];

  // Period display label
  const periodLabel = periodOptions.find(o => o.value === period)?.label || 'All Time';

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */
  if (loading) return <EarningsSkeleton />;

  return (
    <div className="pe-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ═══════ PAGE HEADER ═══════ */}
      <header className="pe-header pe-section">
        <div className="pe-header-left">
          <h1 className="pe-title">Earnings</h1>
          <p className="pe-subtitle">Track your revenue and completed services</p>
        </div>
        <div className="pe-period-select">
          {periodOptions.map(opt => (
            <button
              key={opt.value}
              className={`pe-period-btn ${period === opt.value ? 'pe-period-active' : ''}`}
              onClick={() => setPeriod(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </header>

      {/* ═══════ STATS GRID ═══════ */}
      <div className="pe-stats-grid pe-section">
        {/* Total Earnings */}
        <div className="pe-stat-card pe-stat-primary">
          <div className="pe-stat-icon-wrap pe-stat-icon-coral">
            <IndianRupee style={{ width: 22, height: 22 }} />
          </div>
          <div className="pe-stat-content">
            <span className="pe-stat-label">Total Earnings · {periodLabel}</span>
            <span className="pe-stat-value">{formatCurrency(Math.round(animTotal))}</span>
            <div className="pe-stat-trend">
              {growthPct >= 0 ? (
                <span className="pe-trend-up"><TrendingUp style={{ width: 13, height: 13 }} /> +{growthPct.toFixed(1)}%</span>
              ) : (
                <span className="pe-trend-down"><TrendingDown style={{ width: 13, height: 13 }} /> {growthPct.toFixed(1)}%</span>
              )}
              <span className="pe-trend-label">vs previous period</span>
            </div>
          </div>
        </div>

        {/* Completed Services */}
        <div className="pe-stat-card">
          <div className="pe-stat-icon-wrap pe-stat-icon-green">
            <CheckCircle style={{ width: 22, height: 22 }} />
          </div>
          <div className="pe-stat-content">
            <span className="pe-stat-label">Completed · {periodLabel}</span>
            <span className="pe-stat-value">{Math.round(animCount)}</span>
            <span className="pe-stat-sub">services this period</span>
          </div>
        </div>

        {/* Average Earning */}
        <div className="pe-stat-card">
          <div className="pe-stat-icon-wrap pe-stat-icon-blue">
            <BarChart3 style={{ width: 22, height: 22 }} />
          </div>
          <div className="pe-stat-content">
            <span className="pe-stat-label">Avg per Service</span>
            <span className="pe-stat-value">{formatCurrency(Math.round(animAvg))}</span>
            <span className="pe-stat-sub">average earning</span>
          </div>
        </div>

        {/* Highest Earning */}
        <div className="pe-stat-card">
          <div className="pe-stat-icon-wrap pe-stat-icon-purple">
            <ArrowUpRight style={{ width: 22, height: 22 }} />
          </div>
          <div className="pe-stat-content">
            <span className="pe-stat-label">Highest Earned</span>
            <span className="pe-stat-value">{formatCurrency(highestBooking?.pricing?.agreedAmount || 0)}</span>
            <span className="pe-stat-sub">{highestBooking?.service?.title || '—'}</span>
          </div>
        </div>
      </div>

      {/* ═══════ INSIGHTS ROW ═══════ */}
      <div className="pe-insights-row pe-section">
        {/* Monthly Trend Chart */}
        <div className="pe-insight-card pe-chart-card">
          <div className="pe-insight-header">
            <BarChart3 style={{ width: 16, height: 16, color: '#FF6B4A' }} />
            <span className="pe-insight-title">Trend · {periodLabel}</span>
          </div>
          <div className="pe-chart-bars">
            {monthlyTrend.map(m => (
              <div key={m.key} className="pe-bar-col">
                <span className="pe-bar-amount">{m.total > 0 ? formatCurrency(m.total) : '—'}</span>
                <div className="pe-bar-track">
                  <div
                    className="pe-bar-fill"
                    style={{ height: `${Math.max((m.total / maxMonthly) * 100, 4)}%` }}
                  />
                </div>
                <span className="pe-bar-label">{m.label}</span>
                <span className="pe-bar-count">{m.count} job{m.count !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="pe-insight-card pe-category-card">
          <div className="pe-insight-header">
            <PieChart style={{ width: 16, height: 16, color: '#FF6B4A' }} />
            <span className="pe-insight-title">By Category · {periodLabel}</span>
          </div>
          {categoryList.length > 0 ? (
            <div className="pe-cat-list">
              {categoryList.map(cat => (
                <button
                  key={cat.key}
                  className={`pe-cat-row ${categoryFilter === cat.key ? 'pe-cat-active' : ''}`}
                  onClick={() => setCategoryFilter(categoryFilter === cat.key ? 'all' : cat.key)}
                >
                  <span className="pe-cat-emoji">{cat.emoji}</span>
                  <span className="pe-cat-name">{cat.label}</span>
                  <span className="pe-cat-count">{cat.count}</span>
                  <div className="pe-cat-bar-track">
                    <div
                      className="pe-cat-bar-fill"
                      style={{
                        width: `${(cat.total / totalEarnings) * 100}%`,
                        background: cat.color,
                      }}
                    />
                  </div>
                  <span className="pe-cat-amount">{formatCurrency(cat.total)}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="pe-empty-mini">No data for this period</p>
          )}

          {/* Payment Methods */}
          {Object.keys(paymentBreakdown).length > 0 && (
            <div className="pe-payment-section">
              <span className="pe-payment-title">Payment Methods</span>
              <div className="pe-payment-chips">
                {Object.entries(paymentBreakdown).map(([method, info]) => (
                  <div key={method} className="pe-payment-chip">
                    <CreditCard style={{ width: 12, height: 12 }} />
                    <span className="pe-payment-method">{method.replace('_', ' ')}</span>
                    <span className="pe-payment-amount">{formatCurrency(info.total)}</span>
                    <span className="pe-payment-count">({info.count})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ ERROR ═══════ */}
      {error && (
        <div className="pe-section pe-error-banner">
          <AlertCircle style={{ width: 16, height: 16 }} />
          <span>{error}</span>
          <button onClick={fetchEarnings} className="pe-error-retry">Retry</button>
        </div>
      )}

      {/* ═══════ HISTORY HEADER ═══════ */}
      <div className="pe-section pe-history-header">
        <h2 className="pe-history-title">Earning History</h2>
        <span className="pe-history-sub">
          {filtered.length} completed service{filtered.length !== 1 ? 's' : ''} · {periodLabel}
          {categoryFilter !== 'all' && (
            <button className="pe-clear-filter" onClick={() => setCategoryFilter('all')}>
              <X style={{ width: 12, height: 12 }} /> Clear filter
            </button>
          )}
        </span>
      </div>

      {/* ═══════ FILTER BAR ═══════ */}
      <div className="pe-section pe-filter-bar">
        <div className="pe-search-wrap">
          <Search style={{ width: 16, height: 16 }} className="pe-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer, service, booking ID..."
            className="pe-search-input"
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="pe-sort-select">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Earning</option>
          <option value="lowest">Lowest Earning</option>
        </select>
      </div>

      {/* ═══════ EMPTY STATE ═══════ */}
      {filtered.length === 0 && !error && (
        <div className="pe-section pe-empty">
          <div className="pe-empty-illust">
            <IndianRupee style={{ width: 56, height: 56, color: '#3a3f4e' }} />
          </div>
          {bookings.length === 0 ? (
            <>
              <h3 className="pe-empty-title">No earnings yet</h3>
              <p className="pe-empty-sub">Complete your first service to start earning</p>
            </>
          ) : (
            <>
              <h3 className="pe-empty-title">No earnings match your filters</h3>
              <p className="pe-empty-sub">Try adjusting your search, period, or category</p>
              <button className="pe-clear-btn" onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setPeriod('all'); }}>
                Clear All Filters
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══════ EARNING CARDS ═══════ */}
      <div className="pe-list">
        {filtered.map((booking, idx) => {
          const cat = getCat(booking.service?.category);
          const isExpanded = expandedId === booking._id;
          const initials = getInitials(booking.customer?.name);
          const amount = booking.pricing?.agreedAmount || 0;
          const completedDate = booking.completion?.completedAt || booking.scheduledDate;

          return (
            <div
              key={booking._id}
              className="pe-card pe-section"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* ── Main row ── */}
              <div className="pe-card-row" onClick={() => setExpandedId(isExpanded ? null : booking._id)}>
                {/* Left: Customer + Service */}
                <div className="pe-card-left">
                  <div className="pe-card-avatar" style={{ background: getGrad(booking.customer?.name) }}>
                    {initials}
                  </div>
                  <div className="pe-card-info">
                    <span className="pe-card-customer">{booking.customer?.name || 'Customer'}</span>
                    <span className="pe-card-service">
                      <span className="pe-card-cat-dot" style={{ background: cat.color }} />
                      {booking.service?.title || 'Service'}
                    </span>
                  </div>
                </div>

                {/* Center: Date + Time */}
                <div className="pe-card-center">
                  <span className="pe-card-date">
                    <Calendar style={{ width: 12, height: 12 }} /> {formatDateShort(completedDate)}
                  </span>
                  {booking.scheduledTime?.start && (
                    <span className="pe-card-time">
                      <Clock style={{ width: 12, height: 12 }} /> {formatTime(booking.scheduledTime.start)}
                    </span>
                  )}
                </div>

                {/* Right: Amount + Expand */}
                <div className="pe-card-right">
                  <span className="pe-card-amount">{formatCurrency(amount)}</span>
                  <span className="pe-card-method">
                    <CreditCard style={{ width: 11, height: 11 }} />
                    {(booking.pricing?.paymentMethod || 'cash').replace('_', ' ')}
                  </span>
                  <ChevronDown
                    style={{
                      width: 16, height: 16,
                      transition: 'transform 0.3s',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                      color: '#6b7385'
                    }}
                  />
                </div>
              </div>

              {/* ── Expanded details ── */}
              <div className={`pe-card-expand ${isExpanded ? 'pe-expand-open' : ''}`}>
                <div className="pe-expand-inner">
                  <div className="pe-expand-grid">
                    <div className="pe-expand-col">
                      <div className="pe-expand-label">Booking ID</div>
                      <div className="pe-expand-value">{booking.bookingId || booking._id?.slice(-8)}</div>
                    </div>
                    <div className="pe-expand-col">
                      <div className="pe-expand-label">Category</div>
                      <div className="pe-expand-value">{cat.emoji} {cat.label}</div>
                    </div>
                    <div className="pe-expand-col">
                      <div className="pe-expand-label">Duration</div>
                      <div className="pe-expand-value">
                        {booking.duration?.actual || booking.duration?.estimated || '—'} min
                      </div>
                    </div>
                    <div className="pe-expand-col">
                      <div className="pe-expand-label">Completed</div>
                      <div className="pe-expand-value">{formatDate(completedDate)}</div>
                    </div>
                    {booking.customer?.phone && (
                      <div className="pe-expand-col">
                        <div className="pe-expand-label">Customer Phone</div>
                        <div className="pe-expand-value">{booking.customer.phone}</div>
                      </div>
                    )}
                    {booking.customer?.email && (
                      <div className="pe-expand-col">
                        <div className="pe-expand-label">Customer Email</div>
                        <div className="pe-expand-value">{booking.customer.email}</div>
                      </div>
                    )}
                  </div>
                  {booking.providerNotes && (
                    <div className="pe-expand-notes">
                      <span className="pe-expand-label">Your Notes</span>
                      <p>{booking.providerNotes}</p>
                    </div>
                  )}

                  {/* ── Payment Editor ── */}
                  <PaymentEditor booking={booking} onSave={handlePaymentUpdate} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProviderEarnings;
