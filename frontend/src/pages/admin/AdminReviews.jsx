import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Eye, 
  Flag,
  Trash2,
  Star,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Send,
  TrendingUp,
  Shield,
  Tag
} from 'lucide-react';
import { adminAPIService } from '../../services/adminAPI';
import { toast } from 'react-hot-toast';
import AdminSkeleton from '../../components/admin/AdminSkeleton';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import AdminErrorBoundary from '../../components/admin/AdminErrorBoundary';
// AdminLayout wrapper removed - handled in App.jsx

const AdminReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReview, setSelectedReview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    flagged: 'all',
    page: 1,
    limit: 20
  });
  
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0
  });

  const [respondModal, setRespondModal] = useState({ show: false, reviewId: null, message: '' });
  const [trendsData, setTrendsData] = useState(null);
  const [showTrends, setShowTrends] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, reviewId: null });

  const flaggedOptions = [
    { value: 'all', label: 'All Reviews' },
    { value: 'false', label: 'Normal Reviews' },
    { value: 'true', label: 'Flagged Reviews' }
  ];

  useEffect(() => {
    fetchReviews();
  }, [filters]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await adminAPIService.getReviews(filters);
      if (response.success) {
        setReviews(response.data?.reviews || []);
        setPagination(response.data?.pagination || { current: 1, pages: 1, total: 0 });
        setStatistics(response.data?.statistics || {});
      } else {
        setError('Failed to fetch reviews');
      }
    } catch (err) {
      setError('Failed to fetch reviews');
      console.error('Fetch reviews error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const handleFlagReview = async (reviewId, flagged) => {
    try {
      const response = await adminAPIService.flagReview(reviewId, flagged);
      if (response.success) {
        // Update the review in the list
        setReviews(prev => prev.map(review =>
          review._id === reviewId
            ? { ...review, isFlagged: flagged, isReported: flagged }
            : review
        ));
        
        // Update selected review if it's the same one
        if (selectedReview && selectedReview._id === reviewId) {
          setSelectedReview(prev => ({ ...prev, isFlagged: flagged, isReported: flagged }));
        }
        
        // Refresh statistics
        fetchReviews();
      }
    } catch (err) {
      console.error('Flag review error:', err);
      setError('Failed to update review flag status');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      const response = await adminAPIService.deleteReview(reviewId);
      if (response.success) {
        toast.success('Review deleted');
        setReviews(prev => prev.filter(review => review._id !== reviewId));
        if (selectedReview && selectedReview._id === reviewId) {
          setShowModal(false);
          setSelectedReview(null);
        }
        fetchReviews();
      }
    } catch (err) {
      toast.error('Failed to delete review');
    } finally {
      setDeleteConfirm({ open: false, reviewId: null });
    }
  };

  const handleViewReview = (review) => {
    setSelectedReview(review);
    setShowModal(true);
  };

  const handleAutoFlag = async () => {
    try {
      const response = await adminAPIService.autoFlagReviews();
      if (response.success) {
        toast.success(response.message || `${response.data?.flaggedCount || 0} reviews flagged`);
        fetchReviews();
      }
    } catch (err) {
      toast.error('Auto-flag failed');
    }
  };

  const handleRespond = async () => {
    if (!respondModal.reviewId || !respondModal.message.trim()) return;
    try {
      const response = await adminAPIService.respondToReview(respondModal.reviewId, { message: respondModal.message });
      if (response.success) {
        toast.success('Response sent');
        setRespondModal({ show: false, reviewId: null, message: '' });
        fetchReviews();
      }
    } catch (err) {
      toast.error('Failed to respond');
    }
  };

  const fetchTrends = async () => {
    try {
      const response = await adminAPIService.getReviewTrends({ period: 30 });
      if (response.success) {
        setTrendsData(response.data);
        setShowTrends(true);
      }
    } catch (err) {
      toast.error('Failed to load trends');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const SENTIMENT_STYLES = {
    positive: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', label: '😊 Positive' },
    negative: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', label: '😞 Negative' },
    neutral: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20', label: '😐 Neutral' },
  };
  const ASPECT_STYLES = {
    quality: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
    punctuality: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
    communication: { bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    value: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
    cleanliness: { bg: 'bg-teal-500/10', text: 'text-teal-400' },
    professionalism: { bg: 'bg-indigo-500/10', text: 'text-indigo-400' },
  };

  const getSentimentFromTags = (tags) => {
    if (!tags?.length) return null;
    if (tags.includes('positive')) return 'positive';
    if (tags.includes('negative')) return 'negative';
    if (tags.includes('neutral')) return 'neutral';
    return null;
  };

  const getAspectsFromTags = (tags) => {
    if (!tags?.length) return [];
    return tags.filter(t => ['quality', 'punctuality', 'communication', 'value', 'cleanliness', 'professionalism'].includes(t));
  };

  const renderSentimentTags = (tags) => {
    const sentiment = getSentimentFromTags(tags);
    const aspects = getAspectsFromTags(tags);
    if (!sentiment && aspects.length === 0) return <span className="text-caption text-content-muted">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {sentiment && (
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${SENTIMENT_STYLES[sentiment].bg} ${SENTIMENT_STYLES[sentiment].text} ${SENTIMENT_STYLES[sentiment].border}`}>
            {SENTIMENT_STYLES[sentiment].label}
          </span>
        )}
        {aspects.map(a => (
          <span key={a} className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${(ASPECT_STYLES[a] || ASPECT_STYLES.quality).bg} ${(ASPECT_STYLES[a] || ASPECT_STYLES.quality).text}`}>
            {a}
          </span>
        ))}
      </div>
    );
  };

  const renderStars = (rating) => {
    const ratingValue = rating?.overall || rating || 0;
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i < ratingValue ? 'text-coral-400 fill-current' : 'text-surface-border'}`}
      />
    ));
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-display text-content-primary">Reviews & Feedback</h1>
            <p className="text-body text-content-muted mt-1">Monitor and moderate customer reviews</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleAutoFlag} className="btn btn-secondary btn-sm flex items-center gap-1"><Shield className="w-3.5 h-3.5" />Auto-Flag</button>
            <button onClick={fetchTrends} className="btn btn-secondary btn-sm flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />Trends</button>
            <span className="badge-warning"><Star className="w-3 h-3 mr-1 inline fill-current" />{statistics?.averageRating?.toFixed(1) || '0.0'} avg</span>
            <span className="badge-danger"><AlertTriangle className="w-3 h-3 mr-1 inline" />{statistics?.flaggedCount || 0} flagged</span>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-content-muted">Total Reviews</p>
                <p className="text-display text-content-primary">{statistics?.totalReviews || 0}</p>
              </div>
              <div className="p-2.5 bg-accent-blue-muted rounded-xl">
                <MessageSquare className="w-5 h-5 text-accent-blue-light" />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-content-muted">Average Rating</p>
                <p className="text-display text-content-primary">{statistics?.averageRating?.toFixed(1) || '0.0'}</p>
              </div>
              <div className="p-2.5 bg-warning-muted rounded-xl">
                <Star className="w-5 h-5 text-warning-text" />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-caption text-content-muted">Flagged Reviews</p>
                <p className="text-display text-content-primary">{statistics?.flaggedCount || 0}</p>
              </div>
              <div className="p-2.5 bg-danger-muted rounded-xl">
                <AlertTriangle className="w-5 h-5 text-danger-text" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card p-5">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-content-muted" />
                <input type="text" placeholder="Search reviews..." value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} className="input pl-10" />
              </div>
            </div>
            <div className="min-w-[150px]">
              <select value={filters.flagged} onChange={(e) => handleFilterChange('flagged', e.target.value)} className="select">
                {flaggedOptions.map(option => (<option key={option.value} value={option.value}>{option.label}</option>))}
              </select>
            </div>
          </div>
        </div>

        {error && (<div className="card p-4 border-danger"><span className="text-danger-text text-detail">{error}</span></div>)}

        {/* Reviews Table */}
        <div className="card p-0 overflow-hidden">
          {loading ? (
            <AdminSkeleton type="table" rows={5} cols={6} />
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 text-content-muted mx-auto mb-3" />
              <p className="text-content-muted text-detail">No reviews found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-raised">
                  <tr>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Review</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Customer</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Provider</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Service</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Date</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Sentiment</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-micro font-semibold text-content-muted uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {reviews.map((review) => (
                    <tr key={review._id} className="hover:bg-surface-hover transition-colors">
                      <td className="px-5 py-4">
                        <div className="max-w-xs">
                          <div className="flex items-center gap-0.5 mb-1">
                            {renderStars(review.rating)}
                            <span className="text-coral-400 text-caption ml-1">{review.rating?.overall || review.rating || 0}</span>
                          </div>
                          <p className="text-detail text-content-secondary line-clamp-2">{review.comment || 'No comment provided'}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-detail font-medium text-content-primary">{review.customer?.name || 'Anonymous'}</p>
                        <p className="text-caption text-content-muted">{review.customer?.email}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <p className="text-detail font-medium text-content-primary">{review.provider?.name}</p>
                        <p className="text-caption text-content-muted">{review.provider?.email}</p>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-detail text-content-primary">{review.service?.title || 'Service not found'}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-detail text-content-secondary">{formatDate(review.createdAt)}</td>
                      <td className="px-5 py-4">
                        {renderSentimentTags(review.tags)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {(review.isFlagged || review.isReported) ? (
                          <span className="badge-danger"><AlertTriangle className="w-3 h-3 mr-1 inline" />Flagged</span>
                        ) : (
                          <span className="badge-success"><CheckCircle className="w-3 h-3 mr-1 inline" />Normal</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleViewReview(review)} className="p-2 text-content-muted hover:text-accent-blue-light hover:bg-surface-hover rounded-lg transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => setRespondModal({ show: true, reviewId: review._id, message: '' })} className="p-2 text-content-muted hover:text-green-400 hover:bg-surface-hover rounded-lg transition-colors" title="Respond"><Send className="w-4 h-4" /></button>
                          <button onClick={() => handleFlagReview(review._id, !(review.isFlagged || review.isReported))} className={`p-2 rounded-lg transition-colors ${(review.isFlagged || review.isReported) ? 'text-success-text hover:bg-success-muted' : 'text-warning-text hover:bg-warning-muted'}`} title={(review.isFlagged || review.isReported) ? 'Unflag' : 'Flag'}><Flag className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteConfirm({ open: true, reviewId: review._id })} className="p-2 text-danger-text hover:bg-danger-muted rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-caption text-content-muted">
              Showing {((pagination.current - 1) * filters.limit) + 1} to {Math.min(pagination.current * filters.limit, pagination.total)} of {pagination.total} reviews
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => handleFilterChange('page', pagination.current - 1)} disabled={pagination.current === 1} className="btn btn-secondary btn-sm">Previous</button>
              <span className="text-caption text-content-muted">Page {pagination.current} of {pagination.pages}</span>
              <button onClick={() => handleFilterChange('page', pagination.current + 1)} disabled={pagination.current === pagination.pages} className="btn btn-secondary btn-sm">Next</button>
            </div>
          </div>
        )}

        {/* Review Details Modal */}
        {showModal && selectedReview && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <div className="relative card max-w-2xl w-full p-6 animate-scale-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-title text-content-primary">Review Details</h2>
                <button onClick={() => setShowModal(false)} className="text-content-muted hover:text-content-primary transition-colors">×</button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <h3 className="text-heading text-content-primary mb-2">Rating</h3>
                  <div className="flex items-center gap-2">
                    {renderStars(selectedReview.rating)}
                    <span className="text-coral-400 text-heading ml-1">{selectedReview.rating?.overall || selectedReview.rating || 0}/5</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-heading text-content-primary mb-2">Comment</h3>
                  <div className="bg-surface-raised rounded-xl p-4">
                    <p className="text-detail text-content-secondary">{selectedReview.comment || 'No comment provided'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-heading text-content-primary mb-2">Customer</h3>
                    <div className="bg-surface-raised rounded-xl p-4">
                      <p className="text-detail font-medium text-content-primary">{selectedReview.customer?.name || 'Anonymous'}</p>
                      <p className="text-caption text-content-muted">{selectedReview.customer?.email}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-heading text-content-primary mb-2">Provider</h3>
                    <div className="bg-surface-raised rounded-xl p-4">
                      <p className="text-detail font-medium text-content-primary">{selectedReview.provider?.name}</p>
                      <p className="text-caption text-content-muted">{selectedReview.provider?.email}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-heading text-content-primary mb-2">Service</h3>
                  <div className="bg-surface-raised rounded-xl p-4">
                    <p className="text-detail text-content-primary">{selectedReview.service?.title || 'Service not found'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-caption font-medium text-content-muted mb-1">Created</label>
                    <p className="text-detail text-content-primary">{formatDate(selectedReview.createdAt)}</p>
                  </div>
                  <div>
                    <label className="block text-caption font-medium text-content-muted mb-1">Status</label>
                    {(selectedReview.isFlagged || selectedReview.isReported) ? <span className="badge-danger">Flagged</span> : <span className="badge-success">Normal</span>}
                  </div>
                </div>
                {/* Sentiment & Aspect Tags */}
                {selectedReview.tags?.length > 0 && (
                  <div>
                    <h3 className="text-heading text-content-primary mb-2 flex items-center gap-1.5"><Tag className="w-4 h-4" /> Sentiment Analysis</h3>
                    <div className="bg-surface-raised rounded-xl p-4">
                      {renderSentimentTags(selectedReview.tags)}
                      {selectedReview.flagReason && (
                        <p className="text-caption text-content-muted mt-2 italic">Flag reason: {selectedReview.flagReason}</p>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 pt-4 border-t border-surface-border">
                  <button onClick={() => handleFlagReview(selectedReview._id, !(selectedReview.isFlagged || selectedReview.isReported))} className={`btn btn-sm ${(selectedReview.isFlagged || selectedReview.isReported) ? 'btn-success' : 'btn-primary'}`}>
                    {(selectedReview.isFlagged || selectedReview.isReported) ? 'Unflag Review' : 'Flag Review'}
                  </button>
                  <button onClick={() => handleDeleteReview(selectedReview._id)} className="btn btn-danger btn-sm">Delete Review</button>
                  <button onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">Close</button>
                </div>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Respond Modal */}
        {respondModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface-overlay border border-surface-border rounded-2xl p-6 max-w-md w-full mx-4">
              <h3 className="text-heading text-content-primary mb-4">Respond to Review</h3>
              <textarea value={respondModal.message} onChange={e => setRespondModal({...respondModal, message: e.target.value})} className="form-input w-full resize-y min-h-[100px]" placeholder="Type your response..." />
              <div className="flex gap-2 mt-4">
                <button onClick={handleRespond} disabled={!respondModal.message.trim()} className="btn btn-primary flex-1">Send</button>
                <button onClick={() => setRespondModal({ show: false, reviewId: null, message: '' })} className="btn btn-secondary flex-1">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Trends Modal */}
        {showTrends && trendsData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowTrends(false)}>
            <div className="bg-surface-overlay border border-surface-border rounded-2xl p-6 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
              <h3 className="text-heading text-content-primary mb-4">Review Trends (Last 30 Days)</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-surface-raised"><p className="text-xs text-content-muted">Total</p><p className="text-lg font-bold text-content-primary">{trendsData.totalReviews || 0}</p></div>
                  <div className="p-3 rounded-lg bg-surface-raised"><p className="text-xs text-content-muted">Avg Rating</p><p className="text-lg font-bold text-content-primary">{trendsData.averageRating?.toFixed(1) || '0.0'}</p></div>
                  <div className="p-3 rounded-lg bg-surface-raised"><p className="text-xs text-content-muted">Positive</p><p className="text-lg font-bold text-green-400">{trendsData.positiveCount || 0}</p></div>
                  <div className="p-3 rounded-lg bg-surface-raised"><p className="text-xs text-content-muted">Negative</p><p className="text-lg font-bold text-red-400">{trendsData.negativeCount || 0}</p></div>
                </div>
                {trendsData.ratingDistribution && (
                  <div>
                    <p className="text-xs text-content-muted mb-2">Rating Distribution</p>
                    {[5,4,3,2,1].map(star => (
                      <div key={star} className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-content-muted w-4">{star}★</span>
                        <div className="flex-1 bg-surface-raised rounded-full h-2"><div className="bg-coral-400 h-2 rounded-full" style={{ width: `${((trendsData.ratingDistribution[star] || 0) / Math.max(trendsData.totalReviews, 1)) * 100}%` }} /></div>
                        <span className="text-xs text-content-muted w-6">{trendsData.ratingDistribution[star] || 0}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setShowTrends(false)} className="btn btn-secondary w-full mt-4">Close</button>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={deleteConfirm.open}
          title="Delete Review"
          message="This review will be permanently deleted. This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => handleDeleteReview(deleteConfirm.reviewId)}
          onCancel={() => setDeleteConfirm({ open: false, reviewId: null })}
        />
      </div>
    );
};

export default AdminReviews;
