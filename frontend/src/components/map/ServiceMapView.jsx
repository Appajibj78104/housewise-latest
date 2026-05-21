import React, { useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Category configuration
const CATEGORY_CONFIG = {
  cooking:   { emoji: '\u{1F371}', label: 'Cooking',   color: '#f97316' },
  cleaning:  { emoji: '\u{1F9F9}', label: 'Cleaning',  color: '#06b6d4' },
  tailoring: { emoji: '\u2702\uFE0F', label: 'Tailoring', color: '#8b5cf6' },
  tutoring:  { emoji: '\u{1F4DA}', label: 'Tutoring',  color: '#3b82f6' },
  beauty:    { emoji: '\u{1F484}', label: 'Beauty',    color: '#ec4899' },
  gardening: { emoji: '\u{1F331}', label: 'Gardening', color: '#10b981' },
  childcare: { emoji: '\u{1F476}', label: 'Childcare', color: '#a855f7' },
  other:     { emoji: '\u2B50',    label: 'Service',   color: '#ff6b6b' },
};
const getCfg = (cat) => CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.other;
export { getCfg };

// Provider marker icon - teardrop shape anchored to the point
// 3 visual states: normal → hovered (subtle highlight) → selected (active bounce)
const createProviderIcon = (category, isSelected, isHovered) => {
  const c = getCfg(category);
  const size = isSelected ? 52 : isHovered ? 48 : 42;
  const bg   = isSelected ? '#ff6b6b' : c.color;
  const cls  = isSelected
    ? 'smd-marker smd-marker-active'
    : isHovered
      ? 'smd-marker smd-marker-hovered'
      : 'smd-marker';
  const ring = isSelected
    ? '0 0 0 4px rgba(255,107,107,0.3), 0 4px 16px rgba(0,0,0,0.5)'
    : isHovered
      ? `0 0 0 3px ${c.color}33, 0 4px 14px rgba(0,0,0,0.5)`
      : '0 3px 12px rgba(0,0,0,0.4)';
  return L.divIcon({
    html: `<div class="${cls}" style="background:${bg};width:${size}px;height:${size}px;box-shadow:${ring};">${c.emoji}</div>`,
    className: '',
    iconSize:    [size, size],
    iconAnchor:  [size / 2, size],
    popupAnchor: [0, -(size + 4)],
  });
};

// Pulsing "You are here" icon
const userIconSingleton = L.divIcon({
  html: '<div style="position:relative;width:22px;height:22px;"><div style="position:absolute;width:22px;height:22px;background:#10b981;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);z-index:2;"></div><div class="smd-pulse-ring"></div></div>',
  className: '',
  iconSize:    [22, 22],
  iconAnchor:  [11, 11],
  popupAnchor: [0, -16],
});

// Cluster icon factory
const createClusterIcon = (cluster) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 40 : count < 30 ? 48 : 56;
  return L.divIcon({
    html: `<div class="smd-cluster" style="width:${size}px;height:${size}px;"><span>${count}</span></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Auto-fit bounds when providers change
const BoundsUpdater = ({ providers, center }) => {
  const map = useMap();
  const key = useMemo(() => providers.map(p => p._id).join(','), [providers]);
  useEffect(() => {
    const pts = providers
      .filter(p => isFinite(p.address?.coordinates?.latitude) && isFinite(p.address?.coordinates?.longitude))
      .map(p => [p.address.coordinates.latitude, p.address.coordinates.longitude]);
    if (pts.length === 0) return;
    const all = center ? [center, ...pts] : pts;
    try {
      const b = L.latLngBounds(all);
      if (b.isValid()) map.flyToBounds(b, { padding: [40, 40], maxZoom: 15, duration: 0.9 });
    } catch (_) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
};

// Invalidate map size when container resizes (split-layout transitions)
const MapResizeHandler = () => {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: true });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);
  return null;
};

// Fly to provider position when triggered from side-panel card click.
// If the marker is inside a cluster (e.g. same-location providers),
// spiderfy that cluster so the individual marker becomes visible, then open its popup.
const MapController = ({ flyToProviderId, providers, clusterRef, markerRefs }) => {
  const map = useMap();
  const prevId = useRef(null);
  useEffect(() => {
    if (!flyToProviderId || flyToProviderId === prevId.current) return;
    prevId.current = flyToProviderId;
    const provider = providers.find(p => p._id === flyToProviderId);
    if (!provider) return;
    const lat = provider.address?.coordinates?.latitude;
    const lng = provider.address?.coordinates?.longitude;
    if (!isFinite(lat) || !isFinite(lng)) return;

    // Zoom in first
    map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.8 });

    // After the fly animation, check if the marker is clustered and spiderfy
    const tryOpenPopup = () => {
      const clusterGroup = clusterRef?.current;
      const markerRef = markerRefs?.current?.[flyToProviderId];
      if (!markerRef) return;

      if (clusterGroup) {
        // Find the visible parent — if it's a cluster, spiderfy it
        const visibleParent = clusterGroup.getVisibleParent(markerRef);
        if (visibleParent && visibleParent !== markerRef && typeof visibleParent.spiderfy === 'function') {
          visibleParent.spiderfy();
          // After spiderfying, open the popup with a small delay
          setTimeout(() => {
            try { markerRef.openPopup(); } catch (_) {}
          }, 350);
        } else {
          // Marker is already visible (not clustered)
          try { markerRef.openPopup(); } catch (_) {}
        }
      } else {
        try { markerRef.openPopup(); } catch (_) {}
      }
    };

    // Wait for flyTo animation to complete
    setTimeout(tryOpenPopup, 900);
  }, [flyToProviderId, map, providers, clusterRef, markerRefs]);
  return null;
};

// Fallback images
const FALLBACK_FACE    = 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face';
const FALLBACK_SERVICE = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=200&fit=crop&crop=center';

// Popup content - all inline styles to avoid Leaflet white-bg CSS conflicts
const PopupContent = ({ provider }) => {
  const serviceImg  = provider.services?.[0]?.images?.[0]?.url;
  const providerImg = provider.profileImage?.trim() || null;
  const firstSvc    = provider.services?.[0];
  const cfg         = getCfg(provider.primaryCategory);

  return (
    <div style={{ width: 270, fontFamily: 'Inter,system-ui,sans-serif', overflow: 'hidden' }}>
      {/* Service banner with gradient overlay */}
      <div style={{ width: '100%', height: 120, overflow: 'hidden', position: 'relative', background: '#1a1c2e' }}>
        <img
          src={serviceImg || FALLBACK_SERVICE}
          alt="service"
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { if (e.target.src !== FALLBACK_SERVICE) e.target.src = FALLBACK_SERVICE; }}
        />
        {/* Bottom gradient for text readability */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 48, background: 'linear-gradient(transparent, rgba(19,20,31,0.85))' }} />
        {/* Category chip */}
        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: 3 }}>
          <span>{cfg.emoji}</span> {cfg.label}
        </div>
        {/* Distance chip */}
        {provider.distance != null && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>
            {provider.distance < 1 ? `${(provider.distance * 1000).toFixed(0)}m` : `${provider.distance.toFixed(1)} km`}
          </div>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px 12px', background: '#13141f' }}>
        {/* Provider row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <img
            src={providerImg || FALLBACK_FACE}
            alt={provider.name}
            loading="lazy"
            style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ff6b6b', flexShrink: 0 }}
            onError={e => { if (e.target.src !== FALLBACK_FACE) e.target.src = FALLBACK_FACE; }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#f1f3f7', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {provider.name}
            </div>
            {provider.bio && (
              <div style={{ fontSize: 10, color: '#666d85', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{provider.bio}</div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, fontSize: 11 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#1e2035', padding: '3px 8px', borderRadius: 20 }}>
            <span style={{ color: '#fbbf24' }}>{'\u2605'}</span>
            <span style={{ fontWeight: 600, color: '#f1f3f7' }}>{provider.rating?.average?.toFixed(1) || '0.0'}</span>
            {provider.rating?.count > 0 && <span style={{ color: '#555e76' }}>({provider.rating.count})</span>}
          </div>
          {provider.distance != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#8b95b0' }}>
              <span>{'\uD83D\uDCCD'}</span>
              <span>{provider.distance < 1 ? `${(provider.distance * 1000).toFixed(0)}m away` : `${provider.distance.toFixed(1)} km away`}</span>
            </div>
          )}
        </div>

        {/* Pricing */}
        {firstSvc?.pricing?.amount && (
          <div style={{ fontSize: 11, color: '#8b95b0', marginBottom: 10 }}>
            From <span style={{ color: '#f1f3f7', fontWeight: 600 }}>{'\u20B9'}{firstSvc.pricing.amount}</span>
            {firstSvc.pricing.type !== 'fixed' && <span style={{ color: '#555e76' }}> ({firstSvc.pricing.type})</span>}
          </div>
        )}

        {/* CTA */}
        {firstSvc?._id ? (
          <a href={`/customer/services/${firstSvc._id}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', background: '#ff6b6b', color: '#fff', borderRadius: 10, fontSize: 12, fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s, transform 0.1s', letterSpacing: 0.2 }}
            onMouseOver={e => { e.currentTarget.style.background = '#ff5252'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseOut={e => { e.currentTarget.style.background = '#ff6b6b'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            View Service {'\u2192'}
          </a>
        ) : (
          <div style={{ textAlign: 'center', padding: '8px 14px', background: '#1e2035', color: '#555e76', borderRadius: 10, fontSize: 12 }}>No services listed</div>
        )}
      </div>
    </div>
  );
};

// Provider marker - memoized 
// isHovered = card hovered in side panel (subtle highlight, NO popup)
// isSelected = card/marker clicked (active, popup auto-opens)
const ProviderMarker = memo(({ provider, isSelected, isHovered, onSelect, markerRefs }) => {
  const markerRef = useRef(null);
  const lat = provider.address?.coordinates?.latitude;
  const lng = provider.address?.coordinates?.longitude;

  // Register/unregister the Leaflet marker instance in the shared ref map
  // so MapController can access it for spiderfying + popup opening
  const setRef = useCallback((el) => {
    markerRef.current = el;
    if (markerRefs?.current) {
      if (el) {
        markerRefs.current[provider._id] = el;
      } else {
        delete markerRefs.current[provider._id];
      }
    }
  }, [markerRefs, provider._id]);

  // Bring hovered marker to front (high z-index) without opening popup
  useEffect(() => {
    if (isHovered && markerRef.current) {
      markerRef.current.setZIndexOffset(5000);
    } else if (markerRef.current) {
      markerRef.current.setZIndexOffset(isSelected ? 2000 : 0);
    }
  }, [isHovered, isSelected]);

  if (!isFinite(lat) || !isFinite(lng)) return null;
  return (
    <Marker
      ref={setRef}
      position={[lat, lng]}
      icon={createProviderIcon(provider.primaryCategory, isSelected, isHovered)}
      eventHandlers={{ click: () => onSelect(provider._id) }}
    >
      <Popup maxWidth={290} className="smd-popup" closeButton={true}>
        <PopupContent provider={provider} />
      </Popup>
    </Marker>
  );
}, (prev, next) =>
  prev.provider._id === next.provider._id &&
  prev.isSelected === next.isSelected &&
  prev.isHovered === next.isHovered &&
  prev.markerRefs === next.markerRefs
);

// Main component
const ServiceMapView = React.memo(({
  providers        = [],
  center,
  zoom             = 12,
  selectedCategory,
  searchScope      = 'radius',
  radius           = 10,
  userLocationInfo = null,
  className        = '',
  onProviderSelect,
  highlightedId    = null,
  hoveredId        = null,
  flyToProviderId  = null,
}) => {
  const clusterRef  = useRef(null);
  const markerRefs  = useRef({});

  const handleSelect = useCallback((id) => {
    if (onProviderSelect) onProviderSelect(id);
  }, [onProviderSelect]);

  const validCenter = useMemo(
    () => Array.isArray(center) && center.length === 2 && isFinite(center[0]) && isFinite(center[1]) ? center : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center?.[0], center?.[1]]
  );

  const filteredProviders = useMemo(
    () => selectedCategory ? providers.filter(p => p.primaryCategory === selectedCategory) : providers,
    [providers, selectedCategory]
  );

  if (!validCenter) {
    return (
      <div className={`h-full flex items-center justify-center bg-surface-raised rounded-xl border border-surface-border ${className}`}>
        <p className="text-content-muted text-detail">Map unavailable &mdash; no valid location set.</p>
      </div>
    );
  }

  return (
    <div className={`service-map-view h-full ${className}`}>
      <div className="relative rounded-xl overflow-hidden border border-surface-border shadow-lg h-full">
        <MapContainer center={validCenter} zoom={zoom} style={{ height: '100%', width: '100%' }} zoomControl>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapResizeHandler />
          <BoundsUpdater providers={filteredProviders} center={validCenter} />
          <MapController flyToProviderId={flyToProviderId} providers={filteredProviders} clusterRef={clusterRef} markerRefs={markerRefs} />

          {/* Radius circle visualization */}
          {searchScope === 'radius' && radius && (
            <Circle
              center={validCenter}
              radius={radius * 1000}
              pathOptions={{
                color: '#ff6b6b',
                weight: 1.5,
                opacity: 0.4,
                fillColor: '#ff6b6b',
                fillOpacity: 0.06,
                dashArray: '6 4',
              }}
            />
          )}

          {/* User location marker */}
          <Marker position={validCenter} icon={userIconSingleton} zIndexOffset={1000}>
            <Popup maxWidth={200} className="smd-popup">
              <div style={{ padding: '10px 12px', background: '#13141f', fontFamily: 'Inter,system-ui,sans-serif', minWidth: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                  <span style={{ fontWeight: 700, fontSize: 12, color: '#10b981' }}>Your Location</span>
                </div>
                {userLocationInfo?.locationName && (
                  <div style={{ fontSize: 10, color: '#666d85', marginTop: 4, lineHeight: 1.4 }}>{userLocationInfo.locationName}</div>
                )}
              </div>
            </Popup>
          </Marker>

          {/* Provider markers with clustering */}
          <MarkerClusterGroup
            ref={clusterRef}
            chunkedLoading
            maxClusterRadius={50}
            spiderfyOnMaxZoom
            showCoverageOnHover={false}
            iconCreateFunction={createClusterIcon}
            animate
            disableClusteringAtZoom={18}
          >
            {filteredProviders.map(provider => (
              <ProviderMarker
                key={provider._id}
                provider={provider}
                isSelected={highlightedId === provider._id}
                isHovered={hoveredId === provider._id}
                onSelect={handleSelect}
                markerRefs={markerRefs}
              />
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-3 left-3 z-[400] bg-surface/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-surface-border/60 shadow-md">
          <div className="flex items-center gap-4 text-micro text-content-muted">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
              <span>You</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-coral-500" />
              <span>Providers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Cluster</span>
            </div>
          </div>
        </div>

        {/* Empty overlay */}
        {filteredProviders.length === 0 && (
          <div className="absolute inset-0 z-[399] flex items-center justify-center pointer-events-none rounded-xl">
            <div className="text-center bg-surface/80 backdrop-blur-sm px-5 py-4 rounded-xl border border-surface-border">
              <MapPin className="w-7 h-7 text-content-muted mx-auto mb-2" />
              <p className="text-caption text-content-muted">No providers in this area</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default ServiceMapView;
