import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Navigation, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const coralIcon = L.divIcon({
  html: `<div style="background:#ff6b6b;border:3px solid white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4);">
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
  </div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Sub-component: pans map when position changes
const MapController = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, 14, { animate: true });
    }
  }, [position, map]);
  return null;
};

/**
 * LocationPicker — compact inline component for registration forms.
 *
 * Props:
 *   onLocationSelect(data) — called when location is confirmed
 *     data = { latitude, longitude, locationName, city, state, country }
 *   initialValue — optional pre-filled location name string
 *   error — external error message to display
 */
const LocationPicker = ({ onLocationSelect, initialValue = '', error: externalError }) => {
  const [query, setQuery]           = useState(initialValue);
  const [searching, setSearching]   = useState(false);
  const [results, setResults]       = useState([]);  // suggestion list
  const [searchError, setSearchError] = useState('');
  const [selected, setSelected]     = useState(null); // { lat, lon, display_name, address }
  const [showMap, setShowMap]       = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const inputRef = useRef();

  // Notify parent whenever selected changes
  useEffect(() => {
    if (selected && onLocationSelect) {
      onLocationSelect({
        latitude: parseFloat(selected.lat),
        longitude: parseFloat(selected.lon),
        locationName: selected.display_name,
        city: selected.address?.city || selected.address?.town || selected.address?.village || selected.address?.county || '',
        state: selected.address?.state || '',
        country: selected.address?.country || 'India',
      });
    }
  }, [selected, onLocationSelect]);

  const searchLocation = useCallback(async (searchQuery) => {
    const q = (searchQuery || query).trim();
    if (!q) {
      setSearchError('Please enter a location to search.');
      return;
    }

    setSearching(true);
    setSearchError('');
    setResults([]);

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&addressdetails=1&accept-language=en`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' }
      });

      if (!res.ok) throw new Error('Network error');

      const data = await res.json();

      if (!data || data.length === 0) {
        setSearchError('No location found. Please check the spelling or try a nearby city name.');
        setSelected(null);
        onLocationSelect && onLocationSelect(null);
        return;
      }

      if (data.length === 1) {
        // Auto-select if only one result
        confirmSelection(data[0]);
      } else {
        setResults(data);
      }
    } catch (err) {
      console.error('Nominatim error:', err);
      setSearchError('Failed to search location. Please check your connection and try again.');
    } finally {
      setSearching(false);
    }
  }, [query]);

  const confirmSelection = (item) => {
    setSelected(item);
    setQuery(item.display_name);
    setResults([]);
    setShowMap(true);
    setSearchError('');
  };

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=en`
      );
      const data = await res.json();
      if (data && data.display_name) {
        const synthetic = { lat: String(lat), lon: String(lon), display_name: data.display_name, address: data.address };
        confirmSelection(synthetic);
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setSearchError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setSearchError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        setGpsLoading(false);
      },
      () => {
        setSearchError('Unable to get your current location. Please search manually.');
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
    setShowMap(false);
    setSearchError('');
    onLocationSelect && onLocationSelect(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchLocation();
    }
  };

  const displayError = searchError || externalError;

  return (
    <div className="space-y-3">
      {/* Search row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (selected) {
                // User modified — clear selection
                setSelected(null);
                setShowMap(false);
                onLocationSelect && onLocationSelect(null);
              }
              setSearchError('');
              setResults([]);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search city, area or address…"
            className={`input pl-10 pr-3 ${displayError && !selected ? 'border-danger' : selected ? 'border-success' : ''}`}
            autoComplete="off"
          />
          {selected && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-content-muted hover:text-danger-text transition-colors text-lg leading-none"
              title="Clear location"
            >
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => searchLocation()}
          disabled={searching || gpsLoading}
          className="btn btn-primary px-4 flex items-center gap-1.5 shrink-0"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Search
        </button>

        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={searching || gpsLoading}
          title="Use my current location"
          className="btn btn-secondary px-3 shrink-0"
        >
          {gpsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Suggestion dropdown */}
      {results.length > 1 && (
        <div className="rounded-xl border border-surface-border bg-surface-overlay shadow-elevated overflow-hidden">
          <p className="px-3 py-2 text-caption text-content-muted border-b border-surface-border">
            Select the best match:
          </p>
          <ul className="max-h-48 overflow-y-auto">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => confirmSelection(r)}
                  className="w-full text-left px-3 py-2.5 text-detail text-content-secondary hover:bg-surface-hover hover:text-content-primary transition-colors flex items-start gap-2"
                >
                  <MapPin className="h-3.5 w-3.5 text-coral-400 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{r.display_name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confirmation pill when selected */}
      {selected && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-success-muted border border-success rounded-xl">
          <CheckCircle className="h-4 w-4 text-success-text mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-caption font-medium text-success-text">Location confirmed</p>
            <p className="text-micro text-success-text/80 truncate">{selected.display_name}</p>
            {selected.lat && (
              <p className="text-micro text-success-text/60 mt-0.5">
                {parseFloat(selected.lat).toFixed(5)}, {parseFloat(selected.lon).toFixed(5)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {displayError && !selected && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-danger-muted border border-danger rounded-xl">
          <AlertCircle className="h-4 w-4 text-danger-text shrink-0" />
          <p className="text-caption text-danger-text">{displayError}</p>
        </div>
      )}

      {/* Map preview */}
      {showMap && selected && (
        <div className="rounded-xl overflow-hidden border border-surface-border shadow-card" style={{ height: '220px' }}>
          <MapContainer
            center={[parseFloat(selected.lat), parseFloat(selected.lon)]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            scrollWheelZoom={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController position={[parseFloat(selected.lat), parseFloat(selected.lon)]} />
            <Marker
              position={[parseFloat(selected.lat), parseFloat(selected.lon)]}
              icon={coralIcon}
            />
          </MapContainer>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
