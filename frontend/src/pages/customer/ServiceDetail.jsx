import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star, MapPin, Clock, Calendar, Phone, MessageCircle, Heart,
  Share2, ArrowLeft, CheckCircle, AlertCircle, ChevronDown,
  ChevronUp, Shield, Zap, RotateCcw, Eye, ThumbsUp, Lock,
  Sparkles, Package, Tag, Users, Award, ChevronLeft, ChevronRight,
  Info, DollarSign, Home, Navigation, Image as ImageIcon
} from 'lucide-react';
import { servicesAPI, customerAPI, gamificationAPI } from '../../services/api';
import { CATEGORIES } from '../../constants/categories';
import BookingModal from '../../components/customer/BookingModal';
import SocialShare from '../../components/shared/SocialShare';

/* ─── Helpers ─── */
const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const PLACEHOLDER_GRADIENTS = [
  'linear-gradient(135deg,#FF6B4A 0%,#FF8C5A 100%)',
  'linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%)',
  'linear-gradient(135deg,#06b6d4 0%,#22d3ee 100%)',
  'linear-gradient(135deg,#10b981 0%,#34d399 100%)',
  'linear-gradient(135deg,#f59e0b 0%,#fbbf24 100%)',
  'linear-gradient(135deg,#ec4899 0%,#f472b6 100%)',
];

const formatPrice = (pricing) => {
  if (!pricing) return '—';
  if (pricing.type === 'negotiable') return 'Negotiable';
  return `₹${Number(pricing.amount).toLocaleString('en-IN')}`;
};
const priceSuffix = (p) => {
  if (!p) return '';
  if (p.type === 'hourly') return '/hr';
  if (p.type === 'fixed') return '';
  return '';
};
const getInitials = (n) => n ? n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
const gradientFor = (s) => PLACEHOLDER_GRADIENTS[(s?.charCodeAt(0) || 0) % PLACEHOLDER_GRADIENTS.length];
const relativeDate = (d) => {
  if (!d) return '';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};
const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

