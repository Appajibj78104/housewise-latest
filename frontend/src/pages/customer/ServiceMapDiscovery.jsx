import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Map as MapIcon, List, Search, MapPin, Star, AlertCircle, RefreshCw,
  ChevronRight, Eye, X, Clock, Sparkles, Heart, Navigation,
  SlidersHorizontal, ChevronDown, CalendarDays
} from 'lucide-react';
import { Link } from 'react-router-dom';
import ServiceMapView, { getCfg } from '../../components/map/ServiceMapView';
import { useAuth } from '../../context/AuthContext';
import api, { customerAPI } from '../../services/api';

/* ─── Category config ─── */
const CATEGORIES = [
  { value: '',          label: 'All',        emoji: '✨' },
  { value: 'cleaning',  label: 'Cleaning',   emoji: '🧹' },
  { value: 'cooking',   label: 'Cooking',    emoji: '👨‍🍳' },
  { value: 'tailoring', label: 'Tailoring',  emoji: '✂️' },
  { value: 'beauty',    label: 'Beauty',     emoji: '💄' },
  { value: 'tutoring',  label: 'Tuition',    emoji: '📚' },
  { value: 'childcare', label: 'Childcare',  emoji: '👶' },
  { value: 'gardening', label: 'Gardening',  emoji: '🌿' },
];

const SORT_OPTIONS = [
  { value: 'nearest',    label: 'Nearest First' },
  { value: 'rating',     label: 'Highest Rated' },
  { value: 'price_low',  label: 'Price: Low → High' },
  { value: 'price_high', label: 'Price: High → Low' },
];

const RADIUS_OPTIONS = [
  { km: 10,  label: '10 km' },
  { km: 25,  label: '25 km' },
  { km: 50,  label: '50 km' },
  { scope: 'city',    label: 'City' },
  { scope: 'state',   label: 'State' },
  { scope: 'country', label: 'All India' },
];

const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg,#FF6B4A 0%,#FF8C5A 100%)',
  'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
  'linear-gradient(135deg,#06b6d4 0%,#22d3ee 100%)',
  'linear-gradient(135deg,#10b981 0%,#34d399 100%)',
  'linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%)',
  'linear-gradient(135deg,#ec4899 0%,#f472b6 100%)',
];

/* ─── Helpers ─── */
const formatPrice = (pricing) => {
  if (!pricing) return '—';
  if (pricing.type === 'negotiable') return 'Negotiable';
  return `₹${Number(pricing.amount).toLocaleString('en-IN')}${pricing.type === 'hourly' ? '/hr' : ''}`;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
};

const formatDistance = (d) => {
  if (d == null) return null;
  return d < 1 ? `${(d * 1000).toFixed(0)}m` : `${d.toFixed(1)} km`;
};

