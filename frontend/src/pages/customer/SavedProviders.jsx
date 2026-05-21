import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, Star, MapPin, Phone, ChevronRight, Search,
  RefreshCw, ShieldCheck, Sparkles
} from 'lucide-react';
import { customerAPI } from '../../services/api';
import BadgeStrip from '../../components/shared/BadgeStrip';

const getInitials = (n) => (n || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const GRADS = [
  'linear-gradient(135deg,#FF6B4A,#FF8C5A)',
  'linear-gradient(135deg,#3B82F6,#60A5FA)',
  'linear-gradient(135deg,#8B5CF6,#A78BFA)',
  'linear-gradient(135deg,#10B981,#34D399)',
  'linear-gradient(135deg,#EC4899,#F472B6)',
  'linear-gradient(135deg,#F59E0B,#FBBF24)',
];
const getGrad = (n) => GRADS[(n || '').charCodeAt(0) % GRADS.length];

const SavedProviders = () => {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await customerAPI.getSavedProviders();
      const list = res?.data?.providers || res?.providers || [];
      setProviders(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load saved providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const lower = search.toLowerCase();
    if (!lower) return providers;
    return providers.filter((p) => (
      p.name?.toLowerCase().includes(lower) ||
      p.bio?.toLowerCase().includes(lower) ||
      p.address?.city?.toLowerCase().includes(lower)
    ));
  }, [providers, search]);

  return (
    <div className="sp-page">
      <header className="sp-header">
        <div className="sp-head-left">
          <div className="sp-head-icon">
            <Heart style={{ width: 20, height: 20, fill: '#EC4899' }} />
          </div>
          <div>
            <h1 className="sp-title">Saved Providers</h1>
            <p className="sp-subtitle">Quick access to the providers you've favorited.</p>
          </div>
        </div>
        <div className="sp-head-right">
          <div className="sp-search">
            <Search style={{ width: 14, height: 14 }} />
            <input
              type="text"
              placeholder="Search saved providers"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="sp-refresh" onClick={load} disabled={loading}>
            <RefreshCw style={{ width: 14, height: 14 }} className={loading ? 'sp-spin' : ''} />
          </button>
        </div>
      </header>

      {error && (
        <div className="sp-error">{error}</div>
      )}

      {loading ? (
        <div className="sp-loading">
          <div className="sp-spinner" />
          <span>Loading saved providers…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="sp-empty">
          <Sparkles style={{ width: 48, height: 48, color: '#FF6B4A' }} />
          <h3 className="sp-empty-title">{search ? 'No matches' : 'No saved providers yet'}</h3>
          <p className="sp-empty-sub">
            {search
              ? 'Try a different search term.'
              : 'Tap the heart on any service to bookmark its provider — they will appear here for fast rebooking.'}
          </p>
          {!search && (
            <Link to="/customer/services" className="sp-empty-cta">
              Browse services <ChevronRight style={{ width: 14, height: 14 }} />
            </Link>
          )}
        </div>
      ) : (
        <div className="sp-grid">
          {filtered.map((p) => {
            const rating = p.rating?.average || 0;
            const reviews = p.rating?.count || 0;
            const city = p.address?.city;
            return (
              <div key={p._id} className="sp-card">
                <div className="sp-card-top">
                  {p.profileImage ? (
                    <img src={p.profileImage} alt={p.name} className="sp-avatar-img" />
                  ) : (
                    <div className="sp-avatar" style={{ background: getGrad(p.name) }}>
                      {getInitials(p.name)}
                    </div>
                  )}
                  <div className="sp-meta">
                    <div className="sp-name-row">
                      <span className="sp-name">{p.name || 'Provider'}</span>
                      {p.isVerified && (
                        <span className="sp-verified" title="Verified provider">
                          <ShieldCheck style={{ width: 14, height: 14 }} />
                        </span>
                      )}
                    </div>
                    {rating > 0 && (
                      <div className="sp-rating">
                        <Star style={{ width: 13, height: 13, fill: '#FBBF24', color: '#FBBF24' }} />
                        <span className="sp-rating-num">{rating.toFixed(1)}</span>
                        <span className="sp-rating-count">({reviews})</span>
                      </div>
                    )}
                    {city && (
                      <div className="sp-loc">
                        <MapPin style={{ width: 12, height: 12 }} /> {city}
                      </div>
                    )}
                  </div>
                </div>

                {p.bio && <p className="sp-bio">{p.bio}</p>}

                {p.earnedBadges?.length > 0 && (
                  <div className="sp-badges">
                    <BadgeStrip badges={p.earnedBadges.map((b) => b.code || b)} compact max={4} />
                  </div>
                )}

                {p.savedServices?.length > 0 && (
                  <div className="sp-services">
                    <span className="sp-services-label">Saved services</span>
                    <div className="sp-services-list">
                      {p.savedServices.slice(0, 3).map((s) => (
                        <Link
                          key={s._id}
                          to={`/customer/services/${s._id}`}
                          className="sp-service-chip"
                          title={s.title}
                        >
                          {s.title}
                        </Link>
                      ))}
                      {p.savedServices.length > 3 && (
                        <span className="sp-service-chip sp-service-more">
                          +{p.savedServices.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="sp-actions">
                  <Link
                    to={`/customer/providers/${p._id}`}
                    className="sp-btn sp-btn-primary"
                  >
                    View profile <ChevronRight style={{ width: 14, height: 14 }} />
                  </Link>
                  {p.phone && (
                    <a href={`tel:${p.phone}`} className="sp-btn sp-btn-ghost">
                      <Phone style={{ width: 13, height: 13 }} /> Call
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SavedProviders;
