import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Star, MapPin, Phone, Mail, Share2, ChevronRight, Heart,
  ExternalLink, MessageCircle, Calendar, Award
} from 'lucide-react';
import { customerAPI } from '../../services/api';
import BadgeStrip from '../../components/shared/BadgeStrip';
import './CustomerProviderProfile.css';

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

const CustomerProviderProfile = () => {
  const { id: providerId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState(null);
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    loadProviderDetails();
  }, [providerId]);

  const loadProviderDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await customerAPI.getProviderDetails(providerId);
      
      // Try both possible response structures
      const data = res?.data?.data || res?.data;
      
      if (data && data.provider) {
        setProvider(data.provider);
        setServices(data.services || []);
        setReviews(data.reviews || []);
      } else {
        setError('No data returned from server');
      }
    } catch (e) {
      console.error('Error loading provider details:', e);
      setError(e?.response?.data?.message || 'Failed to load provider details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="cpp-loading">
        <div className="cpp-spinner" />
        <span>Loading provider details…</span>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="cpp-error">
        <div className="cpp-error-icon">!</div>
        <h2 className="cpp-error-title">Unable to load provider</h2>
        <p className="cpp-error-message">{error || 'Provider not found'}</p>
        <button
          className="cpp-btn cpp-btn-primary"
          onClick={() => navigate('/customer/saved-providers')}
        >
          Back to Saved Providers
        </button>
      </div>
    );
  }

  const avgRating = provider.rating?.average || 0;
  const reviewCount = provider.rating?.count || 0;

  return (
    <div className="cpp-page">
      {/* Hero Section */}
      <div className="cpp-hero">
        <div className="cpp-hero-background" />
        <div className="cpp-hero-content">
          <button className="cpp-back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="cpp-hero-card">
            {provider.profileImage ? (
              <img
                src={provider.profileImage && provider.profileImage.trim() ? provider.profileImage : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face'}
                alt={provider.name}
                className="cpp-avatar-img"
                onError={(e) => {
                  if (e.target.src !== 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face') {
                    e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face';
                  }
                }}
              />
            ) : (
              <div className="cpp-avatar" style={{ background: getGrad(provider.name) }}>
                {getInitials(provider.name)}
              </div>
            )}
            <div className="cpp-hero-info">
              <div className="cpp-name-row">
                <h1 className="cpp-name">{provider.name || 'Provider'}</h1>
                {provider.isVerified && (
                  <span className="cpp-verified-badge" title="Verified provider">
                    <Award style={{ width: 16, height: 16 }} /> Verified
                  </span>
                )}
              </div>
              {avgRating > 0 && (
                <div className="cpp-rating">
                  <div className="cpp-rating-stars">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        style={{
                          width: 16,
                          height: 16,
                          fill: i < Math.round(avgRating) ? '#FBBF24' : '#E5E7EB',
                          color: i < Math.round(avgRating) ? '#FBBF24' : '#E5E7EB'
                        }}
                      />
                    ))}
                  </div>
                  <span className="cpp-rating-num">{avgRating.toFixed(1)}</span>
                  <span className="cpp-rating-count">({reviewCount} reviews)</span>
                </div>
              )}
              {provider.address?.city && (
                <div className="cpp-location">
                  <MapPin style={{ width: 14, height: 14 }} />
                  {provider.address.city}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="cpp-container">
        {/* Bio Section */}
        {provider.bio && (
          <section className="cpp-section">
            <h2 className="cpp-section-title">About</h2>
            <p className="cpp-bio">{provider.bio}</p>
          </section>
        )}

        {/* Badges Section */}
        {provider.earnedBadges?.length > 0 && (
          <section className="cpp-section">
            <h2 className="cpp-section-title">Achievements</h2>
            <div className="cpp-badges">
              <BadgeStrip badges={provider.earnedBadges.map((b) => b.code || b)} max={8} />
            </div>
          </section>
        )}

        {/* Contact Actions */}
        <div className="cpp-contact-actions">
          {provider.phone && (
            <a href={`tel:${provider.phone}`} className="cpp-btn cpp-btn-ghost">
              <Phone style={{ width: 16, height: 16 }} /> Call
            </a>
          )}
          {provider.email && (
            <a href={`mailto:${provider.email}`} className="cpp-btn cpp-btn-ghost">
              <Mail style={{ width: 16, height: 16 }} /> Email
            </a>
          )}
          <button className="cpp-btn cpp-btn-ghost">
            <MessageCircle style={{ width: 16, height: 16 }} /> Chat
          </button>
          <button className="cpp-btn cpp-btn-ghost">
            <Share2 style={{ width: 16, height: 16 }} /> Share
          </button>
        </div>

        {/* Services Section */}
        {services.length > 0 ? (
          <section className="cpp-section">
            <div className="cpp-section-header">
              <h2 className="cpp-section-title">Services ({services.length})</h2>
            </div>
            <div className="cpp-services-grid">
              {services.map((service) => {
                const srvRating = service.rating?.average || 0;
                const srvReviews = service.rating?.count || 0;
                return (
                  <Link
                    key={service._id}
                    to={`/customer/services/${service._id}`}
                    className="cpp-service-card"
                  >
                    {service.images?.[0] ? (
                      <div className="cpp-service-image">
                        <img
                          src={service.images[0]}
                          alt={service.title}
                          onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop';
                          }}
                        />
                        {service.featured && <span className="cpp-featured-badge">Featured</span>}
                      </div>
                    ) : (
                      <div className="cpp-service-placeholder">
                        <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=300&h=200&fit=crop" alt={service.title} />
                        {service.featured && <span className="cpp-featured-badge">Featured</span>}
                      </div>
                    )}
                    <div className="cpp-service-content">
                      <h3 className="cpp-service-title">{service.title}</h3>
                      <p className="cpp-service-category">{service.category}</p>
                      {service.pricing && (
                        <div className="cpp-service-price">
                          ₹{service.pricing.min}-₹{service.pricing.max}
                        </div>
                      )}
                      {srvRating > 0 && (
                        <div className="cpp-service-rating">
                          <Star
                            style={{
                              width: 13,
                              height: 13,
                              fill: '#FBBF24',
                              color: '#FBBF24'
                            }}
                          />
                          <span>{srvRating.toFixed(1)}</span>
                          <span className="cpp-service-review-count">({srvReviews})</span>
                        </div>
                      )}
                      <div className="cpp-service-arrow">
                        <ChevronRight style={{ width: 14, height: 14 }} />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="cpp-section cpp-empty">
            <p>No active services available from this provider.</p>
          </section>
        )}

        {/* Reviews Section */}
        {reviews.length > 0 ? (
          <section className="cpp-section">
            <div className="cpp-section-header">
              <h2 className="cpp-section-title">Recent Reviews ({reviewCount})</h2>
            </div>
            <div className="cpp-reviews">
              {reviews.map((review, idx) => (
                <div key={idx} className="cpp-review-card">
                  <div className="cpp-review-header">
                    <div className="cpp-review-author">
                      {review.customer?.profileImage ? (
                        <img
                          src={review.customer.profileImage && review.customer.profileImage.trim() ? review.customer.profileImage : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face'}
                          alt={review.customer?.name}
                          className="cpp-review-avatar"
                          onError={(e) => {
                            if (e.target.src !== 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face') {
                              e.target.src = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face';
                            }
                          }}
                        />
                      ) : (
                        <div className="cpp-review-avatar-init" style={{ background: getGrad(review.customer?.name) }}>
                          {getInitials(review.customer?.name)}
                        </div>
                      )}
                      <div className="cpp-review-info">
                        <h4 className="cpp-review-name">{review.customer?.name || 'Anonymous'}</h4>
                        <span className="cpp-review-date">
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'Recently'}
                        </span>
                      </div>
                    </div>
                    <div className="cpp-review-rating">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          style={{
                            width: 14,
                            height: 14,
                            fill: i < review.rating ? '#FBBF24' : '#E5E7EB',
                            color: i < review.rating ? '#FBBF24' : '#E5E7EB'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && <p className="cpp-review-text">{review.comment}</p>}
                  {review.pros?.length > 0 && (
                    <div className="cpp-review-meta">
                      <span className="cpp-review-pro">✓ {review.pros.join(', ')}</span>
                    </div>
                  )}
                  {review.cons?.length > 0 && (
                    <div className="cpp-review-meta">
                      <span className="cpp-review-con">✗ {review.cons.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="cpp-section cpp-empty">
            <p>No reviews yet. Be the first to review this provider!</p>
          </section>
        )}

        {/* Book Service CTA */}
        {services.length > 0 && (
          <section className="cpp-section cpp-cta-section">
            <Link to={`/customer/services?provider=${providerId}`} className="cpp-btn cpp-btn-primary cpp-btn-large">
              <Calendar style={{ width: 18, height: 18 }} /> Browse All Services
            </Link>
          </section>
        )}
      </div>
    </div>
  );
};

export default CustomerProviderProfile;