/* ─── Skeleton ─── */
const Skeleton = () => (
  <div className="sd-page">
    <div className="sd-hero-skeleton">
      <div className="sd-shimmer" style={{ width: '100%', height: '100%', borderRadius: 0 }} />
    </div>
    <div className="sd-body-wrap">
      <div className="sd-layout">
        <div className="sd-left">
          <div className="sd-shimmer" style={{ width: '70%', height: 32, borderRadius: 8 }} />
          <div className="sd-shimmer" style={{ width: '40%', height: 18, borderRadius: 8, marginTop: 12 }} />
          <div className="sd-shimmer" style={{ width: '100%', height: 100, borderRadius: 12, marginTop: 24 }} />
          <div className="sd-shimmer" style={{ width: '100%', height: 180, borderRadius: 12, marginTop: 20 }} />
        </div>
        <div className="sd-right">
          <div className="sd-shimmer" style={{ width: '100%', height: 350, borderRadius: 16 }} />
        </div>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════
   SERVICE DETAIL PAGE — Premium Redesign
   ═══════════════════════════════════════════════════════════ */
const ServiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [relatedServices, setRelatedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
  const [providerBadges, setProviderBadges] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [providerServices, setProviderServices] = useState([]);
  const [providerExpanded, setProviderExpanded] = useState(false);

  const reviewsRef = useRef(null);
  const overviewRef = useRef(null);
  const detailsRef = useRef(null);
  const providerRef = useRef(null);
  const getSignal = useCallback(() => new AbortController().signal, []);

  const catConfig = useMemo(() => {
    if (!service) return CATEGORIES.other || { label: 'Other', emoji: '🔧', color: '#6B7280' };
    return CATEGORIES[service.category] || CATEGORIES.other || { label: 'Other', emoji: '🔧', color: '#6B7280' };
  }, [service]);

  /* ─── Fetch data ─── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const signal = getSignal();
        const res = await servicesAPI.getServiceById(id, { signal });
        const svc = res.data.service;
        setService(svc);
        if (res.data.relatedServices) setRelatedServices(res.data.relatedServices);

        if (svc.provider) {
          try {
            const pRes = await customerAPI.getProviderDetails(svc.provider._id || svc.provider, { signal });
            setProvider(pRes.data.provider);
            setReviews(pRes.data.reviews || []);
            setProviderServices((pRes.data.services || []).filter(s => s._id !== id));
            const pid = pRes.data.provider?._id || svc.provider._id || svc.provider;
            gamificationAPI.getBadges(pid).then(bRes => {
              if (bRes?.success) {
                const goldPlus = (bRes.data?.badges || []).filter(b => b.tier === 'gold' || b.tier === 'platinum');
                setProviderBadges(goldPlus.slice(0, 4));
              }
            }).catch(() => {});
          } catch (innerErr) {
            if (isAbortError(innerErr)) return;
            setProvider(svc.provider);
          }
        }
      } catch (err) {
        if (isAbortError(err)) return;
        setError(err.response?.data?.message || 'Failed to load service details');
      } finally { setLoading(false); }
    };
    fetchData();
  }, [id, getSignal]);

  /* ─── Scroll spy for nav tabs ─── */
  useEffect(() => {
    const refs = [
      { id: 'overview', ref: overviewRef },
      { id: 'details', ref: detailsRef },
      { id: 'provider', ref: providerRef },
      { id: 'reviews', ref: reviewsRef },
    ];
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const match = refs.find(r => r.ref.current === entry.target);
          if (match) setActiveTab(match.id);
        }
      });
    }, { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 });

    refs.forEach(r => { if (r.ref.current) observer.observe(r.ref.current); });
    return () => observer.disconnect();
  }, [service]);

  const scrollTo = useCallback((ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  /* ─── Loading / Error ─── */
  if (loading) return <Skeleton />;
  if (error || !service) {
    return (
      <div className="sd-page sd-center">
        <div className="sd-empty">
          <div className="sd-empty-icon"><AlertCircle size={40} strokeWidth={1.2} /></div>
          <h3>Service not found</h3>
          <p>{error || "The service you're looking for doesn't exist or was removed."}</p>
          <button className="sd-coral-btn" onClick={() => navigate('/customer/services')}>Browse Services</button>
        </div>
      </div>
    );
  }

  const rating = service.rating?.average || 0;
  const reviewCount = service.rating?.count || 0;
  const images = service.images?.filter(img => img?.url) || [];
  const hasImages = images.length > 0;
  const providerName = provider?.name || service.provider?.name || 'Provider';
  const providerRating = provider?.feedbackRating?.averageRating || provider?.rating?.average || 0;
  const providerReviewCount = provider?.feedbackRating?.totalFeedbacks || provider?.rating?.count || 0;
  const providerCity = provider?.address?.city || '';
  const providerState = provider?.address?.state || '';
  const availDays = service.availability?.days || [];
  const timeSlots = Array.isArray(service.availability?.timeSlots) ? service.availability.timeSlots : (service.availability?.timeSlots ? [service.availability.timeSlots] : []);
  const visibleReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const enabledAddOns = (service.addOns || []).filter(a => a.enabled);
  const packages = (service.packages || []).filter(p => p.name);
  const tags = service.tags || [];
  const categoryFields = service.categoryFields || {};
  const smartFieldDefs = catConfig?.smartFields || {};

  /* Rating dist */
  const ratingDist = [0, 0, 0, 0, 0];
  reviews.forEach(r => { const b = Math.min(Math.max(Math.round(r.rating || 0), 1), 5); ratingDist[b - 1]++; });
  const maxDist = Math.max(...ratingDist, 1);

  /* Gallery prev/next */
  const galleryPrev = () => setSelectedImage(i => (i === 0 ? images.length - 1 : i - 1));
  const galleryNext = () => setSelectedImage(i => (i === images.length - 1 ? 0 : i + 1));

  return (
    <div className="sd-page">

      {/* ════════ IMMERSIVE HERO ════════ */}
      <div className="sd-hero" style={{ '--cat-color': catConfig.color }}>
        {/* Background */}
        <div className="sd-hero-bg">
          {hasImages ? (
            <img src={images[selectedImage]?.url} alt="" className="sd-hero-bg-img" />
          ) : (
            <div className="sd-hero-bg-gradient" style={{ background: gradientFor(service.title) }} />
          )}
          <div className="sd-hero-overlay" />
        </div>

        {/* Top bar */}
        <div className="sd-hero-topbar">
          <button className="sd-hero-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} /> <span>Back</span>
          </button>
          <div className="sd-hero-actions">
            <button className={`sd-hero-action ${isFav ? 'sd-fav-on' : ''}`} onClick={() => setIsFav(v => !v)}>
              <Heart size={18} fill={isFav ? '#FF6B4A' : 'none'} />
            </button>
            <SocialShare title={service.title} description={service.description || ''} url={window.location.href} />
          </div>
        </div>

        {/* Gallery controls */}
        {images.length > 1 && (
          <>
            <button className="sd-hero-arrow sd-hero-arrow-l" onClick={galleryPrev}><ChevronLeft size={22} /></button>
            <button className="sd-hero-arrow sd-hero-arrow-r" onClick={galleryNext}><ChevronRight size={22} /></button>
            <div className="sd-hero-dots">
              {images.map((_, i) => (
                <button key={i} className={`sd-hero-dot ${i === selectedImage ? 'active' : ''}`} onClick={() => setSelectedImage(i)} />
              ))}
            </div>
          </>
        )}

        {/* Hero content */}
        <div className="sd-hero-content">
          <div className="sd-hero-cat" style={{ background: `${catConfig.color}22`, borderColor: `${catConfig.color}55` }}>
            <span>{catConfig.emoji}</span> {service.category}
            {service.subcategory && <span className="sd-hero-subcat">· {service.subcategory}</span>}
          </div>
          <h1 className="sd-hero-title">{service.title}</h1>
          <div className="sd-hero-meta">
            {rating > 0 && (
              <span className="sd-hero-rating">
                <Star size={14} className="sd-star-filled" /> {rating.toFixed(1)}
                <span className="sd-hero-review-count">({reviewCount})</span>
              </span>
            )}
            {providerCity && <span className="sd-hero-loc"><MapPin size={13} /> {providerCity}{providerState ? `, ${providerState}` : ''}</span>}
            {service.duration?.estimated && <span className="sd-hero-dur"><Clock size={13} /> {service.duration.estimated} min</span>}
          </div>
        </div>

        {/* Thumbnails strip */}
        {images.length > 1 && (
          <div className="sd-hero-thumbs">
            {images.slice(0, 6).map((img, i) => (
              <button key={i} className={`sd-hero-thumb ${i === selectedImage ? 'active' : ''}`} onClick={() => setSelectedImage(i)}>
                <img src={img.url} alt="" />
              </button>
            ))}
            {images.length > 6 && <span className="sd-hero-thumb-more">+{images.length - 6}</span>}
          </div>
        )}
      </div>

      {/* Share toast */}
      {shareToast && <div className="sd-toast"><CheckCircle size={14} /> Link copied!</div>}

      {/* ════════ STICKY NAV TABS ════════ */}
      <div className="sd-nav-tabs">
        <div className="sd-nav-inner">
          {[
            { id: 'overview', label: 'Overview', ref: overviewRef },
            { id: 'details', label: 'Details', ref: detailsRef },
            { id: 'provider', label: 'Provider', ref: providerRef },
            { id: 'reviews', label: `Reviews (${reviewCount})`, ref: reviewsRef },
          ].map(tab => (
            <button key={tab.id} className={`sd-nav-tab ${activeTab === tab.id ? 'sd-nav-tab-active' : ''}`}
              style={activeTab === tab.id ? { color: catConfig.color, borderColor: catConfig.color } : {}}
              onClick={() => scrollTo(tab.ref)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ════════ BODY ════════ */}
      <div className="sd-body-wrap">
        <div className="sd-layout">

          {/* ═══ LEFT COLUMN ═══ */}
          <div className="sd-left">

            {/* ── Overview ── */}
            <section className="sd-section sd-fade-up" ref={overviewRef}>
              <h2 className="sd-heading">About This Service</h2>
              <div className={`sd-desc ${descExpanded ? 'sd-desc-open' : ''}`}>
                <p>{service.description}</p>
              </div>
              {service.description?.length > 280 && (
                <button className="sd-read-more" onClick={() => setDescExpanded(v => !v)}>
                  {descExpanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> Read more</>}
                </button>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="sd-tags">
                  <Tag size={13} className="sd-tags-icon" />
                  {tags.map((t, i) => <span key={i} className="sd-tag">{t}</span>)}
                </div>
              )}

              {/* Quick facts grid */}
              <div className="sd-quick-facts">
                <div className="sd-fact">
                  <div className="sd-fact-icon" style={{ background: `${catConfig.color}15`, color: catConfig.color }}><DollarSign size={18} /></div>
                  <div className="sd-fact-text">
                    <span className="sd-fact-label">Pricing</span>
                    <span className="sd-fact-value">{formatPrice(service.pricing)}{priceSuffix(service.pricing)}</span>
                  </div>
                </div>
                <div className="sd-fact">
                  <div className="sd-fact-icon" style={{ background: `${catConfig.color}15`, color: catConfig.color }}><Clock size={18} /></div>
                  <div className="sd-fact-text">
                    <span className="sd-fact-label">Duration</span>
                    <span className="sd-fact-value">{service.duration?.estimated ? `${service.duration.estimated} min` : '—'}</span>
                  </div>
                </div>
                <div className="sd-fact">
                  <div className="sd-fact-icon" style={{ background: `${catConfig.color}15`, color: catConfig.color }}>
                    {service.location?.type === 'home_visit' ? <Navigation size={18} /> : service.location?.type === 'both' ? <RotateCcw size={18} /> : <Home size={18} />}
                  </div>
                  <div className="sd-fact-text">
                    <span className="sd-fact-label">Location</span>
                    <span className="sd-fact-value">
                      {service.location?.type === 'home_visit' ? 'Provider visits you' : service.location?.type === 'both' ? 'Flexible (either)' : 'At provider\'s place'}
                    </span>
                  </div>
                </div>
                <div className="sd-fact">
                  <div className="sd-fact-icon" style={{ background: `${catConfig.color}15`, color: catConfig.color }}><Calendar size={18} /></div>
                  <div className="sd-fact-text">
                    <span className="sd-fact-label">Availability</span>
                    <span className="sd-fact-value">{availDays.length === 7 ? 'Every day' : `${availDays.length} days/week`}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Details & Availability ── */}
            <section className="sd-section sd-fade-up" ref={detailsRef}>
              <h2 className="sd-heading">Details & Availability</h2>

              {/* Category-specific fields */}
              {Object.keys(categoryFields).length > 0 && (
                <div className="sd-cat-fields">
                  <h3 className="sd-sub-heading" style={{ color: catConfig.color }}>
                    {catConfig.emoji} {catConfig.label} Specialties
                  </h3>
                  <div className="sd-cat-fields-grid">
                    {Object.entries(categoryFields).map(([key, val]) => {
                      if (!val || (Array.isArray(val) && val.length === 0)) return null;
                      const def = smartFieldDefs[key];
                      const label = def?.label || key.replace(/([A-Z])/g, ' $1').trim();
                      const display = Array.isArray(val) ? val.join(', ') : String(val);
                      return (
                        <div key={key} className="sd-cat-field">
                          <span className="sd-cat-field-label">{label}</span>
                          <span className="sd-cat-field-value">{display}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Availability */}
              <div className="sd-avail-section">
                <h3 className="sd-sub-heading">Schedule</h3>
                <div className="sd-day-strip">
                  {ALL_DAYS.map((day, i) => (
                    <div key={day} className={`sd-day-cell ${availDays.includes(day) ? 'sd-day-on' : ''}`}
                      style={availDays.includes(day) ? { borderColor: catConfig.color, background: `${catConfig.color}12` } : {}}>
                      <span className="sd-day-letter">{DAY_SHORT[i]}</span>
                      <span className="sd-day-name">{DAY_LABELS[i]}</span>
                      {availDays.includes(day)
                        ? <CheckCircle size={12} style={{ color: catConfig.color }} />
                        : <span className="sd-day-off">—</span>
                      }
                    </div>
                  ))}
                </div>
                {timeSlots.length > 0 && (
                  <div className="sd-time-slots">
                    <Clock size={14} className="sd-ts-icon" />
                    {timeSlots.map((slot, i) => (
                      <span key={i} className="sd-time-chip">
                        {formatTime(slot.start)} – {formatTime(slot.end)}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Requirements */}
              {(service.requirements?.materials || service.requirements?.space || service.requirements?.other) && (
                <div className="sd-reqs">
                  <h3 className="sd-sub-heading">Requirements</h3>
                  <div className="sd-reqs-list">
                    {service.requirements.materials && (
                      <div className="sd-req"><span className="sd-req-emoji">🧰</span><div><strong>Materials</strong><p>{service.requirements.materials}</p></div></div>
                    )}
                    {service.requirements.space && (
                      <div className="sd-req"><span className="sd-req-emoji">🏠</span><div><strong>Space</strong><p>{service.requirements.space}</p></div></div>
                    )}
                    {service.requirements.other && (
                      <div className="sd-req"><span className="sd-req-emoji">📋</span><div><strong>Other</strong><p>{service.requirements.other}</p></div></div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* ── Packages ── */}
            {packages.length > 0 && (
              <section className="sd-section sd-fade-up">
                <h2 className="sd-heading"><Package size={18} className="sd-heading-icon" /> Service Packages</h2>
                <div className="sd-packages">
                  {packages.map((pkg, i) => {
                    const isSelected = selectedPackage === i;
                    return (
                      <div key={i} className={`sd-pkg ${isSelected ? 'sd-pkg-selected' : ''}`}
                        style={{ '--pkg-accent': catConfig.color, borderColor: isSelected ? catConfig.color : undefined }}>
                        {i === 1 && packages.length >= 3 && <span className="sd-pkg-popular">Popular</span>}
                        {isSelected && <span className="sd-pkg-check"><CheckCircle size={16} /></span>}
                        <h4 className="sd-pkg-name">{pkg.name}</h4>
                        <div className="sd-pkg-price">₹{Number(pkg.price).toLocaleString('en-IN')}</div>
                        {pkg.duration && <span className="sd-pkg-dur"><Clock size={12} /> {pkg.duration} min</span>}
                        {pkg.description && <p className="sd-pkg-desc">{pkg.description}</p>}
                        {isSelected ? (
                          <div className="sd-pkg-actions">
                            <button className="sd-pkg-book" style={{ background: catConfig.color }}
                              onClick={() => setShowBookingModal(true)}>
                              Book This Package
                            </button>
                            <button className="sd-pkg-deselect" onClick={() => setSelectedPackage(null)}>
                              Deselect
                            </button>
                          </div>
                        ) : (
                          <button className="sd-pkg-book" style={{ background: catConfig.color }}
                            onClick={() => setSelectedPackage(i)}>
                            Select Package
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {selectedPackage !== null && (
                  <div className="sd-pkg-selected-banner" style={{ background: `${catConfig.color}10`, borderColor: `${catConfig.color}30` }}>
                    <CheckCircle size={14} style={{ color: catConfig.color }} />
                    <span><strong>{packages[selectedPackage].name}</strong> selected — ₹{Number(packages[selectedPackage].price).toLocaleString('en-IN')}</span>
                    <button onClick={() => setSelectedPackage(null)}>Clear</button>
                  </div>
                )}
              </section>
            )}

            {/* ── Add-Ons ── */}
            {enabledAddOns.length > 0 && (
              <section className="sd-section sd-fade-up">
                <h2 className="sd-heading"><Sparkles size={18} className="sd-heading-icon" /> Available Add-Ons</h2>
                <div className="sd-addons">
                  {enabledAddOns.map((a, i) => (
                    <div key={a.id || i} className="sd-addon">
                      <div className="sd-addon-info">
                        <span className="sd-addon-label">{a.label}</span>
                        {a.description && <span className="sd-addon-desc">{a.description}</span>}
                      </div>
                      <span className="sd-addon-price" style={{ color: a.price > 0 ? '#10B981' : '#6B7280' }}>
                        {a.price > 0 ? `+₹${a.price}` : 'Free'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── Provider ── */}
            {provider && (
              <section className="sd-section sd-fade-up" ref={providerRef}>
                <h2 className="sd-heading">About the Provider</h2>
                <div className="sd-provider">
                  <div className="sd-provider-header">
                    <div className="sd-provider-avatar" style={{ background: gradientFor(providerName) }}>
                      {provider.profileImage?.url
                        ? <img src={provider.profileImage.url} alt="" className="sd-provider-img" />
                        : getInitials(providerName)
                      }
                    </div>
                    <div className="sd-provider-info">
                      <h3 className="sd-provider-name">
                        {providerName}
                        <span className="sd-verified-badge" title="Verified"><CheckCircle size={14} /></span>
                      </h3>
                      {providerCity && <span className="sd-provider-loc"><MapPin size={12} /> {providerCity}{providerState ? `, ${providerState}` : ''}</span>}
                      {providerBadges.length > 0 && (
                        <div className="sd-provider-badges">
                          {providerBadges.map(b => (
                            <span key={b.id} className="sd-badge" title={b.description}>{b.icon} {b.name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {provider.bio && <p className="sd-provider-bio">{provider.bio}</p>}

                  <div className="sd-provider-stats">
                    <div className="sd-pstat">
                      <Star size={16} className="sd-star-filled" />
                      <div><strong>{providerRating > 0 ? providerRating.toFixed(1) : '—'}</strong><span>Rating</span></div>
                    </div>
                    <div className="sd-pstat">
                      <MessageCircle size={16} />
                      <div><strong>{providerReviewCount || 0}</strong><span>Reviews</span></div>
                    </div>
                    <div className="sd-pstat">
                      <Zap size={16} />
                      <div><strong>{service.totalBookings || 0}</strong><span>Bookings</span></div>
                    </div>
                    <div className="sd-pstat">
                      <Shield size={16} />
                      <div><strong>{provider.experience || '—'}</strong><span>Exp. (yrs)</span></div>
                    </div>
                  </div>

                  {/* Expandable full profile */}
                  <button className="sd-provider-expand" onClick={() => setProviderExpanded(v => !v)}
                    style={{ color: catConfig.color }}>
                    {providerExpanded ? <><ChevronUp size={14} /> Hide details</> : <><ChevronDown size={14} /> View full profile</>}
                  </button>

                  {providerExpanded && (
                    <div className="sd-provider-full">
                      {/* Working hours */}
                      {provider.workingHours?.length > 0 && (
                        <div className="sd-pf-block">
                          <h4 className="sd-pf-title"><Clock size={14} /> Working Hours</h4>
                          <div className="sd-pf-hours">
                            {provider.workingHours.filter(wh => wh.isAvailable !== false).map(wh => (
                              <div key={wh.day} className="sd-pf-hour-row">
                                <span className="sd-pf-day">{wh.day.charAt(0).toUpperCase() + wh.day.slice(1)}</span>
                                <span className="sd-pf-time">{formatTime(wh.start)} – {formatTime(wh.end)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact & response info */}
                      <div className="sd-pf-block">
                        <h4 className="sd-pf-title"><Info size={14} /> Quick Facts</h4>
                        <div className="sd-pf-facts">
                          {provider.avgResponseTime && (
                            <div className="sd-pf-fact">
                              <Zap size={13} />
                              <span>Responds in ~{provider.avgResponseTime < 60 ? `${provider.avgResponseTime} min` : `${Math.round(provider.avgResponseTime / 60)} hr`}</span>
                            </div>
                          )}
                          {provider.completedServices > 0 && (
                            <div className="sd-pf-fact">
                              <CheckCircle size={13} />
                              <span>{provider.completedServices} services completed</span>
                            </div>
                          )}
                          {provider.createdAt && (
                            <div className="sd-pf-fact">
                              <Calendar size={13} />
                              <span>Member since {new Date(provider.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
                            </div>
                          )}
                          {provider.isAvailable !== undefined && (
                            <div className="sd-pf-fact">
                              <span className={`sd-pf-avail-dot ${provider.isAvailable ? 'online' : ''}`} />
                              <span>{provider.isAvailable ? 'Currently available' : 'Currently busy'}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Other services by this provider */}
                      {providerServices.length > 0 && (
                        <div className="sd-pf-block">
                          <h4 className="sd-pf-title"><Package size={14} /> Other Services by {providerName.split(' ')[0]}</h4>
                          <div className="sd-pf-services">
                            {providerServices.slice(0, 4).map(ps => {
                              const psCat = CATEGORIES[ps.category] || CATEGORIES.other || {};
                              return (
                                <Link key={ps._id} to={`/customer/services/${ps._id}`} className="sd-pf-svc">
                                  <div className="sd-pf-svc-icon" style={{ background: `${psCat.color || '#6B7280'}15` }}>
                                    <span>{psCat.emoji || '🔧'}</span>
                                  </div>
                                  <div className="sd-pf-svc-info">
                                    <span className="sd-pf-svc-name">{ps.title}</span>
                                    <span className="sd-pf-svc-meta">
                                      {ps.rating?.average > 0 && <><Star size={10} className="sd-star-filled" /> {ps.rating.average.toFixed(1)} · </>}
                                      {formatPrice(ps.pricing)}
                                    </span>
                                  </div>
                                  <ChevronRight size={14} className="sd-pf-svc-arrow" />
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="sd-provider-actions">
                    {provider.phone && (
                      <a href={`tel:${provider.phone}`} className="sd-provider-call-btn"><Phone size={14} /> Call</a>
                    )}
                    <button className="sd-provider-msg-btn" onClick={() => {}}><MessageCircle size={14} /> Message</button>
                  </div>
                </div>
              </section>
            )}

            {/* ── Reviews ── */}
            <section className="sd-section sd-fade-up" ref={reviewsRef}>
              <h2 className="sd-heading">Customer Reviews</h2>

              {reviews.length > 0 ? (
                <>
                  <div className="sd-review-summary">
                    <div className="sd-review-big">
                      <span className="sd-big-num">{(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1)}</span>
                      <div className="sd-big-stars">
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star key={i} size={16} className={i < Math.round(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length) ? 'sd-star-filled' : 'sd-star-empty'} />
                        ))}
                      </div>
                      <span className="sd-big-count">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="sd-rating-bars">
                      {[5, 4, 3, 2, 1].map(n => (
                        <div key={n} className="sd-bar-row">
                          <span className="sd-bar-label">{n} <Star size={10} className="sd-star-filled" /></span>
                          <div className="sd-bar-track"><div className="sd-bar-fill" style={{ width: `${(ratingDist[n - 1] / maxDist) * 100}%`, background: catConfig.color }} /></div>
                          <span className="sd-bar-count">{ratingDist[n - 1]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sd-reviews-list">
                    {visibleReviews.map((review, idx) => (
                      <div key={review._id || idx} className="sd-review-card">
                        <div className="sd-review-top">
                          <div className="sd-review-avatar" style={{ background: gradientFor(review.customer?.name) }}>
                            {getInitials(review.customer?.name)}
                          </div>
                          <div className="sd-review-meta">
                            <span className="sd-review-name">{review.customer?.name || 'Anonymous'}</span>
                            <span className="sd-review-date">{relativeDate(review.createdAt)}</span>
                          </div>
                          <div className="sd-review-stars">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star key={i} size={13} className={i < Math.round(review.rating || 0) ? 'sd-star-filled' : 'sd-star-empty'} />
                            ))}
                          </div>
                        </div>
                        {review.comment && <p className="sd-review-text">{review.comment}</p>}
                        {review.helpfulCount > 0 && (
                          <div className="sd-review-helpful"><ThumbsUp size={12} /> {review.helpfulCount} found helpful</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {reviews.length > 3 && (
                    <button className="sd-read-more" onClick={() => setShowAllReviews(v => !v)}>
                      {showAllReviews ? <><ChevronUp size={14} /> Show fewer</> : <><ChevronDown size={14} /> See all {reviews.length} reviews</>}
                    </button>
                  )}
                </>
              ) : (
                <div className="sd-empty-reviews">
                  <Star size={36} strokeWidth={1} />
                  <h4>No reviews yet</h4>
                  <p>Be the first to book and leave a review</p>
                </div>
              )}
            </section>

            {/* ── Related Services ── */}
            {relatedServices.length > 0 && (
              <section className="sd-section sd-fade-up">
                <h2 className="sd-heading">You Might Also Like</h2>
                <div className="sd-related-grid">
                  {relatedServices.slice(0, 4).map(rs => {
                    const rsCat = CATEGORIES[rs.category] || CATEGORIES.other;
                    return (
                      <Link key={rs._id} to={`/customer/services/${rs._id}`} className="sd-related-card">
                        <div className="sd-related-cover" style={{
                          background: rs.images?.[0]?.url ? `url(${rs.images[0].url}) center/cover` : gradientFor(rs.title)
                        }}>
                          <span className="sd-related-emoji">{rsCat?.emoji || '🔧'}</span>
                        </div>
                        <div className="sd-related-body">
                          <h4>{rs.title}</h4>
                          <div className="sd-related-meta">
                            {rs.rating?.average > 0 && <span><Star size={11} className="sd-star-filled" /> {rs.rating.average.toFixed(1)}</span>}
                            <span className="sd-related-price">{formatPrice(rs.pricing)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* ═══ RIGHT STICKY PANEL ═══ */}
          <div className="sd-right">
            <div className="sd-sticky-panel">

              {/* Booking Card */}
              <div className="sd-booking-card" style={{ '--cat-color': catConfig.color }}>
                {selectedPackage !== null && packages[selectedPackage] ? (
                  <div className="sd-booking-pkg-tag" style={{ background: `${catConfig.color}15`, borderColor: `${catConfig.color}30` }}>
                    <Package size={12} style={{ color: catConfig.color }} />
                    <span style={{ color: catConfig.color }}>{packages[selectedPackage].name}</span>
                  </div>
                ) : null}
                <div className="sd-booking-price-row">
                  <span className="sd-booking-price">
                    {selectedPackage !== null && packages[selectedPackage]
                      ? `₹${Number(packages[selectedPackage].price).toLocaleString('en-IN')}`
                      : formatPrice(service.pricing)}
                  </span>
                  <span className="sd-booking-suffix">
                    {selectedPackage !== null ? '/package' : (priceSuffix(service.pricing) || '/service')}
                  </span>
                </div>

                {service.pricing?.amount && (
                  <button className="sd-price-toggle" onClick={() => setShowPriceBreakdown(v => !v)}>
                    {showPriceBreakdown ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Price details
                  </button>
                )}

                {showPriceBreakdown && service.pricing?.amount && (
                  <div className="sd-price-breakdown">
                    <div className="sd-pb-row"><span>Base price</span><span>₹{Number(service.pricing.amount).toLocaleString('en-IN')}</span></div>
                    <div className="sd-pb-row"><span>Platform fee</span><span>₹0</span></div>
                    <div className="sd-pb-row"><span>Taxes</span><span>Included</span></div>
                    <div className="sd-pb-row sd-pb-total"><span>Total</span><span>₹{Number(service.pricing.amount).toLocaleString('en-IN')}</span></div>
                  </div>
                )}

                <div className="sd-booking-divider" />

                {/* Mini availability */}
                {availDays.length > 0 && (
                  <div className="sd-booking-avail">
                    <div className="sd-mini-days">
                      {ALL_DAYS.map((day, i) => (
                        <span key={day} className={`sd-mini-day ${availDays.includes(day) ? 'active' : ''}`}
                          style={availDays.includes(day) ? { background: `${catConfig.color}25`, color: catConfig.color, borderColor: `${catConfig.color}40` } : {}}>
                          {DAY_SHORT[i]}
                        </span>
                      ))}
                    </div>
                    {timeSlots.length > 0 && (
                      <span className="sd-booking-time"><Clock size={12} /> {formatTime(timeSlots[0].start)} – {formatTime(timeSlots[0].end)}</span>
                    )}
                  </div>
                )}

                {/* CTA */}
                {provider?.isAvailable === false ? (
                  <button className="sd-book-cta sd-book-disabled" disabled>Provider Currently Busy</button>
                ) : (
                  <button className="sd-book-cta" style={{ background: `linear-gradient(135deg, ${catConfig.color}, ${catConfig.color}cc)` }}
                    onClick={() => setShowBookingModal(true)}>
                    Book Now
                  </button>
                )}

                <p className="sd-trust-line"><Lock size={11} /> Secure booking · Free cancellation</p>
              </div>

              {/* Trust signals */}
              <div className="sd-trust-cards">
                <div className="sd-trust"><Shield size={16} /><div><strong>Verified Provider</strong><span>Identity & background checked</span></div></div>
                <div className="sd-trust"><Zap size={16} /><div><strong>Quick Response</strong><span>Usually replies within 2 hours</span></div></div>
                <div className="sd-trust"><RotateCcw size={16} /><div><strong>Free Cancellation</strong><span>Cancel up to 2 hrs before</span></div></div>
              </div>

              {/* Contact */}
              {provider && (
                <div className="sd-contact">
                  <h4>Need help?</h4>
                  {provider.phone && <a href={`tel:${provider.phone}`} className="sd-contact-btn"><Phone size={14} /> Call Provider</a>}
                  <button className="sd-contact-btn sd-contact-msg"><MessageCircle size={14} /> Send Message</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════ MOBILE STICKY FOOTER ════════ */}
      <div className="sd-mobile-footer">
        <div className="sd-mobile-price">
          <span className="sd-mobile-amount">
            {selectedPackage !== null && packages[selectedPackage]
              ? `₹${Number(packages[selectedPackage].price).toLocaleString('en-IN')}`
              : formatPrice(service.pricing)}
          </span>
          <span className="sd-mobile-suffix">
            {selectedPackage !== null ? '/pkg' : priceSuffix(service.pricing)}
          </span>
        </div>
        <button className="sd-mobile-book" style={{ background: catConfig.color }} onClick={() => setShowBookingModal(true)}>
          Book Now
        </button>
      </div>

      {/* ════════ BOOKING MODAL ════════ */}
      {showBookingModal && (
        <BookingModal
          service={service}
          provider={provider}
          initialPackage={selectedPackage}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => { setShowBookingModal(false); navigate('/customer/bookings'); }}
        />
      )}
    </div>
  );
};

export default ServiceDetail;
