import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { providerAPI } from '../../services/api';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  Search,
  MoreVertical,
  AlertCircle,
  Briefcase,
  Clock,
  Star,
  CalendarDays,
  Grid3X3,
  List,
  ChevronRight,
  X,
  Play,
  Pause,
  Copy,
  MapPin,
  Package,
  CheckCircle,
  ArrowUpRight,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

/* ─── Category config ─── */
const CATEGORY_CONFIG = {
  cooking:    { emoji: '🍱', label: 'Cooking',    color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)' },
  tailoring:  { emoji: '✂️',  label: 'Tailoring',  color: '#EC4899', bg: 'rgba(236,72,153,0.10)', border: 'rgba(236,72,153,0.25)' },
  tuition:    { emoji: '📚', label: 'Tuition',    color: '#3B82F6', bg: 'rgba(59,130,246,0.10)',  border: 'rgba(59,130,246,0.25)' },
  beauty:     { emoji: '💄', label: 'Beauty',     color: '#EC4899', bg: 'rgba(236,72,153,0.10)', border: 'rgba(236,72,153,0.25)' },
  cleaning:   { emoji: '🧹', label: 'Cleaning',   color: '#10B981', bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.25)' },
  childcare:  { emoji: '👶', label: 'Childcare',  color: '#8B5CF6', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.25)' },
  eldercare:  { emoji: '🤝', label: 'Elder Care', color: '#6366F1', bg: 'rgba(99,102,241,0.10)',  border: 'rgba(99,102,241,0.25)' },
  handicrafts:{ emoji: '🎨', label: 'Handicrafts',color: '#F97316', bg: 'rgba(249,115,22,0.10)',  border: 'rgba(249,115,22,0.25)' },
  catering:   { emoji: '🍽️', label: 'Catering',   color: '#EF4444', bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)' },
  other:      { emoji: '⭐', label: 'Other',      color: '#6b7385', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)' },
};
const getCatCfg = (c) => CATEGORY_CONFIG[c?.toLowerCase()] || CATEGORY_CONFIG.other;

