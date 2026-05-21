import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import EmptyState from '../../components/shared/EmptyState';
import { useAuth } from '../../context/AuthContext';
import {
  Search, MapPin, Star, Clock, Heart, Grid3X3, List, RefreshCw,
  SlidersHorizontal, X, ChevronDown, Eye, Sparkles, AlertCircle
} from 'lucide-react';
import { servicesAPI, customerAPI } from '../../services/api';
import BadgeStrip from '../../components/shared/BadgeStrip';

/* ─── Category config ─── */
const CATEGORIES = [
  { value: '',          label: 'All',          emoji: '✨' },
  { value: 'cleaning',  label: 'Cleaning',     emoji: '🧹' },
  { value: 'cooking',   label: 'Cooking',      emoji: '👨‍🍳' },
  { value: 'tailoring', label: 'Tailoring',    emoji: '✂️' },
  { value: 'beauty',    label: 'Beauty',       emoji: '💄' },
  { value: 'tuition',   label: 'Tuition',      emoji: '📚' },
  { value: 'childcare', label: 'Childcare',    emoji: '👶' },
  { value: 'gardening', label: 'Gardening',    emoji: '🌿' },
  { value: 'other',     label: 'Other',        emoji: '🔧' },
];

const SORT_OPTIONS = [
  { value: 'rating',     label: 'Highest Rated' },
  { value: 'newest',     label: 'Newest First' },
  { value: 'price_low',  label: 'Price: Low → High' },
  { value: 'price_high', label: 'Price: High → Low' },
  { value: 'distance',   label: 'Nearest First' },
];

const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg,#FF6B4A 0%,#FF8C5A 100%)',
  'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
  'linear-gradient(135deg,#06b6d4 0%,#22d3ee 100%)',
  'linear-gradient(135deg,#10b981 0%,#34d399 100%)',
  'linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%)',
  'linear-gradient(135deg,#ec4899 0%,#f472b6 100%)',
  'linear-gradient(135deg,#3b82f6 0%,#60a5fa 100%)',
];

const CATEGORY_EMOJI = Object.fromEntries(CATEGORIES.filter(c => c.value).map(c => [c.value, c.emoji]));

/* ─── helpers ─── */
const formatPrice = (pricing) => {
  if (!pricing) return '—';
  if (pricing.type === 'negotiable') return 'Negotiable';
  return `₹${Number(pricing.amount).toLocaleString('en-IN')}${pricing.type === 'hourly' ? '/hr' : ''}`;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
};