/* ─── Skeleton Card ─── */
const SkeletonCard = ({ i }) => (
  <div className="mv-card mv-skeleton-card" style={{ animationDelay: `${i * 80}ms` }}>
    <div className="mv-card-img">
      <div className="mv-shimmer" style={{ width: '100%', height: '100%' }} />
    </div>
    <div className="mv-card-body">
      <div className="mv-shimmer" style={{ height: 16, width: '60%', borderRadius: 6 }} />
      <div className="mv-shimmer" style={{ height: 14, width: '80%', borderRadius: 6, marginTop: 8 }} />
      <div className="mv-shimmer" style={{ height: 12, width: '40%', borderRadius: 6, marginTop: 8 }} />
      <div className="mv-shimmer" style={{ height: 32, width: '100%', borderRadius: 8, marginTop: 12 }} />
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   SERVICE MAP DISCOVERY PAGE
   ═══════════════════════════════════════════════════════════ */
const ServiceMapDiscovery = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('map');
  const [hasFetched, setHasFetched] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const fetchAbortRef = useRef(null);

  /* Bidirectional sync */
  const [activeProviderId, setActiveProviderId] = useState(null);
  const [hoveredProviderId, setHoveredProviderId] = useState(null);
  const [flyToId, setFlyToId] = useState(null);
  const [previewProvider, setPreviewProvider] = useState(null);
  const cardRefs = useRef({});
  const hoverTimerRef = useRef(null);

  /* Animated provider count */
  const [displayCount, setDisplayCount] = useState(0);
  const countRef = useRef(null);

  useEffect(() => {
    const target = providers.length;
    if (target === displayCount) return;
    const step = Math.max(1, Math.ceil(Math.abs(target - displayCount) / 15));
    countRef.current = setInterval(() => {
      setDisplayCount(prev => {
        const next = prev < target ? Math.min(prev + step, target) : Math.max(prev - step, target);
        if (next === target) clearInterval(countRef.current);
        return next;
      });
    }, 30);
    return () => clearInterval(countRef.current);
  }, [providers.length]);

  /* Map↔Panel handlers */
  const handleMarkerSelect = useCallback((id) => {
    setActiveProviderId(id);
    requestAnimationFrame(() => {
      cardRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const handleCardClick = useCallback((id) => {
    setActiveProviderId(id);
    setFlyToId(id);
  }, []);

  const handleCardHover = useCallback((id) => {
    clearTimeout(hoverTimerRef.current);
    setHoveredProviderId(id);
  }, []);

  const handleCardLeave = useCallback(() => {
    hoverTimerRef.current = setTimeout(() => setHoveredProviderId(null), 80);
  }, []);

  const openPreview = useCallback((provider, e) => {
    if (e) e.stopPropagation();
    setPreviewProvider(provider);
    setActiveProviderId(provider._id);
    setFlyToId(provider._id);
  }, []);

  const closePreview = useCallback(() => setPreviewProvider(null), []);

  const toggleFavorite = useCallback(async (id, e) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    try {
      await customerAPI.toggleFavorite(id);
    } catch (err) {
      // Revert on failure
      setFavorites(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }
  }, []);

  /* Load persisted favorites once */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await customerAPI.getFavorites();
        const list = res?.data?.favorites || res?.favorites || [];
        if (!cancelled) {
          // ServiceMap toggles by provider id, but customer favorites are services. Track service ids; map cards already use provider/service ids interchangeably.
          setFavorites(new Set(list.map((f) => String(f._id || f.id || f))));
        }
      } catch (_) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  /* User location */
  const profileLat = user?.address?.coordinates?.latitude;
  const profileLng = user?.address?.coordinates?.longitude;
  const profileCenter = useMemo(
    () => (profileLat && profileLng) ? [profileLat, profileLng] : null,
    [profileLat, profileLng]
  );
  const searchCenter = profileCenter;

  const userLocationInfo = useMemo(() => profileCenter ? {
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    country: 'India',
    locationName: user?.address?.locationName || user?.address?.formattedAddress || ''
  } : null, [profileCenter, user?.address?.city, user?.address?.state, user?.address?.locationName, user?.address?.formattedAddress]);

  /* Filters */
  const [filters, setFilters] = useState({
    category: '',
    scope: 'radius',
    radius: 10,
    search: '',
    sortBy: 'nearest',
  });
  const [suggestions, setSuggestions] = useState(null);
  const autoTierApplied = useRef(false);

  /* ─── Smart distance analysis ─── */
  // Fallback values for distance analysis (hook removed due to React context issues)
  const smartTiers = [];
  const tiersLoading = false;
  const recommendedRadius = null;

  /* Build merged distance options: smart tiers + geo scopes */
  const distanceOptions = useMemo(() => {
    const options = [];

    if (smartTiers.length > 0) {
      for (const tier of smartTiers) {
        options.push({
          km: tier.radius,
          label: `${tier.label} (${tier.count})`,
          count: tier.count,
          isRecommended: tier.isRecommended,
        });
      }
    } else {
      // Fallback to static options while analysis loads
      options.push(
        { km: 10,  label: '10 km', count: null },
        { km: 25,  label: '25 km', count: null },
        { km: 50,  label: '50 km', count: null },
      );
    }

    // Always append geo-scope options
    options.push(
      { scope: 'city',    label: '📍 City' },
      { scope: 'state',   label: '📍 State' },
      { scope: 'country', label: '📍 All India' },
    );
    return options;
  }, [smartTiers]);

  /* Auto-select recommended tier on first analysis result */
  useEffect(() => {
    if (autoTierApplied.current || !recommendedRadius) return;
    autoTierApplied.current = true;
    setFilters(prev => ({ ...prev, scope: 'radius', radius: recommendedRadius }));
  }, [recommendedRadius]);

  /* Fetch */
  const filterKey = `${filters.scope}|${filters.radius}|${filters.category}`;
  const centerKey = searchCenter ? `${searchCenter[0].toFixed(6)},${searchCenter[1].toFixed(6)}` : '';

  useEffect(() => {
    if (!centerKey && filters.scope === 'radius') return;
    fetchNearbyProviders();
  }, [filterKey, centerKey]);

  const fetchNearbyProviders = async (customFilters) => {
    const f = customFilters ?? filters;
    const center = searchCenter;
    if (!center && f.scope === 'radius') return;

    if (fetchAbortRef.current) fetchAbortRef.current.abort();
    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setLoading(true);
    setError('');
    setSuggestions(null);

    try {
      const params = { scope: f.scope, limit: 50 };
      if (f.scope === 'radius') {
        params.lat = center[0];
        params.lng = center[1];
        params.radiusKm = f.radius;
      } else if (f.scope === 'city' && userLocationInfo?.city) {
        params.city = userLocationInfo.city;
      } else if (f.scope === 'state' && userLocationInfo?.state) {
        params.state = userLocationInfo.state;
      } else if (f.scope === 'country') {
        params.country = userLocationInfo?.country || 'India';
      }
      if (f.category) params.category = f.category;

      const data = await api.get('/services/nearby-providers', { params, signal: controller.signal });

      if (data.success) {
        setProviders(data.data.providers);
        if (data.data.providers.length === 0) suggestBroaderSearch(f);
      } else {
        setError(data.message || 'Failed to fetch providers');
      }
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED' || err.message === 'canceled' || err === 'canceled') return;
      setError('Failed to fetch nearby providers');
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  const suggestBroaderSearch = (f) => {
    const scopes = distanceOptions;
    const curIdx = scopes.findIndex(s =>
      s.scope ? s.scope === f.scope : (f.scope === 'radius' && s.km === f.radius)
    );
    const broaderOptions = scopes.slice(curIdx + 1);
    if (broaderOptions.length > 0) {
      setSuggestions({
        message: 'No providers found in this area.',
        options: broaderOptions.map(opt => ({
          label: opt.label,
          action: () => {
            setFilters(prev => ({
              ...prev,
              scope: opt.scope || 'radius',
              radius: opt.km || prev.radius,
            }));
            setSuggestions(null);
          }
        })),
      });
    }
  };

  const handleFilter = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  /* Filtered + sorted providers */
  const filteredProviders = useMemo(() => {
    let list = providers;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.bio?.toLowerCase().includes(s) ||
        p.primaryCategory?.toLowerCase().includes(s) ||
        p.services?.some(svc => svc.title?.toLowerCase().includes(s))
      );
    }
    /* sort */
    const sorted = [...list];
    switch (filters.sortBy) {
      case 'rating':
        sorted.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
        break;
      case 'price_low':
        sorted.sort((a, b) => (a.services?.[0]?.pricing?.amount || 0) - (b.services?.[0]?.pricing?.amount || 0));
        break;
      case 'price_high':
        sorted.sort((a, b) => (b.services?.[0]?.pricing?.amount || 0) - (a.services?.[0]?.pricing?.amount || 0));
        break;
      default: /* nearest */
        sorted.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
    }
    return sorted;
  }, [providers, filters.search, filters.sortBy]);

  /* ─── Auth loading ─── */
  if (authLoading) {
    return (
      <div className="mv-page mv-center">
        <RefreshCw size={24} className="animate-spin" style={{ color: '#FF6B4A' }} />
      </div>
    );
  }

  /* ─── No location set ─── */
  if (!profileCenter) {
    return (
      <div className="mv-page mv-center">
        <div className="mv-empty">
          <div className="mv-empty-icon"><MapPin size={36} strokeWidth={1.3} /></div>
          <h3>Location Not Set</h3>
          <p>Update your profile to discover nearby service providers.</p>
          <Link to="/customer/profile" className="mv-coral-btn">Update Profile Location</Link>
        </div>
      </div>
    );
  }

  const locationDisplay = userLocationInfo?.locationName
    || [userLocationInfo?.city, userLocationInfo?.state].filter(Boolean).join(', ')
    || 'Your Location';

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return (
    <div className="mv-page">

      {/* ────── TOP HEADER BAR ────── */}
      <header className="mv-top-header">
        <div className="mv-top-left">
          <h1 className="mv-top-title">Discover Nearby Services</h1>
          <div className="mv-location-display">
            <MapPin size={13} />
            <span className="mv-location-text">{locationDisplay}</span>
            <Link to="/customer/profile" className="mv-change-loc">Change</Link>
          </div>
        </div>
        <div className="mv-top-right">
          <button onClick={() => fetchNearbyProviders()} className="mv-icon-pill" title="Refresh" disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="mv-view-toggle">
            <button onClick={() => setViewMode('map')} className={`mv-vt-btn ${viewMode === 'map' ? 'active' : ''}`}>
              <MapIcon size={14} /> Map
            </button>
            <button onClick={() => setViewMode('list')} className={`mv-vt-btn ${viewMode === 'list' ? 'active' : ''}`}>
              <List size={14} /> List
            </button>
          </div>
        </div>
      </header>

      {/* ────── MAIN CONTENT ────── */}
      <div className="mv-body">

        {viewMode === 'map' ? (
          /* ═══════ SPLIT VIEW ═══════ */
          <div className="mv-split">

            {/* ── LEFT: MAP PANEL ── */}
            <div className="mv-map-panel">
              <div className="mv-map-container">
                <ServiceMapView
                  providers={filteredProviders}
                  center={searchCenter}
                  zoom={filters.scope === 'radius' ? 12 : (filters.scope === 'city' ? 10 : filters.scope === 'state' ? 7 : 5)}
                  selectedCategory={filters.category}
                  searchScope={filters.scope}
                  radius={filters.radius}
                  userLocationInfo={userLocationInfo}
                  onProviderSelect={handleMarkerSelect}
                  highlightedId={activeProviderId}
                  hoveredId={hoveredProviderId}
                  flyToProviderId={flyToId}
                />
              </div>

              {/* Floating search over map */}
              <div className="mv-map-search">
                <Search size={15} className="mv-map-search-icon" />
                <input
                  type="text"
                  placeholder="Search area or address..."
                  value={filters.search}
                  onChange={e => handleFilter('search', e.target.value)}
                  className="mv-map-search-input"
                />
                {filters.search && (
                  <button className="mv-map-search-clear" onClick={() => handleFilter('search', '')}>
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Floating radius chips */}
              <div className="mv-radius-chips">
                {distanceOptions.filter(opt => !opt.scope).map((opt, i) => {
                  const isActive = filters.scope === 'radius' && filters.radius === opt.km;
                  return (
                    <button
                      key={i}
                      className={`mv-radius-chip ${isActive ? 'active' : ''} ${opt.isRecommended ? 'recommended' : ''}`}
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        scope: 'radius',
                        radius: opt.km,
                      }))}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                {distanceOptions.filter(opt => opt.scope).map((opt, i) => {
                  const isActive = filters.scope === opt.scope;
                  return (
                    <button
                      key={`scope-${i}`}
                      className={`mv-radius-chip ${isActive ? 'active' : ''}`}
                      onClick={() => setFilters(prev => ({
                        ...prev,
                        scope: opt.scope,
                      }))}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mv-legend">
                <span className="mv-legend-item"><span className="mv-legend-dot" style={{ background: '#10b981' }} /> You</span>
                <span className="mv-legend-item"><span className="mv-legend-dot" style={{ background: '#FF6B4A' }} /> Providers</span>
                <span className="mv-legend-item"><span className="mv-legend-dot" style={{ background: '#6366f1' }} /> Cluster</span>
              </div>
            </div>

            {/* ── RIGHT: PROVIDER LIST PANEL ── */}
            <div className="mv-list-panel">
              {/* Panel header */}
              <div className="mv-panel-header">
                <div className="mv-panel-title-row">
                  <div className="mv-panel-accent" />
                  <h2 className="mv-panel-title">
                    <span className="mv-count-num">{displayCount}</span> Provider{filteredProviders.length !== 1 ? 's' : ''} Nearby
                  </h2>
                </div>

                {/* Category chips */}
                <div className="mv-cat-chips">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      className={`mv-cat-chip ${filters.category === cat.value ? 'active' : ''}`}
                      onClick={() => handleFilter('category', cat.value)}
                    >
                      <span>{cat.emoji}</span> {cat.label}
                    </button>
                  ))}
                </div>

                {/* Sort + Distance scope selector */}
                <div className="mv-sort-row">
                  <div className="mv-select-wrap">
                    <select value={filters.sortBy} onChange={e => handleFilter('sortBy', e.target.value)} className="mv-select">
                      {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <ChevronDown size={13} className="mv-select-chevron" />
                  </div>
                  <div className="mv-select-wrap">
                    <select
                      value={filters.scope === 'radius' ? `km_${filters.radius}` : filters.scope}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.startsWith('km_')) {
                          setFilters(prev => ({ ...prev, scope: 'radius', radius: Number(val.slice(3)) }));
                        } else {
                          setFilters(prev => ({ ...prev, scope: val }));
                        }
                      }}
                      className="mv-select mv-select-distance"
                    >
                      {distanceOptions.map((opt, i) => (
                        <option key={i} value={opt.scope || `km_${opt.km}`}>
                          {opt.scope ? opt.label : `${opt.label} radius`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="mv-select-chevron" />
                  </div>
                </div>
              </div>

              {/* Suggestion banner */}
              {suggestions && (
                <div className="mv-suggestion">
                  <AlertCircle size={14} />
                  <span>{suggestions.message}</span>
                  <div className="mv-suggestion-options">
                    {suggestions.options?.map((opt, i) => (
                      <button key={i} onClick={opt.action} className="mv-suggestion-btn">
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mv-error-banner">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Provider cards */}
              <div className="mv-cards-scroll">
                {loading && providers.length === 0 ? (
                  Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} i={i} />)
                ) : filteredProviders.length === 0 && hasFetched ? (
                  <div className="mv-empty-panel">
                    <div className="mv-empty-icon"><MapPin size={32} strokeWidth={1.3} /></div>
                    <h4>No providers in this area</h4>
                    <p>Try expanding your search radius</p>
                    {suggestions?.options?.length > 0 && (
                      <div className="mv-empty-expand-options">
                        {suggestions.options.map((opt, i) => (
                          <button key={i} className="mv-coral-btn-sm" onClick={opt.action}>{opt.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  filteredProviders.map((provider, idx) => (
                    <ProviderCard
                      key={provider._id}
                      provider={provider}
                      index={idx}
                      isActive={activeProviderId === provider._id}
                      isHovered={hoveredProviderId === provider._id}
                      isFav={favorites.has(provider._id)}
                      onToggleFav={toggleFavorite}
                      onClick={handleCardClick}
                      onHover={handleCardHover}
                      onLeave={handleCardLeave}
                      onPreview={openPreview}
                      cardRef={el => { cardRefs.current[provider._id] = el; }}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ═══════ FULL-WIDTH LIST VIEW ═══════ */
          <div className="mv-fulllist">
            {/* Filters row */}
            <div className="mv-fulllist-filters">
              <div className="mv-map-search" style={{ position: 'relative' }}>
                <Search size={15} className="mv-map-search-icon" />
                <input
                  type="text"
                  placeholder="Search providers, services..."
                  value={filters.search}
                  onChange={e => handleFilter('search', e.target.value)}
                  className="mv-map-search-input"
                />
              </div>
              <div className="mv-cat-chips" style={{ padding: 0 }}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    className={`mv-cat-chip ${filters.category === cat.value ? 'active' : ''}`}
                    onClick={() => handleFilter('category', cat.value)}
                  >
                    <span>{cat.emoji}</span> {cat.label}
                  </button>
                ))}
              </div>
              <div className="mv-select-wrap">
                <select value={filters.sortBy} onChange={e => handleFilter('sortBy', e.target.value)} className="mv-select">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={13} className="mv-select-chevron" />
              </div>
              <div className="mv-select-wrap">
                <select
                  value={filters.scope === 'radius' ? `km_${filters.radius}` : filters.scope}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.startsWith('km_')) {
                      setFilters(prev => ({ ...prev, scope: 'radius', radius: Number(val.slice(3)) }));
                    } else {
                      setFilters(prev => ({ ...prev, scope: val }));
                    }
                  }}
                  className="mv-select mv-select-distance"
                >
                  {distanceOptions.map((opt, i) => (
                    <option key={i} value={opt.scope || `km_${opt.km}`}>
                      {opt.scope ? opt.label : `${opt.label} radius`}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} className="mv-select-chevron" />
              </div>
            </div>

            {/* Grid */}
            {loading && providers.length === 0 ? (
              <div className="mv-fulllist-grid">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} i={i} />)}
              </div>
            ) : filteredProviders.length === 0 && hasFetched ? (
              <div className="mv-empty" style={{ padding: '80px 24px' }}>
                <div className="mv-empty-icon"><MapPin size={40} strokeWidth={1.2} /></div>
                <h3>No providers found</h3>
                <p>Try adjusting your filters or expanding the search area</p>
              </div>
            ) : (
              <div className="mv-fulllist-grid">
                {filteredProviders.map((provider, i) => (
                  <ListViewCard
                    key={provider._id}
                    provider={provider}
                    index={i}
                    isFav={favorites.has(provider._id)}
                    onToggleFav={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ────── DETAIL PREVIEW DRAWER ────── */}
      {previewProvider && (
        <>
          <div className="mv-backdrop" onClick={closePreview} />
          <div className="mv-drawer">
            {/* Drawer header image */}
            <div className="mv-drawer-img">
              {previewProvider.services?.[0]?.images?.[0]?.url ? (
                <img
                  src={previewProvider.services[0].images[0].url}
                  alt="service"
                  onError={e => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="mv-drawer-placeholder" style={{
                  background: PLACEHOLDER_GRADIENTS[previewProvider.name?.charCodeAt(0) % PLACEHOLDER_GRADIENTS.length]
                }}>
                  <span style={{ fontSize: 40 }}>{getCfg(previewProvider.primaryCategory).emoji}</span>
                </div>
              )}
              <div className="mv-drawer-img-overlay" />
              <button onClick={closePreview} className="mv-drawer-close"><X size={16} /></button>
              <span className="mv-drawer-cat-badge">
                {getCfg(previewProvider.primaryCategory).emoji} {getCfg(previewProvider.primaryCategory).label}
              </span>
            </div>

            {/* Drawer body */}
            <div className="mv-drawer-body">
              <div className="mv-drawer-provider-row">
                <div
                  className="mv-avatar-lg"
                  style={{ background: PLACEHOLDER_GRADIENTS[previewProvider.name?.charCodeAt(0) % PLACEHOLDER_GRADIENTS.length] }}
                >
                  {getInitials(previewProvider.name)}
                </div>
                <div className="mv-drawer-provider-info">
                  <h3>{previewProvider.name}</h3>
                  {previewProvider.bio && <p>{previewProvider.bio}</p>}
                </div>
              </div>

              {/* Stats */}
              <div className="mv-drawer-stats">
                <div className="mv-drawer-stat">
                  <Star size={14} className="mv-star-filled" />
                  <span className="mv-stat-value">{previewProvider.rating?.average?.toFixed(1) || '0.0'}</span>
                  {previewProvider.rating?.count > 0 && <span className="mv-stat-label">({previewProvider.rating.count})</span>}
                </div>
                {previewProvider.distance != null && (
                  <div className="mv-drawer-stat">
                    <Navigation size={14} style={{ color: '#FF6B4A' }} />
                    <span className="mv-stat-value">{formatDistance(previewProvider.distance)}</span>
                    <span className="mv-stat-label">away</span>
                  </div>
                )}
              </div>

              {/* Featured service */}
              {previewProvider.services?.[0] && (
                <div className="mv-drawer-service">
                  <div className="mv-drawer-service-label"><Sparkles size={13} /> Featured Service</div>
                  <h4>{previewProvider.services[0].title}</h4>
                  {previewProvider.services[0].description && (
                    <p className="mv-drawer-service-desc">{previewProvider.services[0].description}</p>
                  )}
                  {previewProvider.services[0].pricing?.amount && (
                    <div className="mv-drawer-price">
                      <span>From </span>
                      <strong>{formatPrice(previewProvider.services[0].pricing)}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Drawer footer */}
            <div className="mv-drawer-footer">
              <Link to={`/customer/providers/${previewProvider._id}`} className="mv-drawer-btn-outline">
                <Eye size={14} /> View Profile
              </Link>
              {previewProvider.services?.[0]?._id ? (
                <Link to={`/customer/services/${previewProvider.services[0]._id}`} className="mv-drawer-btn-coral">
                  Book Now <ChevronRight size={14} />
                </Link>
              ) : (
                <span className="mv-drawer-btn-coral mv-disabled">No Services</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   PROVIDER CARD (Split view — right panel)
   ═══════════════════════════════════════════════════════════ */
const ProviderCard = ({ provider, index, isActive, isHovered, isFav, onToggleFav, onClick, onHover, onLeave, onPreview, cardRef }) => {
  const cfg = getCfg(provider.primaryCategory);
  const svcImg = provider.services?.[0]?.images?.[0]?.url;
  const firstSvc = provider.services?.[0];
  const distance = formatDistance(provider.distance);

  return (
    <div
      ref={cardRef}
      className={`mv-card ${isActive ? 'mv-card-active' : ''} ${isHovered ? 'mv-card-hovered' : ''}`}
      style={{ animationDelay: `${index * 45}ms` }}
      onClick={() => onClick(provider._id)}
      onMouseEnter={() => onHover(provider._id)}
      onMouseLeave={onLeave}
    >
      {/* Image */}
      <div className="mv-card-img">
        {svcImg ? (
          <img src={svcImg} alt="service" loading="lazy" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        ) : null}
        <div
          className="mv-card-img-placeholder"
          style={{ background: PLACEHOLDER_GRADIENTS[provider.name?.charCodeAt(0) % PLACEHOLDER_GRADIENTS.length], display: svcImg ? 'none' : 'flex' }}
        >
          <span style={{ fontSize: 28 }}>{cfg.emoji}</span>
        </div>
        <span className="mv-card-cat-badge">{cfg.emoji} {cfg.label}</span>
        <button className={`mv-card-fav ${isFav ? 'active' : ''}`} onClick={e => onToggleFav(provider._id, e)}>
          <Heart size={14} fill={isFav ? '#FF6B4A' : 'none'} />
        </button>
      </div>

      {/* Body */}
      <div className="mv-card-body">
        <div className="mv-card-top-row">
          <div className="mv-card-name-col">
            <h4 className="mv-card-name">
              {provider.name}
              {(provider.isVerified || provider.rating?.count > 3) && <span className="mv-verified">✓</span>}
            </h4>
            {firstSvc && <span className="mv-card-service-title">{firstSvc.title}</span>}
          </div>
          <div className="mv-card-rating">
            <Star size={12} className="mv-star-filled" />
            <span>{provider.rating?.average?.toFixed(1) || '0.0'}</span>
            {provider.rating?.count > 0 && <span className="mv-rating-count">({provider.rating.count})</span>}
          </div>
        </div>

        {/* Distance + Duration + Price */}
        <div className="mv-card-meta">
          {distance && <span className="mv-card-distance"><MapPin size={11} /> {distance} away</span>}
          {firstSvc?.duration?.estimated && <span className="mv-card-duration"><Clock size={11} /> {firstSvc.duration.estimated} min</span>}
          {firstSvc?.pricing && <span className="mv-card-price">{formatPrice(firstSvc.pricing)}</span>}
        </div>

        {/* Buttons */}
        <div className="mv-card-actions">
          <button className="mv-btn-outline-sm" onClick={e => { e.stopPropagation(); onClick(provider._id); }}>
            <MapIcon size={12} /> View on Map
          </button>
          {firstSvc?._id ? (
            <Link to={`/customer/services/${firstSvc._id}`} className="mv-btn-coral-sm" onClick={e => e.stopPropagation()}>
              Book Now
            </Link>
          ) : (
            <button className="mv-btn-coral-sm" onClick={e => { e.stopPropagation(); onPreview(provider, e); }}>
              Quick View
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   LIST VIEW CARD (Full-width grid)
   ═══════════════════════════════════════════════════════════ */
const ListViewCard = ({ provider, index, isFav, onToggleFav }) => {
  const cfg = getCfg(provider.primaryCategory);
  const svcImg = provider.services?.[0]?.images?.[0]?.url;
  const firstSvc = provider.services?.[0];
  const distance = formatDistance(provider.distance);

  return (
    <div className="mv-list-card" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="mv-list-card-img">
        {svcImg ? (
          <img src={svcImg} alt="service" loading="lazy" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
        ) : null}
        <div
          className="mv-card-img-placeholder"
          style={{ background: PLACEHOLDER_GRADIENTS[provider.name?.charCodeAt(0) % PLACEHOLDER_GRADIENTS.length], display: svcImg ? 'none' : 'flex' }}
        >
          <span style={{ fontSize: 32 }}>{cfg.emoji}</span>
        </div>
        <span className="mv-card-cat-badge">{cfg.emoji} {cfg.label}</span>
        <button className={`mv-card-fav ${isFav ? 'active' : ''}`} onClick={e => onToggleFav(provider._id, e)}>
          <Heart size={14} fill={isFav ? '#FF6B4A' : 'none'} />
        </button>
      </div>

      <div className="mv-list-card-body">
        <div className="mv-card-top-row">
          <div className="mv-card-name-col">
            <h4 className="mv-card-name">
              {provider.name}
              {(provider.isVerified || provider.rating?.count > 3) && <span className="mv-verified">✓</span>}
            </h4>
            {firstSvc && <span className="mv-card-service-title">{firstSvc.title}</span>}
          </div>
          <div className="mv-card-rating">
            <Star size={12} className="mv-star-filled" />
            <span>{provider.rating?.average?.toFixed(1) || '0.0'}</span>
          </div>
        </div>

        {firstSvc?.description && <p className="mv-list-card-desc">{firstSvc.description}</p>}

        <div className="mv-card-meta">
          {distance && <span className="mv-card-distance"><MapPin size={11} /> {distance}</span>}
          {firstSvc?.duration?.estimated && <span className="mv-card-duration"><Clock size={11} /> {firstSvc.duration.estimated} min</span>}
        </div>

        <div className="mv-list-card-footer">
          {firstSvc?.pricing && <span className="mv-list-card-price">{formatPrice(firstSvc.pricing)}</span>}
          <div className="mv-list-card-actions">
            <div
              className="mv-avatar-sm"
              style={{ background: PLACEHOLDER_GRADIENTS[provider.name?.charCodeAt(0) % PLACEHOLDER_GRADIENTS.length] }}
            >
              {getInitials(provider.name)}
            </div>
            {firstSvc?._id ? (
              <Link to={`/customer/services/${firstSvc._id}`} className="mv-btn-coral-sm">
                View Details
              </Link>
            ) : (
              <span className="mv-btn-coral-sm mv-disabled">No Services</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceMapDiscovery;