/* ─── Status config ─── */
const STATUS_CONFIG = {
  active:   { label: 'Active',  color: '#10B981', bg: 'rgba(16,185,129,0.10)', border: 'rgba(16,185,129,0.25)', dot: '#10B981' },
  inactive: { label: 'Paused',  color: '#FBBF24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)', dot: '#FBBF24' },
  pending:  { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', dot: '#F59E0B' },
  draft:    { label: 'Draft',   color: '#6b7385', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.10)', dot: '#6b7385' },
};
const getStatusCfg = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.draft;

/* ─── Cover gradients ─── */
const GRADIENTS = [
  'linear-gradient(135deg, #FF6B4A 0%, #FF8C5A 100%)',
  'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
  'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
  'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
  'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
];
const getGradient = (name) => GRADIENTS[(name || '').charCodeAt(0) % GRADIENTS.length];

/* ─── Format currency ─── */
const formatCurrency = (val) => {
  if (!val && val !== 0) return '₹0';
  return '₹' + Number(val).toLocaleString('en-IN');
};

/* ─── Pricing display ─── */
const formatPricing = (pricing) => {
  if (!pricing) return 'Price not set';
  if (pricing.type === 'negotiable') return 'Negotiable';
  if (pricing.amount) return `${formatCurrency(pricing.amount)}${pricing.type === 'hourly' ? '/hr' : ''}`;
  return 'Price not set';
};

/* ─── Toast component ─── */
const Toast = ({ message, type = 'success', onClose }) => (
  <div className={`ps-toast ps-toast-${type}`}>
    {type === 'success' && <CheckCircle style={{ width: 16, height: 16 }} />}
    {type === 'error' && <AlertCircle style={{ width: 16, height: 16 }} />}
    <span>{message}</span>
    <button onClick={onClose} className="ps-toast-close"><X style={{ width: 14, height: 14 }} /></button>
  </div>
);

/* ─── Confirmation Modal ─── */
const ConfirmModal = ({ isOpen, title, description, confirmLabel, confirmColor, icon: Icon, iconColor, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="ps-modal-overlay" onClick={onCancel}>
      <div className="ps-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ps-modal-icon" style={{ background: `${iconColor}15`, color: iconColor }}>
          <Icon style={{ width: 28, height: 28 }} />
        </div>
        <h3 className="ps-modal-title">{title}</h3>
        <p className="ps-modal-desc">{description}</p>
        <div className="ps-modal-actions">
          <button className="ps-modal-cancel" onClick={onCancel}>Cancel</button>
          <button className="ps-modal-confirm" style={{ background: confirmColor }} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Skeleton loader ─── */
const Shimmer = ({ className = '' }) => <div className={`ps-shimmer ${className}`} />;
const GridSkeleton = () => (
  <div className="ps-grid">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="ps-card-skel">
        <Shimmer className="ps-skel-cover" />
        <div style={{ padding: '16px' }}>
          <Shimmer className="ps-skel-line-w60" />
          <Shimmer className="ps-skel-line-full" />
          <Shimmer className="ps-skel-line-w80" />
        </div>
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════ */
const ProviderServices = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [toast, setToast] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const menuRef = useRef(null);
  const getSignal = useCallback(() => new AbortController().signal, []);

  /* ─── Fetch ─── */
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const signal = getSignal();
      const response = await providerAPI.getMyServices({}, { signal });
      const svcData = response.data?.data?.services || response.data?.services || [];
      setServices(svcData);
    } catch (err) {
      if (isAbortError(err)) return;
      setError('Failed to load services');
    } finally {
      setLoading(false);
    }
  }, [getSignal]);

  useEffect(() => { fetchServices(); }, [fetchServices]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  /* Close menu on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ─── Actions ─── */
  const toggleServiceStatus = async (service) => {
    const newStatus = service.status === 'active' ? 'inactive' : 'active';
    const isActivating = newStatus === 'active';
    try {
      setTogglingId(service._id);
      await providerAPI.updateService(service._id, { status: newStatus });
      setServices(prev => prev.map(s => s._id === service._id ? { ...s, status: newStatus } : s));
      setToast({ message: isActivating ? 'Service activated' : 'Service paused', type: 'success' });
    } catch {
      setToast({ message: 'Failed to update status', type: 'error' });
    } finally {
      setTogglingId(null);
    }
  };

  const deleteService = async (serviceId) => {
    try {
      await providerAPI.deleteService(serviceId);
      setServices(prev => prev.filter(s => s._id !== serviceId));
      setToast({ message: 'Service deleted', type: 'success' });
    } catch {
      setToast({ message: 'Failed to delete service', type: 'error' });
    }
    setConfirmModal(null);
  };

  const confirmDelete = (service) => {
    setOpenMenu(null);
    setConfirmModal({
      title: 'Delete Service',
      description: `Are you sure you want to delete "${service.title}"? This action cannot be undone. All associated bookings will be affected.`,
      confirmLabel: 'Delete Service',
      confirmColor: '#EF4444',
      icon: Trash2,
      iconColor: '#EF4444',
      onConfirm: () => deleteService(service._id),
    });
  };

  const confirmPause = (service) => {
    setOpenMenu(null);
    const isActivating = service.status !== 'active';
    if (isActivating) {
      toggleServiceStatus(service);
      return;
    }
    setConfirmModal({
      title: 'Pause Service',
      description: `Pausing "${service.title}" will temporarily hide it from customers. You can reactivate it anytime.`,
      confirmLabel: 'Pause Service',
      confirmColor: '#FBBF24',
      icon: Pause,
      iconColor: '#FBBF24',
      onConfirm: () => { toggleServiceStatus(service); setConfirmModal(null); },
    });
  };

  /* ─── Filtering ─── */
  const filteredServices = services.filter(svc => {
    const matchesSearch = !searchTerm ||
      svc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      svc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      svc.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || svc.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || svc.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  /* ─── Summary stats ─── */
  const totalCount = services.length;
  const activeCount = services.filter(s => s.status === 'active').length;
  const pausedCount = services.filter(s => s.status === 'inactive').length;
  const totalBookings = services.reduce((sum, s) => sum + (s.totalBookings || 0), 0);

  /* ─── Categories in data ─── */
  const categories = [
    { value: 'all', label: 'All Categories' },
    ...Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => ({ value: key, label: cfg.label }))
  ];

  /* ═══════════════════════════════════════
     RENDER
     ═══════════════════════════════════════ */

  if (loading) return (
    <div className="ps-page">
      <Shimmer className="ps-skel-header" />
      <Shimmer className="ps-skel-bar" />
      <GridSkeleton />
    </div>
  );

  return (
    <div className="ps-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirmModal && (
        <ConfirmModal
          isOpen
          title={confirmModal.title}
          description={confirmModal.description}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          icon={confirmModal.icon}
          iconColor={confirmModal.iconColor}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* ═══════ PAGE HEADER ═══════ */}
      <header className="ps-header ps-section">
        <div className="ps-header-left">
          <h1 className="ps-title">My Services</h1>
          <p className="ps-subtitle">Manage and grow your service listings</p>
        </div>
        <Link to="/provider/services/new" className="ps-add-btn">
          <span className="ps-add-shimmer" />
          <Plus style={{ width: 16, height: 16 }} />
          Add New Service
        </Link>
      </header>

      {/* Summary chips */}
      <div className="ps-section ps-summary-chips">
        <span className="ps-chip">
          <Package style={{ width: 14, height: 14, color: '#60A5FA' }} />
          <strong>{totalCount}</strong> Total
        </span>
        <span className="ps-chip">
          <span className="ps-chip-dot" style={{ background: '#10B981' }} />
          <strong>{activeCount}</strong> Active
        </span>
        <span className="ps-chip">
          <span className="ps-chip-dot" style={{ background: '#FBBF24' }} />
          <strong>{pausedCount}</strong> Paused
        </span>
        <span className="ps-chip">
          <CalendarDays style={{ width: 14, height: 14, color: '#8B5CF6' }} />
          <strong>{totalBookings}</strong> Bookings
        </span>
      </div>

      {/* ═══════ FILTER BAR ═══════ */}
      <div className="ps-section ps-filter-bar">
        <div className="ps-search-wrap">
          <Search style={{ width: 16, height: 16 }} className="ps-search-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, category, description..."
            className="ps-search-input"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="ps-search-clear">
              <X style={{ width: 14, height: 14 }} />
            </button>
          )}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="ps-select"
        >
          {categories.map(cat => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>

        <div className="ps-status-pills">
          {[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Paused' },
          ].map(s => (
            <button
              key={s.value}
              className={`ps-status-pill ${statusFilter === s.value ? 'ps-pill-active' : ''}`}
              onClick={() => setStatusFilter(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="ps-view-toggle">
          <button
            className={`ps-view-btn ${viewMode === 'grid' ? 'ps-view-active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid View"
          >
            <Grid3X3 style={{ width: 16, height: 16 }} />
          </button>
          <button
            className={`ps-view-btn ${viewMode === 'list' ? 'ps-view-active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <List style={{ width: 16, height: 16 }} />
          </button>
        </div>
      </div>

      {/* Results count */}
      <p className="ps-results-count ps-section">
        Showing {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
        {(searchTerm || statusFilter !== 'all' || categoryFilter !== 'all') && ' (filtered)'}
      </p>

      {/* ═══════ ERROR ═══════ */}
      {error && (
        <div className="ps-section ps-error-banner">
          <AlertCircle style={{ width: 16, height: 16 }} />
          <span>{error}</span>
          <button onClick={fetchServices} className="ps-error-retry">Retry</button>
        </div>
      )}

      {/* ═══════ EMPTY STATE ═══════ */}
      {filteredServices.length === 0 && !error && (
        <div className="ps-section ps-empty">
          <div className="ps-empty-illust">
            <Briefcase style={{ width: 56, height: 56, color: '#3a3f4e' }} />
          </div>
          {services.length === 0 ? (
            <>
              <h3 className="ps-empty-title">You haven't listed any services yet</h3>
              <p className="ps-empty-sub">Start by adding your first service — it takes less than 5 minutes</p>
              <Link to="/provider/services/new" className="ps-add-btn ps-add-btn-lg">
                <span className="ps-add-shimmer" />
                <Plus style={{ width: 18, height: 18 }} />
                Create Your First Service
              </Link>
              <div className="ps-empty-features">
                <span className="ps-feature-chip"><CheckCircle style={{ width: 14, height: 14, color: '#10B981' }} /> Free to list</span>
                <span className="ps-feature-chip"><ArrowUpRight style={{ width: 14, height: 14, color: '#3B82F6' }} /> Reach 1000+ customers</span>
                <span className="ps-feature-chip"><Star style={{ width: 14, height: 14, color: '#FBBF24' }} /> Set your own price</span>
              </div>
            </>
          ) : (
            <>
              <h3 className="ps-empty-title">No services match your filters</h3>
              <p className="ps-empty-sub">Try adjusting your search or filter criteria</p>
              <button className="ps-clear-filters" onClick={() => { setSearchTerm(''); setStatusFilter('all'); setCategoryFilter('all'); }}>
                Clear All Filters
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══════ GRID VIEW ═══════ */}
      {filteredServices.length > 0 && viewMode === 'grid' && (
        <div className="ps-grid">
          {filteredServices.map((svc, idx) => {
            const cat = getCatCfg(svc.category);
            const sc = getStatusCfg(svc.status);
            const hasImage = svc.images?.[0]?.url;
            return (
              <div
                key={svc._id}
                className="ps-card ps-section"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Status ribbon */}
                <div className="ps-card-ribbon" style={{ background: sc.color }} />

                {/* Cover */}
                <div className="ps-card-cover">
                  {hasImage ? (
                    <img
                      src={svc.images[0].url}
                      alt={svc.title}
                      className="ps-card-img"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div
                    className="ps-card-gradient"
                    style={{ background: getGradient(svc.title), display: hasImage ? 'none' : 'flex' }}
                  >
                    <span className="ps-card-emoji">{cat.emoji}</span>
                  </div>

                  {/* Category badge */}
                  <div className="ps-cat-badge" style={{ background: cat.bg, borderColor: cat.border, color: cat.color }}>
                    <span className="ps-cat-dot" style={{ background: cat.color }} />
                    {cat.label}
                  </div>

                  {/* Kebab menu */}
                  <div className="ps-kebab-wrap" ref={openMenu === svc._id ? menuRef : null}>
                    <button className="ps-kebab-btn" onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === svc._id ? null : svc._id); }}>
                      <MoreVertical style={{ width: 16, height: 16 }} />
                    </button>
                    {openMenu === svc._id && (
                      <div className="ps-kebab-menu">
                        <button onClick={() => { setOpenMenu(null); navigate(`/provider/services/${svc._id}/edit`); }}>
                          <Edit3 style={{ width: 14, height: 14 }} /> Edit
                        </button>
                        <button onClick={() => confirmPause(svc)}>
                          {svc.status === 'active'
                            ? <><Pause style={{ width: 14, height: 14 }} /> Pause</>
                            : <><Play style={{ width: 14, height: 14 }} /> Activate</>
                          }
                        </button>
                        <button className="ps-kebab-danger" onClick={() => confirmDelete(svc)}>
                          <Trash2 style={{ width: 14, height: 14 }} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats bar */}
                <div className="ps-card-stats">
                  <span className="ps-mini-stat"><Eye style={{ width: 12, height: 12 }} /> {svc.views || 0}</span>
                  <span className="ps-mini-stat"><CalendarDays style={{ width: 12, height: 12 }} /> {svc.totalBookings || 0}</span>
                  <span className="ps-mini-stat"><Star style={{ width: 12, height: 12, fill: svc.rating?.average > 0 ? '#FBBF24' : 'transparent', color: svc.rating?.average > 0 ? '#FBBF24' : 'currentColor' }} /> {svc.rating?.average?.toFixed(1) || '—'}</span>
                </div>

                {/* Body */}
                <div className="ps-card-body">
                  <div className="ps-card-row-top">
                    <span className="ps-card-cat-pill" style={{ color: '#FF6B4A', background: 'rgba(255,107,74,0.10)', borderColor: 'rgba(255,107,74,0.25)' }}>
                      {cat.label}
                    </span>
                    <span className="ps-card-price">{formatPricing(svc.pricing)}</span>
                  </div>
                  <h3 className="ps-card-title" title={svc.title}>{svc.title}</h3>
                  <p className="ps-card-desc">{svc.description}</p>
                  <div className="ps-card-meta">
                    {svc.duration?.estimated && (
                      <span className="ps-meta-chip"><Clock style={{ width: 11, height: 11 }} /> {svc.duration.estimated} min</span>
                    )}
                    {svc.availability?.days?.length > 0 && (
                      <span className="ps-meta-chip"><CalendarDays style={{ width: 11, height: 11 }} /> {svc.availability.days.length} days</span>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="ps-card-footer">
                  <button
                    className={`ps-toggle-pill ${svc.status === 'active' ? 'ps-toggle-active' : 'ps-toggle-paused'}`}
                    onClick={() => confirmPause(svc)}
                    disabled={togglingId === svc._id}
                  >
                    {svc.status === 'active'
                      ? <><ToggleRight style={{ width: 16, height: 16 }} /> Active</>
                      : <><ToggleLeft style={{ width: 16, height: 16 }} /> Paused</>
                    }
                  </button>
                  <div className="ps-card-btns">
                    <Link to={`/provider/services/${svc._id}/edit`} className="ps-btn-outline">
                      <Edit3 style={{ width: 13, height: 13 }} /> Edit
                    </Link>
                    <Link to="/provider/bookings" className="ps-btn-filled">
                      <Eye style={{ width: 13, height: 13 }} /> Bookings
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ LIST VIEW ═══════ */}
      {filteredServices.length > 0 && viewMode === 'list' && (
        <div className="ps-list">
          {filteredServices.map((svc, idx) => {
            const cat = getCatCfg(svc.category);
            const sc = getStatusCfg(svc.status);
            const hasImage = svc.images?.[0]?.url;
            return (
              <div
                key={svc._id}
                className={`ps-list-row ps-section ${idx % 2 === 1 ? 'ps-list-alt' : ''}`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Thumbnail */}
                <div className="ps-list-thumb">
                  {hasImage ? (
                    <img src={svc.images[0].url} alt={svc.title} className="ps-list-thumb-img" />
                  ) : (
                    <div className="ps-list-thumb-grad" style={{ background: getGradient(svc.title) }}>
                      <span>{cat.emoji}</span>
                    </div>
                  )}
                </div>

                {/* Center info */}
                <div className="ps-list-center">
                  <div className="ps-list-title-row">
                    <h4 className="ps-list-title">{svc.title}</h4>
                    <span className="ps-cat-badge-sm" style={{ background: cat.bg, borderColor: cat.border, color: cat.color }}>
                      {cat.label}
                    </span>
                  </div>
                  <p className="ps-list-desc">{svc.description}</p>
                  <div className="ps-list-meta">
                    {svc.duration?.estimated && <span className="ps-meta-chip"><Clock style={{ width: 11, height: 11 }} /> {svc.duration.estimated} min</span>}
                    {svc.availability?.days?.length > 0 && <span className="ps-meta-chip"><CalendarDays style={{ width: 11, height: 11 }} /> {svc.availability.days.length} days</span>}
                  </div>
                </div>

                {/* Right stats & actions */}
                <div className="ps-list-right">
                  <div className="ps-list-stats">
                    <span className="ps-list-stat"><Eye style={{ width: 12, height: 12 }} /> {svc.views || 0}</span>
                    <span className="ps-list-stat"><CalendarDays style={{ width: 12, height: 12 }} /> {svc.totalBookings || 0}</span>
                    <span className="ps-list-stat"><Star style={{ width: 12, height: 12, fill: svc.rating?.average > 0 ? '#FBBF24' : 'transparent', color: svc.rating?.average > 0 ? '#FBBF24' : 'currentColor' }} /> {svc.rating?.average?.toFixed(1) || '—'}</span>
                  </div>
                  <span className="ps-list-price">{formatPricing(svc.pricing)}</span>
                  <button
                    className={`ps-toggle-pill ps-toggle-sm ${svc.status === 'active' ? 'ps-toggle-active' : 'ps-toggle-paused'}`}
                    onClick={() => confirmPause(svc)}
                    disabled={togglingId === svc._id}
                  >
                    {svc.status === 'active' ? 'Active' : 'Paused'}
                  </button>
                  <div className="ps-list-actions">
                    <Link to={`/provider/services/${svc._id}/edit`} className="ps-btn-outline ps-btn-sm">
                      <Edit3 style={{ width: 12, height: 12 }} /> Edit
                    </Link>
                    <Link to="/provider/bookings" className="ps-btn-filled ps-btn-sm">
                      <Eye style={{ width: 12, height: 12 }} /> Bookings
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProviderServices;