/* ─── Skeleton Card ─── */
const SkeletonCard = ({ i }) => (
  <div className="bs-card bs-skeleton-card" style={{ animationDelay: `${i * 60}ms` }}>
    <div className="bs-card-img-wrap">
      <div className="bs-shimmer" style={{ height: '100%' }} />
    </div>
    <div className="bs-card-body">
      <div className="bs-shimmer" style={{ height: 18, width: '70%', borderRadius: 6 }} />
      <div className="bs-shimmer" style={{ height: 14, width: '100%', borderRadius: 6, marginTop: 8 }} />
      <div className="bs-shimmer" style={{ height: 14, width: '50%', borderRadius: 6, marginTop: 4 }} />
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <div className="bs-shimmer" style={{ height: 28, width: 80, borderRadius: 14 }} />
        <div className="bs-shimmer" style={{ height: 28, width: 80, borderRadius: 14 }} />
      </div>
      <div className="bs-shimmer" style={{ height: 40, width: '100%', borderRadius: 10, marginTop: 16 }} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   BROWSE SERVICES PAGE
   ═══════════════════════════════════════════════════════════ */
const BrowseServices = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState(() => searchParams.get('view') || 'grid');
  const [favorites, setFavorites] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  /* Read initial filter values from URL query params */
  const [filters, setFilters] = useState(() => ({
    search:     searchParams.get('q')        || '',
    category:   searchParams.get('category') || '',
    location:   searchParams.get('location') || '',
    minRating:  searchParams.get('rating')   || '',
    priceRange: searchParams.get('price')    || '',
    sortBy:     searchParams.get('sort')     || 'rating',
  }));
  const [pagination, setPagination] = useState({
    page: Number(searchParams.get('page')) || 1,
    limit: 9, total: 0, pages: 0,
  });

  /* ─── Location-aware distance filtering ─── */
  const profileLat = user?.address?.coordinates?.latitude;
  const profileLng = user?.address?.coordinates?.longitude;
  const hasLocation = !!(profileLat && profileLng);
  const [distanceRadius, setDistanceRadius] = useState(() => {
    const urlRadius = searchParams.get('radius');
    return urlRadius ? Number(urlRadius) : 0; // 0 = no distance filter (show all)
  });

  // Fallback values for distance analysis (hook removed due to React context issues)
  const smartTiers = [];
  const recommendedRadius = null;

  /* Auto-apply recommended radius on first analysis result (only if no explicit filter yet) */
  const autoApplied = useRef(false);
  useEffect(() => {
    if (autoApplied.current || !recommendedRadius || distanceRadius > 0) return;
    // Don't auto-apply if user came from a URL with explicit filters
    if (searchParams.get('radius')) return;
    autoApplied.current = true;
    // Don't auto-restrict — keep showing all services by default
  }, [recommendedRadius]);

  const filterBarRef = useRef(null);
  const chipScrollRef = useRef(null);
  const searchTimer = useRef(null);
  const isInitialMount = useRef(true);
  
  // Simple fallback for abort signal - creates new controller each call
  const getSignal = useCallback(() => new AbortController().signal, []);

  /* ─── Sync filters → URL (skip initial mount to avoid double-fetch) ─── */
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    const params = new URLSearchParams();
    if (filters.search)     params.set('q', filters.search);
    if (filters.category)   params.set('category', filters.category);
    if (filters.location)   params.set('location', filters.location);
    if (filters.minRating)  params.set('rating', filters.minRating);
    if (filters.priceRange) params.set('price', filters.priceRange);
    if (filters.sortBy && filters.sortBy !== 'rating') params.set('sort', filters.sortBy);
    if (viewMode !== 'grid') params.set('view', viewMode);
    if (distanceRadius > 0) params.set('radius', distanceRadius);
    setSearchParams(params, { replace: true });
  }, [filters, viewMode, distanceRadius, setSearchParams]);

  /* ─── Fetch services ─── */
  const fetchServices = useCallback(async (page = 1, append = false) => {
    try {
      append ? setLoadingMore(true) : setLoading(true);
      const signal = getSignal();
      const params = {
        page,
        limit: pagination.limit,
        search: filters.search || undefined,
        category: filters.category || undefined,
        location: filters.location || undefined,
        minRating: filters.minRating || undefined,
        sortBy: filters.sortBy,
        isActive: true,
        isApproved: true,
        _t: Date.now(),
      };
      // Add location-based distance filtering when user has a location and a radius is set
      if (hasLocation && distanceRadius > 0) {
        params.latitude = profileLat;
        params.longitude = profileLng;
        params.radius = distanceRadius;
        if (!params.sortBy || params.sortBy === 'rating') {
          params.sortBy = 'distance'; // default to nearest when filtering by distance
        }
      }
      const res = await servicesAPI.getServices(params, { signal });
      const newServices = res.data.services || [];
      setServices(prev => append ? [...prev, ...newServices] : newServices);
      setPagination(res.data.pagination || { page, limit: 9, total: 0, pages: 0 });
      setError('');
    } catch (err) {
      if (isAbortError(err)) return;
      setError(err.response?.data?.message || 'Failed to load services');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters, pagination.limit, getSignal, hasLocation, profileLat, profileLng, distanceRadius]);

  /* refetch on filter changes (except search which is debounced) */
  useEffect(() => { fetchServices(1); }, [filters.category, filters.sortBy, filters.minRating, filters.priceRange, filters.location, distanceRadius]);

  /* load persisted favorites once */
  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    (async () => {
      try {
        const res = await customerAPI.getFavorites();
        const list = res?.data?.favorites || res?.favorites || [];
        if (!cancelled) {
          setFavorites(new Set(list.map((f) => String(f._id || f.id || f))));
        }
      } catch (_) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  /* debounced search */
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchServices(1), 400);
    return () => clearTimeout(searchTimer.current);
  }, [filters.search]);

  /* sticky filter bar */
  useEffect(() => {
    const handleScroll = () => {
      if (filterBarRef.current) {
        setIsSticky(filterBarRef.current.getBoundingClientRect().top <= 0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /* ─── handlers ─── */
  const handleFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', location: '', minRating: '', priceRange: '', sortBy: 'rating' });
    setDistanceRadius(0);
    setSearchParams({}, { replace: true });
  };

  const toggleFavorite = async (id) => {
    // Optimistic UI: flip immediately, revert on failure
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      await customerAPI.toggleFavorite(id);
    } catch (err) {
      // Revert
      setFavorites(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
      console.error('toggleFavorite error:', err);
    }
  };

  const loadMore = () => {
    const next = pagination.page + 1;
    setPagination(prev => ({ ...prev, page: next }));
    fetchServices(next, true);
  };

  const activeFilterCount = [filters.category, filters.location, filters.minRating, filters.priceRange, distanceRadius > 0 ? 'yes' : '']
    .filter(Boolean).length;

  const activeFilterTags = [];
  if (filters.category) activeFilterTags.push({ key: 'category', label: CATEGORIES.find(c => c.value === filters.category)?.label || filters.category });
  if (filters.location) activeFilterTags.push({ key: 'location', label: filters.location });
  if (filters.minRating) activeFilterTags.push({ key: 'minRating', label: `${filters.minRating}+ Stars` });
  if (filters.priceRange) activeFilterTags.push({ key: 'priceRange', label: `₹${filters.priceRange}` });
  if (distanceRadius > 0) activeFilterTags.push({ key: 'distance', label: `Within ${distanceRadius} km` });

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="bs-page">

      {/* ────── 1. PAGE HEADER ────── */}
      <header className="bs-header">
        <div>
          <h1 className="bs-title">
            Browse Services
            <span className="bs-title-underline" />
          </h1>
          <p className="bs-subtitle">Discover trusted professionals for every home need</p>
        </div>
        <div className="bs-header-actions">
          <button onClick={() => fetchServices(1)} className="bs-icon-pill" title="Refresh" disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="bs-view-toggle">
            <button onClick={() => setViewMode('grid')} className={`bs-view-btn ${viewMode === 'grid' ? 'active' : ''}`}>
              <Grid3X3 size={15} />
            </button>
            <button onClick={() => setViewMode('list')} className={`bs-view-btn ${viewMode === 'list' ? 'active' : ''}`}>
              <List size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ────── 2. SEARCH & FILTER BAR ────── */}
      <div ref={filterBarRef} className={`bs-filter-bar ${isSticky ? 'bs-sticky' : ''}`}>
        {/* Search input */}
        <div className="bs-search-wrap">
          <Search size={16} className="bs-search-icon" />
          <input
            type="text"
            className="bs-search-input"
            placeholder="Search services, providers, categories..."
            value={filters.search}
            onChange={e => handleFilter('search', e.target.value)}
          />
          {filters.search && (
            <button className="bs-search-clear" onClick={() => handleFilter('search', '')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="bs-chips-row" ref={chipScrollRef}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              className={`bs-chip ${filters.category === cat.value ? 'active' : ''}`}
              onClick={() => handleFilter('category', cat.value)}
            >
              <span className="bs-chip-emoji">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort + Filters row */}
        <div className="bs-controls-row">
          <div className="bs-select-wrap">
            <select
              value={filters.sortBy}
              onChange={e => handleFilter('sortBy', e.target.value)}
              className="bs-select"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown size={14} className="bs-select-icon" />
          </div>

          <button
            className={`bs-more-filters-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeFilterCount > 0 && <span className="bs-filter-badge">{activeFilterCount}</span>}
          </button>
        </div>

        {/* Expanded filter drawer */}
        {showFilters && (
          <div className="bs-filter-drawer">
            <div className="bs-filter-grid">
              <div className="bs-filter-field">
                <label>Location</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={filters.location}
                  onChange={e => handleFilter('location', e.target.value)}
                />
              </div>
              <div className="bs-filter-field">
                <label>Min Rating</label>
                <div className="bs-star-toggles">
                  {[4, 3, 2].map(r => (
                    <button
                      key={r}
                      className={`bs-star-btn ${filters.minRating === String(r) ? 'active' : ''}`}
                      onClick={() => handleFilter('minRating', filters.minRating === String(r) ? '' : String(r))}
                    >
                      <Star size={13} /> {r}+
                    </button>
                  ))}
                </div>
              </div>
              <div className="bs-filter-field">
                <label>Price Range</label>
                <div className="bs-price-toggles">
                  {[
                    { v: '0-500', l: 'Under ₹500' },
                    { v: '500-1000', l: '₹500–1K' },
                    { v: '1000-2000', l: '₹1K–2K' },
                    { v: '2000+', l: '₹2K+' },
                  ].map(p => (
                    <button
                      key={p.v}
                      className={`bs-price-btn ${filters.priceRange === p.v ? 'active' : ''}`}
                      onClick={() => handleFilter('priceRange', filters.priceRange === p.v ? '' : p.v)}
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>
              {/* Distance filter — only shown when user has a location */}
              {hasLocation && (
                <div className="bs-filter-field">
                  <label><MapPin size={12} style={{ display: 'inline', verticalAlign: -1 }} /> Distance</label>
                  <div className="bs-distance-chips">
                    <button
                      className={`bs-distance-chip ${distanceRadius === 0 ? 'active' : ''}`}
                      onClick={() => setDistanceRadius(0)}
                    >
                      All
                    </button>
                    {smartTiers.map((tier, i) => (
                      <button
                        key={i}
                        className={`bs-distance-chip ${distanceRadius === tier.radius ? 'active' : ''} ${tier.isRecommended ? 'recommended' : ''}`}
                        onClick={() => setDistanceRadius(tier.radius)}
                      >
                        {tier.label} <span className="bs-distance-count">({tier.count})</span>
                      </button>
                    ))}
                    {smartTiers.length === 0 && [10, 25, 50].map(km => (
                      <button
                        key={km}
                        className={`bs-distance-chip ${distanceRadius === km ? 'active' : ''}`}
                        onClick={() => setDistanceRadius(km)}
                      >
                        {km} km
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="bs-filter-field bs-filter-actions">
                <button className="bs-clear-btn" onClick={clearFilters}>Reset All</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────── 3. RESULTS COUNT + ACTIVE TAGS ────── */}
      <div className="bs-results-bar">
        <span className="bs-results-count">
          {loading ? 'Searching...' : `${pagination.total || services.length} service${(pagination.total || services.length) !== 1 ? 's' : ''} found`}
        </span>
        {activeFilterTags.length > 0 && (
          <div className="bs-active-tags">
            {activeFilterTags.map(t => (
              <span key={t.key} className="bs-tag">
                {t.label}
                <button onClick={() => {
                  if (t.key === 'distance') { setDistanceRadius(0); }
                  else { handleFilter(t.key, ''); }
                }}><X size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ────── ERROR ────── */}
      {error && (
        <div className="bs-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* ────── 4/5. SERVICE CARDS ────── */}
      {loading && services.length === 0 ? (
        <div className={`bs-grid ${viewMode === 'list' ? 'bs-list-mode' : ''}`}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} i={i} />)}
        </div>
      ) : services.length === 0 ? (
        /* ────── 6. EMPTY STATE ────── */
        <EmptyState
          type="search"
          title="No services found"
          description="Try adjusting your filters or search for something else"
          actionText="Reset Filters"
          onAction={clearFilters}
        />
      ) : (
        <>
          <div className={`bs-grid ${viewMode === 'list' ? 'bs-list-mode' : ''}`}>
            {services.map((service, i) => (
              <ServiceCard
                key={service._id}
                service={service}
                index={i}
                viewMode={viewMode}
                isFav={favorites.has(service._id)}
                onToggleFav={() => toggleFavorite(service._id)}
              />
            ))}
          </div>

          {/* ────── 7. LOAD MORE ────── */}
          {pagination.page < pagination.pages && (
            <div className="bs-load-more-wrap">
              <button className="bs-load-more" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <><RefreshCw size={15} className="animate-spin" /> Loading...</>
                ) : (
                  'Load More Services'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   SERVICE CARD COMPONENT
   ═══════════════════════════════════════════════════════════ */
const ServiceCard = ({ service, index, viewMode, isFav, onToggleFav }) => {
  const hasImage = service.images?.[0]?.url;
  const catEmoji = CATEGORY_EMOJI[service.category] || '🔧';
  const gradientIdx = (service.title?.charCodeAt(0) || 0) % PLACEHOLDER_GRADIENTS.length;
  const rating = service.rating?.average || 0;
  const reviewCount = service.rating?.count || 0;
  const providerName = service.provider?.name || 'Provider';
  const city = service.provider?.address?.city || service.location?.city || '';
  const duration = service.duration?.estimated;
  const isVerified = service.provider?.isVerified || service.provider?.feedbackRating?.totalFeedbacks > 3;

  return (
    <div
      className={`bs-card ${viewMode === 'list' ? 'bs-card-list' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image area */}
      <div className="bs-card-img-wrap">
        {hasImage ? (
          <img
            src={service.images[0].url}
            alt={service.title}
            className="bs-card-img"
            loading="lazy"
            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
          />
        ) : null}
        <div
          className="bs-card-placeholder"
          style={{ background: PLACEHOLDER_GRADIENTS[gradientIdx], display: hasImage ? 'none' : 'flex' }}
        >
          <span className="bs-card-placeholder-emoji">{catEmoji}</span>
        </div>
        <div className="bs-card-img-overlay" />

        {/* Category badge */}
        <span className="bs-card-category">{catEmoji} {service.category}</span>

        {/* Favorite */}
        <button
          className={`bs-card-fav ${isFav ? 'active' : ''}`}
          onClick={e => { e.preventDefault(); onToggleFav(); }}
        >
          <Heart size={16} fill={isFav ? '#FF6B4A' : 'none'} />
        </button>
      </div>

      {/* Body */}
      <div className="bs-card-body">
        <h3 className="bs-card-title">{service.title}</h3>
        <p className="bs-card-desc">{service.description}</p>

        {/* Chips row */}
        <div className="bs-card-chips">
          {city && (
            <span className="bs-card-chip"><MapPin size={12} /> {city}</span>
          )}
          {duration && (
            <span className="bs-card-chip"><Clock size={12} /> {duration} min</span>
          )}
        </div>

        {/* Rating */}
        <div className="bs-card-rating">
          <div className="bs-stars">
            {Array.from({ length: 5 }, (_, i) => (
              <Star key={i} size={13} className={i < Math.round(rating) ? 'filled' : ''} />
            ))}
          </div>
          <span className="bs-rating-value">{rating > 0 ? rating.toFixed(1) : '—'}</span>
          <span className="bs-rating-count">({reviewCount})</span>
        </div>

        {/* Provider row */}
        <div className="bs-card-provider">
          <div className="bs-avatar" style={{ background: PLACEHOLDER_GRADIENTS[providerName.charCodeAt(0) % PLACEHOLDER_GRADIENTS.length] }}>
            {getInitials(providerName)}
          </div>
          <span className="bs-provider-name">{providerName}</span>
          {isVerified && <span className="bs-verified" title="Verified provider">✓</span>}
        </div>

        {/* Trust badges */}
        {service.provider?.earnedBadges?.length > 0 && (
          <div className="bs-card-badges">
            <BadgeStrip
              badges={service.provider.earnedBadges.map((b) => b.code || b)}
              compact
              max={3}
            />
          </div>
        )}

        {/* Footer: price + CTA */}
        <div className="bs-card-footer">
          <span className="bs-price">{formatPrice(service.pricing)}</span>
          <Link to={`/customer/services/${service._id}`} className="bs-cta">
            <Eye size={14} /> View Details
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BrowseServices;
